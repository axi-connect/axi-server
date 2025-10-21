import { ChannelType, ChannelProvider } from '@prisma/client';

export interface ChannelEntity {
  id: string;
  name: string;
  type: ChannelType;
  config?: any;
  provider: ChannelProvider;
  is_active: boolean;
  credentials_id: string | null;
  provider_account: string;
  default_agent_id?: number;
  company_id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateChannelData {
  name: string;
  config?: any;
  type: ChannelType;
  company_id: number;
  is_active: boolean;
  credentials_id?: string;
  provider_account: string;
  provider: ChannelProvider;
  default_agent_id?: number;
}

export interface UpdateChannelData {
  name?: string;
  config?: any;
  type?: ChannelType;
  is_active?: boolean;
  credentials_id?: string;
  provider_account?: string;
  default_agent_id?: number;
  provider?: ChannelProvider;
}

export interface ChannelStatus {
  channelId: string;
  provider: string;
  type: string;
  isActive: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastActivity?: Date;
  errorMessage?: string;
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