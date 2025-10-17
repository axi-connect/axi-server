import { ChannelType, ChannelProvider } from '@prisma/client';

export interface CreateChannelRequestDto {
  name: string;
  type: ChannelType;
  provider: ChannelProvider;
  provider_account: string;
  credentials: any;
  config?: any;
  default_agent_id?: number;
  company_id: number;
  expires_at?: string; // ISO date string
}

export interface ChannelResponseDto {
  id: string;
  name: string;
  type: ChannelType;
  config?: any;
  provider: ChannelProvider;
  is_active: boolean;
  provider_account: string;
  default_agent_id?: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UpdateChannelRequestDto {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  provider_account?: string;
  config?: any;
  is_active?: boolean;
  default_agent_id?: number;
}

export interface ChannelsListResponseDto {
  channels: ChannelResponseDto[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface ChannelSearchQueryDto {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortDir?: 'asc' | 'desc';
}
