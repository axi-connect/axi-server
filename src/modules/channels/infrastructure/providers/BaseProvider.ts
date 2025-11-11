import { ChannelProvider } from '@prisma/client';
import type { MessageInput } from '@/modules/conversations/domain/entities/message.js';
import { MessageHandlerData } from '@/modules/conversations/domain/entities/conversation.js';
import { type WebSocketEvent, type WebSocketEventName } from '../../domain/entities/channel.js';

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  authToken?: string;
  [key: string]: any;
  accountSid?: string;
  webhookUrl?: string;
  accessToken?: string;
  phoneNumberId?: string;
  emitEventCallback: (event: WebSocketEvent<WebSocketEventName>) => void;
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
  protected messageHandler?: (data: MessageHandlerData<MessageInput>) => Promise<void>;

  constructor(config: ProviderConfig, provider: ChannelProvider) {
    this.config = config;
    this.provider = provider;
  }

  abstract destroy(): Promise<void>;
  
  abstract getProviderName(): string;
  
  abstract isAuthenticated(): Promise<boolean>;
  
  abstract validateCredentials(): Promise<boolean>;

  abstract parseWebhook(data: any): WebhookMessage | null;

  abstract sendMessage(payload: MessageInput): Promise<ProviderResponse>;

  setMessageHandler(handler: (data: MessageHandlerData<MessageInput>) => Promise<void>): void {
    this.messageHandler = handler;
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
