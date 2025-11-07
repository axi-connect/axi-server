import pkg from 'whatsapp-web.js';
import { type Message } from 'whatsapp-web.js';
import { ChannelProvider, ContactType, MessageDirection } from '@prisma/client';
import { MessageInput } from '@/modules/conversations/domain/entities/message.js';
import { AuthSessionService } from '../../application/services/auth-session.service.js';
import { BaseProvider, ProviderConfig, ProviderResponse, WebhookMessage } from './BaseProvider.js';

const { Client, LocalAuth } = pkg;

export class WhatsappProvider extends BaseProvider {
  private authenticated: boolean = false;
  private client: InstanceType<typeof Client> | null = null;
  private messageTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    config: ProviderConfig, 
    private readonly channelId: string,
    private readonly authSessionService: AuthSessionService
  ) {
    super(config, ChannelProvider.CUSTOM);
    this.ensureClient();
  }

  /**
   * Inicializa el cliente de WhatsApp
   * @returns true si el cliente se inicializó correctamente, false en caso de error
  */
  async initialize(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.initialize();
      return true;
    } catch (error: any) {
      console.error(`❌ Error inicializando cliente para canal ${this.channelId}:`, error);
      if (error.message && error.message.includes('EBUSY')) {
        console.log(`🔧 Error EBUSY detectado, limpiando sesión para canal ${this.channelId}`);
        this.handleSessionCleanup();
      }
      return false;
    }
  }

  /**
   * Instancia el cliente de WhatsApp si no está listo
   * Garantiza que solo se inicialice una vez por instancia
  */
  private async ensureClient(): Promise<void> {
    // Si el cliente ya está listo, no hacer nada
    if (this.client?.info?.wid?.user) return;

    // Crear cliente si no existe
    if (!this.client) {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.channelId,
        }),
        puppeteer: {
          executablePath: this.config.executablePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        },
      });
      this.setupEventHandlers();
    }
  }

  /**
   * Setup event handlers for incoming messages
  */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Manejar desconexión del dispositivo con manejo robusto de errores
    this.client.on('disconnected', async (reason: string) => {
      try {
        console.log(`WhatsApp disconnected for channel ${this.channelId}:`, reason);
        await this.destroy();

        this.config.emitEventCallback({
          event: 'channel.disconnected',
          channelId: this.channelId,
          companyId: this.config.company_id,
          data: { reason },
          timestamp: new Date()
        });
 
        await this.handleSessionCleanup();

      } catch (error: any) {
        console.error(`❌ Error crítico en evento 'disconnected' para canal ${this.channelId}:`, error);

        // Asegurar limpieza mínima del estado incluso en caso de error total
        this.client = null;
        this.authenticated = false;

        this.config.emitEventCallback({
          event: 'channel.disconnected',
          channelId: this.channelId,
          companyId: this.config.company_id,
          data: { reason: error.message },
          timestamp: new Date()
        });
      }
    });

    // Manejar errores críticos
    this.client.on('auth_failure', async (msg: string) => {
      console.error(`WhatsApp auth failure for channel ${this.channelId}:`, msg);
      this.authenticated = false;

      this.config.emitEventCallback({
        event: 'channel.disconnected',
        channelId: this.channelId,
        companyId: this.config.company_id,
        data: { reason: msg },
        timestamp: new Date()
      });
    });

    // Manejar mensajes entrantes
    this.client.on('message', async (message: Message) => {
      try {
        // Filter out status messages and group messages
        if (message.isStatus || message.from.includes('@g.us')) return

        const contact = await message.getContact();
        const contactId = contact.id._serialized;
        const profilePicUrl = await contact.getProfilePicUrl();

        // Handle message processing with debouncing
        const timerKey = contactId;
        if (this.messageTimers.has(timerKey)) clearTimeout(this.messageTimers.get(timerKey)!);

        const timer = setTimeout(async () => {
          this.messageTimers.delete(timerKey);
          // Process the message through the configured message handler
          if (!this.messageHandler) return;
          await this.messageHandler({
            contact: {
              meta: {},
              id: contactId,
              number: contact.number,
              type: ContactType.prospect,
              profile_pic_url: profilePicUrl,
              company_id: this.config.company_id,
              name: contact.name || contact.pushname || contact.verifiedName || 'Unknown',
            },
            message: {
              metadata: {},
              to: message.to,
              from: message.from,
              conversation_id: '',
              message: message.body,
              channel_id: this.channelId,
              content_type: message.type,
              provider_message_id: message.id.id,
              direction: message.fromMe ? MessageDirection.outgoing : MessageDirection.incoming
            },
          });
        }, 1000); // 1 second debounce

        this.messageTimers.set(timerKey, timer);
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
      }
    });

    // Manejar mensajes salientes desde el dispositivo
    this.client.on('message_create', async (message: Message) => {
      try {
        if (message.fromMe && this.messageHandler){
          await this.messageHandler({
            contact: {
              name: '',
              meta: {},
              id: message.to,
              number: message.to,
              profile_pic_url: '',
              type: ContactType.prospect,
              company_id: this.config.company_id,
            },
            message: {
              metadata: {},
              to: message.to,
              from: message.from,
              conversation_id: '',
              message: message.body,
              channel_id: this.channelId,
              content_type: message.type,
              provider_message_id: message.id.id,
              direction: MessageDirection.outgoing
            },
          });
        }
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
      }
    });

    this.client.on('ready', async () => {
      console.log(`🚀 WhatsApp listo para canal ${this.channelId}`);
      await this.handlerAuthenticated('ready');
    });

    process.on('unhandledRejection', (error: any) => {
      if (error.message.includes('Protocol error') && error.message.includes('Session closed')) {
        console.warn('Suppressed Puppeteer error:', error.message);
        return;
      }
      // throw error;
    });
  }

  async sendMessage(payload: MessageInput): Promise<ProviderResponse> {
    try {
      await this.ensureClient();

      if (!this.client || !this.authenticated || !this.client.info?.wid?.user) {
        return {
          success: false,
          error: 'WhatsApp client not authenticated or disconnected'
        };
      }

      const message = await this.client.sendMessage(payload.to, payload.message);

      return {
        success: true,
        messageId: message.id.id,
        externalId: message.id.id
      };
    } catch (error: any) {
      console.error('Error in sendMessage:', error);

      // Si hay error de sesión corrupta (EBUSY), intentar limpiar
      if (error.message && error.message.includes('EBUSY')) {
        console.log(`🔧 Detectado error EBUSY para canal ${this.channelId}, limpiando sesión...`);
        try {
          await this.handleSessionCleanup();
        } catch (cleanupError) {
          console.error('Error during session cleanup:', cleanupError);
        }
      }

      // Si es error de sesión, marcar como no autenticado
      if (error.message && error.message.includes('session')) {
        this.authenticated = false;
      }

      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      return !!(this.client?.info?.wid?.user);
    } catch {
      return false;
    }
  }

  parseWebhook(data: any): WebhookMessage | null {
    // WhatsApp Web doesn't use traditional webhooks
    // Messages are received through the client events
    return null;
  }

  getProviderName(): string {
    return 'WhatsApp Web';
  }

  /**
   * Genera código QR para autenticación de WhatsApp Web
   */
  async generateQR(): Promise<string> {
    try {
      // Si ya está autenticado, no generar QR
      if (this.authenticated && this.client?.info?.wid?.user) {
        console.log(`✅ Canal ${this.channelId} ya está autenticado`);
        return '';
      }

      console.log(`🔄 Forzando reinicialización para canal ${this.channelId}`);
      // Forzar destrucción del cliente
      await this.destroy();

      // Asegurarse de que el cliente esté inicializado
      await this.ensureClient();

      // Generar QR con timeout
      return new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('QR generation timeout'));
          }
        }, 30000);

        // Eventos de una sola vez
        const cleanup = () => {
          clearTimeout(timeout);
          resolved = true;
        };

        this.client!.once('qr', (qr: string) => {
          console.log(`📱 QR generado para canal ${this.channelId}`);
          cleanup();
          resolve(qr);
        });

        this.client!.once('authenticated', async () => {
          console.log(`✅ WhatsApp autenticado para canal ${this.channelId}`);
          await this.handlerAuthenticated('authenticated');
          cleanup();
          resolve('');
        });

        this.client!.once('ready', () => {
          console.log(`🚀 WhatsApp listo para canal ${this.channelId}`);
          this.authenticated = true;
          cleanup();
          resolve('');
        });

        this.client!.once('auth_failure', (error) => {
          console.error(`❌ Fallo de autenticación para canal ${this.channelId}:`, error);
          this.authenticated = false;
          cleanup();
          reject(error);
        });

        // Inicializar con manejo de errores EBUSY
        this.initialize();
      });
    } catch (error: any) {
      console.error(`Error en generateQR para canal ${this.channelId}:`, error);
      throw error;
    }
  }

  private async handlerAuthenticated(reason: string): Promise<void> {
    this.authenticated = true;
    this.config.emitEventCallback({
      data: { reason },
      timestamp: new Date(),
      channelId: this.channelId,
      event: 'channel.authenticated',
      companyId: this.config.company_id,
    });
    await this.authSessionService.completeSession(this.channelId, { reason });
  }

  /**
   * Obtiene información del cliente
   */
  async getClientInfo(): Promise<any> {
    return this.client?.info;
  }

  /**
   * Verifica si el cliente está listo
   */
  async isReady(): Promise<boolean> {
    return !!(this.client?.info?.wid?.user);
  }

  /**
   * Verifica si el cliente está autenticado
  */
  async isAuthenticated(): Promise<boolean> {
    return this.authenticated;
  }

  /**
   * Destruye el cliente y limpia recursos
   */
  async destroy(): Promise<void> {
    // Intentar destruir el cliente actual
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error: any) {
        // Si es error EBUSY, es esperado - continuar con la limpieza
        if (error.message && error.message.includes('EBUSY')) {
          console.log(`⚠️ Archivo de bloqueo ocupado para canal ${this.channelId}, continuando...`);
        } else {
          console.error(`Error destruyendo cliente para canal ${this.channelId}:`, error);
        }
      }
    }

    // Limpiar estado
    this.client = null;
    this.authenticated = false;

    // Limpiar timers
    for (const timer of this.messageTimers.values()) clearTimeout(timer);
    this.messageTimers.clear();
  }

  /**
   * Maneja la limpieza de sesiones corruptas
   */
  private async handleSessionCleanup(): Promise<void> {
    console.log(`🧹 Iniciando limpieza de sesión corrupta: ${this.channelId}`);

    try {
      // Limpiar sesión serializada de Redis
      try {
        await this.authSessionService.deleteSession(this.channelId);
      } catch (error) {
        console.error(`Error eliminando sesión serializada para canal ${this.channelId}:`, error);
      }

      console.log(`✅ Limpieza de sesión completada para canal ${this.channelId}`);
    } catch (error) {
      console.error(`Error durante limpieza de sesión para canal ${this.channelId}:`, error);
      throw error;
    }
  }
}
