import pkg from 'whatsapp-web.js';
import { ChannelProvider } from '@prisma/client';
import { AuthSessionService } from '../../application/services/auth-session.service.js';
import { BaseProvider, ProviderConfig, MessagePayload, ProviderResponse, WebhookMessage } from './BaseProvider.js';

const { Client, LocalAuth } = pkg;

export class WhatsappProvider extends BaseProvider {
    private isInitialized = false;
    private readonly channelId: string;
    private authSessionService: AuthSessionService;
    private client: InstanceType<typeof Client> | null = null;
    private messageTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(config: ProviderConfig, channelId: string, authSessionService: AuthSessionService) {
        super(config, ChannelProvider.CUSTOM);
        this.channelId = channelId;
        this.authSessionService = authSessionService;
    }

    /**
     * Initialize the WhatsApp client if not already initialized
    */
    private async ensureClient(): Promise<void> {
        if (this.client && this.isInitialized) return;

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: this.channelId,
                // dataPath can be configured via config
            }),
            puppeteer: {
                executablePath: this.config.executablePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            },
        });

        if (this.client) this.setupEventHandlers();
        this.isInitialized = true;
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
      await this.ensureClient();
      // For WhatsApp Web, we consider it valid if we have a session
      // The actual validation happens during QR authentication
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
     * Generate QR code for WhatsApp Web authentication
     * Returns QR string if needed, empty string if already authenticated
     */
    async generateQR(): Promise<string> {
        await this.ensureClient();

        // Check if client is already authenticated
        if (this.client && this.client.info?.wid?.user) {
            console.log(`WhatsApp client already authenticated for channel ${this.channelId}`);
            return ''; // Already authenticated
        }

        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Failed to initialize WhatsApp client'));
                return;
            }

            let resolved = false;

            // Handle QR code generation
            this.client.once('qr', (qr: string) => {
                if (!resolved) {
                    resolved = true;
                    console.log(`QR generated for channel ${this.channelId}`);
                    resolve(qr);
                }
            });

            // Handle authentication success
            this.client.once('authenticated', () => {
                if (!resolved) {
                    resolved = true;
                    console.log(`WhatsApp authenticated for channel ${this.channelId}`);
                    resolve(''); // Authentication completed
                }
            });

            // Handle client ready
            this.client.once('ready', () => {
                if (!resolved) {
                    resolved = true;
                    console.log(`WhatsApp client ready for channel ${this.channelId}`);
                    resolve(''); // Already ready
                }
            });

            // Handle authentication failure
            this.client.once('auth_failure', (error) => {
                if (!resolved) {
                    resolved = true;
                    console.error(`WhatsApp auth failure for channel ${this.channelId}:`, error);
                    reject(error);
                }
            });

            // Initialize the client with timeout
            this.client.initialize().catch((error) => {
                if (!resolved) {
                    resolved = true;
                    console.error(`Failed to initialize WhatsApp client for channel ${this.channelId}:`, error);
                    reject(error);
                }
            });

            // Add timeout to prevent hanging
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('QR generation timeout'));
                }
            }, 30000); // 30 seconds timeout
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
                if (message.isStatus || message.from.includes('@g.us')) {
                return;
                }

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
   * Get client info
   */
  async getClientInfo(): Promise<any> {
    await this.ensureClient();
    return this.client?.info;
  }

  /**
   * Check if client is ready
   */
  async isReady(): Promise<boolean> {
    await this.ensureClient();
    return this.client?.info?.wid?.user !== undefined;
  }

  /**
   * Destroy the client
   */
  async destroy(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
    } catch (error) {
      console.error(`Error destroying WhatsApp client for channel ${this.channelId}:`, error);
    }

    // Clear all timers
    for (const timer of this.messageTimers.values()) {
      clearTimeout(timer);
    }
    this.messageTimers.clear();
    this.isInitialized = false;
  }
}
