import { ChannelProvider } from '@prisma/client';

export interface ChannelCredentialEntity {
  id: string;
  channel_id: string;
  provider: ChannelProvider;
  credentials: any; // Encrypted credentials
  is_active: boolean;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateChannelCredentialData {
  channel_id: string;
  provider: ChannelProvider;
  credentials: any;
  expires_at?: Date;
}

export interface UpdateChannelCredentialData {
  channel_id?: string;
  credentials?: any;
  is_active?: boolean;
  expires_at?: Date;
}
