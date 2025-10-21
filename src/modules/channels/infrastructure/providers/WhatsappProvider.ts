import pkg from 'whatsapp-web.js';
import { ChannelProvider } from '@prisma/client';
import { AuthSessionService } from '../../application/services/auth-session.service.js';
import { BaseProvider, ProviderConfig, MessagePayload, ProviderResponse, WebhookMessage } from './BaseProvider.js';

const { Client, LocalAuth } = pkg;

export class WhatsappProvider extends BaseProvider {
  private readonly channelId: string;
  private authenticated: boolean = false;
  private authSessionService: AuthSessionService;
  private client: InstanceType<typeof Client> | null = null;
  private messageTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ProviderConfig, channelId: string, authSessionService: AuthSessionService) {
    super(config, ChannelProvider.CUSTOM);
    this.channelId = channelId;
    this.authSessionService = authSessionService;

    // Configurar manejadores de eventos críticos
    this.setupCriticalEventHandlers();
  }

  /**
   * Inicializa el cliente de WhatsApp si no está listo
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
   * Reinicia completamente el cliente de WhatsApp
   */
  async reinitialize(): Promise<void> {
    console.log(`Forcing reinitialization of WhatsApp client for channel ${this.channelId}`);

    // Destruir cliente existente
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error(`Error destroying client for channel ${this.channelId}:`, error);
      }
    }

    // Resetear estado
    this.client = null;

    // Limpiar timers
    for (const timer of this.messageTimers.values()) {
      clearTimeout(timer);
    }
    this.messageTimers.clear();
  }

  async sendMessage(payload: MessagePayload): Promise<ProviderResponse> {
    try {
      await this.ensureClient();

      if (!this.client || !this.authenticated) {
        return {
          success: false,
          error: 'WhatsApp client not authenticated or disconnected'
        };
      }

      // Verificar si el cliente está realmente conectado
      if (!this.client.info?.wid?.user) {
        // Intentar reconectar si es posible
        try {
          await this.client.initialize();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar inicialización

          if (!this.client.info?.wid?.user) {
            return {
              success: false,
              error: 'WhatsApp client disconnected from device'
            };
          }
        } catch (reconnectError) {
          return {
            success: false,
            error: 'Failed to reconnect WhatsApp client'
          };
        }
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
  async generateQR(forceReinit: boolean = false): Promise<string> {
    try {
      // Si hay sesión corrupta detectada, limpiarla primero
      if (forceReinit) {
        console.log(`🔄 Forzando reinicialización para canal ${this.channelId}`);
        await this.handleSessionCleanup();
      }

      // Si ya está autenticado, no generar QR
      if (this.authenticated && this.client?.info?.wid?.user) {
        console.log(`✅ Canal ${this.channelId} ya está autenticado`);
        return '';
      }

      // Intentar restaurar sesión existente si no está forzando reinicialización
      if (!forceReinit) {
        try {
          const hasSession = await this.authSessionService.restoreSession(this.channelId);
          if (hasSession && this.client?.info?.wid?.user) {
            console.log(`🔄 Sesión restaurada exitosamente para canal ${this.channelId}`);
            this.authenticated = true;
            return '';
          }
        } catch (error) {
          console.log(`⚠️ Error restaurando sesión para canal ${this.channelId}, continuando con QR...`);
        }
      }

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

      this.client!.once('authenticated', () => {
        console.log(`✅ WhatsApp autenticado para canal ${this.channelId}`);
        this.authenticated = true;
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
      this.client!.initialize().catch(async (error: any) => {
        console.error(`❌ Error inicializando cliente para canal ${this.channelId}:`, error);

        // Si es error EBUSY, intentar limpiar la sesión
        if (error.message && error.message.includes('EBUSY')) {
          console.log(`🔧 Error EBUSY detectado, limpiando sesión para canal ${this.channelId}`);
          try {
            await this.handleSessionCleanup();
            cleanup();
            reject(new Error('Session corrupted, please try again'));
          } catch (cleanupError) {
            console.error('Error during session cleanup:', cleanupError);
            cleanup();
            reject(error); // Rechazar con el error original
          }
        } else {
          cleanup();
          reject(error);
        }
      });
    });

    } catch (error: any) {
      console.error(`Error en generateQR para canal ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Configura manejadores de eventos críticos para errores del sistema
   */
  private setupCriticalEventHandlers(): void {
    // No hay cliente aún, se configurará cuando se cree
  }

  /**
   * Setup event handlers for incoming messages
  */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Manejar desconexión del dispositivo
    this.client.on('disconnected', async (reason: string) => {
      console.log(`WhatsApp disconnected for channel ${this.channelId}:`, reason);
      this.authenticated = false;

      // Emitir evento de desconexión
      await this.emitMessage({
        type: 'system',
        event: 'disconnected',
        reason,
        timestamp: new Date()
      });

      // Intentar limpiar la sesión corrupta
      try {
        await this.handleSessionCleanup();
      } catch (error) {
        console.error(`Error cleaning session for channel ${this.channelId}:`, error);
      }
    });

    // Manejar errores críticos
    this.client.on('auth_failure', async (msg: string) => {
      console.error(`WhatsApp auth failure for channel ${this.channelId}:`, msg);
      this.authenticated = false;

      await this.emitMessage({
        type: 'system',
        event: 'auth_failure',
        message: msg,
        timestamp: new Date()
      });
    });

    this.client.on('message', async (message: any) => {
      try {
        // Filter out status messages and group messages
        if (message.isStatus || message.from.includes('@g.us')) return

        const contact = await message.getContact();
        const contactId = contact.id._serialized;
        const contactInfo = {
          id: contactId,
          name: contact.name || contact.pushname || 'Unknown',
          number: contact.number,
          company_id: this.config.company_id
        };

        // Handle message processing with debouncing
        const timerKey = contactId;
        if (this.messageTimers.has(timerKey)) {
          clearTimeout(this.messageTimers.get(timerKey)!);
        }

        const timer = setTimeout(async () => {
        this.messageTimers.delete(timerKey);

        // Process the message through the configured message handler
        if (this.config.onMessage) {
          await this.config.onMessage({
          contact: contactInfo,
          message: message.body,
          current_message: message,
          channelId: this.channelId
          });
        }
        }, 1000); // 1 second debounce

        this.messageTimers.set(timerKey, timer);
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
      }
    });
  }

  /**
   * Send message through callback (for compatibility with existing system)
   */
  setMessageCallback(callback: (contactId: string, message: string) => void): void {
    this.config.sendMessageCallback = callback;
  }

  /**
   * Set message handler for incoming messages
   */
  setMessageHandler(handler: (data: any) => Promise<void>): void {
    this.config.onMessage = handler;
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
    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (error) {
      console.error(`Error destroying client for channel ${this.channelId}:`, error);
    }

    // Limpiar estado
    this.client = null;

    // Limpiar timers
    for (const timer of this.messageTimers.values()) {
      clearTimeout(timer);
    }
    this.messageTimers.clear();
  }

  /**
   * Maneja la limpieza de sesiones corruptas
   */
  private async handleSessionCleanup(): Promise<void> {
    console.log(`🧹 Iniciando limpieza de sesión corrupta para canal ${this.channelId}`);

    try {
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

      // Limpiar estado del provider
      this.client = null;
      this.authenticated = false;

      // Limpiar timers
      for (const timer of this.messageTimers.values()) {
        clearTimeout(timer);
      }
      this.messageTimers.clear();

      // Limpiar sesión serializada de Redis
      try {
        await this.authSessionService.deleteSerializedSession(this.channelId);
        console.log(`🗑️ Sesión serializada eliminada para canal ${this.channelId}`);
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
