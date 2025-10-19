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

      if (!this.client || this.client.info?.wid?.user === undefined) {
        return {
          success: false,
          error: 'WhatsApp client not authenticated'
        };
      }

      const message = await this.client.sendMessage(payload.to, payload.message);

      return {
        success: true,
        messageId: message.id.id,
        externalId: message.id.id
      };
    } catch (error: any) {
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
    // Reinicializar si se solicita (sesión expirada)
    if (forceReinit) await this.reinitialize();

    // Si ya está autenticado, no generar QR
    if (this.client?.info?.wid?.user) return '';

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
        console.log('qr');
        cleanup();
        resolve(qr);
      });

      this.client!.once('authenticated', () => {
        console.log('authenticated');
        this.authenticated = true;
        cleanup();
        resolve('');
      });

      this.client!.once('ready', () => {
        console.log('ready');
        this.authenticated = true;
        cleanup();
        resolve('');
      });

      this.client!.once('auth_failure', (error) => {
        console.log('auth_failure');
        cleanup();
        reject(error);
      });

      this.client!.initialize().catch((error) => {
        console.log('initialize');
        cleanup();
        reject(error);
      });
    });
  }

  /**
   * Setup event handlers for incoming messages
  */
  private setupEventHandlers(): void {
    if (!this.client) return;

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
}
