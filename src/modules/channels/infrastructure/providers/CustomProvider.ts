import { ChannelProvider } from '@prisma/client';
import { BaseProvider, ProviderConfig, MessagePayload, ProviderResponse, WebhookMessage } from './BaseProvider.js';

export class CustomProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, ChannelProvider.CUSTOM);
  }

  async sendMessage(payload: MessagePayload): Promise<ProviderResponse> {
    try {
      // Custom providers have their own implementation
      // This is a flexible provider for custom integrations

      if (this.config.customSendFunction) {
        // Allow custom send function in config
        const result = await this.config.customSendFunction(payload, this.config);
        return result;
      }

      // Default implementation - just log and return success
      console.log('Custom provider sending message:', payload);

      return {
        success: true,
        messageId: `custom_${Date.now()}`,
        externalId: `custom_${Date.now()}`
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send message via custom provider'
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Custom validation - always return true unless specified otherwise
      if (this.config.customValidateFunction) {
        return await this.config.customValidateFunction(this.config);
      }

      return true;
    } catch {
      return false;
    }
  }

  parseWebhook(data: any): WebhookMessage | null {
    try {
      // Custom webhook parsing - expect standard format
      if (this.config.customParseFunction) {
        return this.config.customParseFunction(data, this.config);
      }

      // Default parsing
      return {
        id: data.id || `custom_${Date.now()}`,
        from: data.from,
        to: data.to,
        message: data.message || data.text || '',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        type: data.type || 'text',
        metadata: data.metadata || {}
      };
    } catch {
      return null;
    }
  }

  getProviderName(): string {
    return 'Custom Provider';
  }
}
