import { ChannelProvider } from '@prisma/client';

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  webhookUrl?: string;
  phoneNumberId?: string;
  accountSid?: string;
  authToken?: string;
  [key: string]: any;
}

export interface MessagePayload {
  to: string;
  message: string;
  type?: 'text' | 'template' | 'media';
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    filename?: string;
  };
  template?: {
    name: string;
    language: string;
    components: any[];
  };
}

export interface ProviderResponse {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  metadata?: any;
}

export interface WebhookMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: string;
  metadata?: any;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected provider: ChannelProvider;

  constructor(config: ProviderConfig, provider: ChannelProvider) {
    this.config = config;
    this.provider = provider;
  }

  abstract sendMessage(payload: MessagePayload): Promise<ProviderResponse>;

  abstract validateCredentials(): Promise<boolean>;

  abstract parseWebhook(data: any): WebhookMessage | null;

  abstract getProviderName(): string;

  protected getConfig(): ProviderConfig {
    return this.config;
  }

  protected validateConfig(requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!this.config[field]) {
        return false;
      }
    }
    return true;
  }
}
