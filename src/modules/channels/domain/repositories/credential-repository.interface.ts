import { ChannelProvider } from '@prisma/client';
import { ChannelCredentialEntity, CreateChannelCredentialData, UpdateChannelCredentialData } from '../entities/channel-credential.js';

export interface CredentialSearchCriteria {
  id?: string;
  channel_id?: string;
  provider?: ChannelProvider;
  is_active?: boolean;
  expires_at?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortDir?: 'asc' | 'desc';
}

export interface CredentialRepositoryInterface {
  create(data: CreateChannelCredentialData): Promise<ChannelCredentialEntity>;
  findById(id: string): Promise<ChannelCredentialEntity | null>;
  findByChannelId(channel_id: string): Promise<ChannelCredentialEntity | null>;
  findByProvider(provider: ChannelProvider, criteria?: Omit<CredentialSearchCriteria, 'provider'>): Promise<ChannelCredentialEntity[]>;
  search(criteria: CredentialSearchCriteria): Promise<{ credentials: ChannelCredentialEntity[], total: number }>;
  update(id: string, data: UpdateChannelCredentialData): Promise<ChannelCredentialEntity>;
  delete(id: string): Promise<boolean>;
  activate(id: string): Promise<ChannelCredentialEntity>;
  deactivate(id: string): Promise<ChannelCredentialEntity>;
  findExpired(): Promise<ChannelCredentialEntity[]>;
  validateCredentials(id: string): Promise<boolean>;
}
