import { ChannelProvider } from '@prisma/client';
import { WebSocketEvent } from '../../domain/entities/channel.js';

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  authToken?: string;
  accountSid?: string;
  webhookUrl?: string;
  accessToken?: string;
  phoneNumberId?: string;
  emitEventCallback: (event: WebSocketEvent) => void;
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
  protected messageHandler?: (data: any) => Promise<void>;

  constructor(config: ProviderConfig, provider: ChannelProvider) {
    this.config = config;
    this.provider = provider;
  }

  abstract sendMessage(payload: MessagePayload): Promise<ProviderResponse>;

  abstract validateCredentials(): Promise<boolean>;

  abstract isAuthenticated(): Promise<boolean>;

  abstract parseWebhook(data: any): WebhookMessage | null;

  abstract getProviderName(): string;

  abstract destroy(): Promise<void>;

  setMessageHandler(handler: (data: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  protected async emitMessage(data: any): Promise<void> {
    if (this.messageHandler) await this.messageHandler(data);
  }

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
