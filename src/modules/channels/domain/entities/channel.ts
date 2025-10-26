import { ChannelType, ChannelProvider } from '@prisma/client';

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

export interface RuntimeMessage {
  id: string;
  channelId: string;
  direction: 'incoming' | 'outgoing';
  content: any;
  timestamp: Date;
  metadata?: any;
}

export interface WebSocketEvent {
  event: string;
  channelId: string;
  companyId: number;
  data: any;
  timestamp: Date;
}