import { ChannelType, ChannelProvider } from '@prisma/client';
import type { MessageEntity } from '@/modules/conversations/domain/entities/message.js';

export interface ChannelEntity {
  id: string;
  name: string;
  config?: any;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  type: ChannelType;
  company_id: number;
  provider_account: string;
  is_active: boolean | null;
  provider: ChannelProvider;
  default_agent_id?: number|null;
  credentials_id: string | null;
}

export interface CreateChannelData {
  name: string;
  config?: any;
  type: ChannelType;
  company_id: number;
  credentials_id?: string;
  provider_account: string;
  provider: ChannelProvider;
  default_agent_id?: number;
}

export interface UpdateChannelData {
  name?: string;
  config?: any;
  type?: ChannelType;
  credentials_id?: string;
  provider_account?: string;
  default_agent_id?: number;
  provider?: ChannelProvider;
}

export interface ChannelStatus {
  channelId: string;
  provider: string;
  type: string;
  lastActivity?: Date;
  isConnected: boolean;
  errorMessage?: string;
  isAuthenticated: boolean;
}

// Eventos tipados para WebSocket (runtime/gateway)
export type ChannelEvents =
  | 'channel.started'
  | 'channel.stopped'
  | 'channel.error'
  | 'channel.disconnected'
  | 'channel.authenticated';

export type MessageEvents =
  | 'message.received'
  | 'message.sent';

export type SystemEvents = never; // Reservado para futuros eventos del sistema

export type WebSocketEventName = ChannelEvents | MessageEvents | SystemEvents;

export interface WebSocketEventDataMap {
  'channel.started': { provider: ChannelProvider; type: ChannelType };
  'channel.stopped': { provider: ChannelProvider };
  'channel.error': { error: string };
  'channel.disconnected': { reason?: string };
  'channel.authenticated': { reason: string };
  'message.received': MessageEntity; // Mensaje persistido/ingestado
  'message.sent': { messageId: string; result?: unknown } | MessageEntity;
}

export interface WebSocketEvent<T extends WebSocketEventName = WebSocketEventName> {
  event: T;
  channelId: string;
  companyId: number;
  data: WebSocketEventDataMap[T];
  timestamp: Date;
}