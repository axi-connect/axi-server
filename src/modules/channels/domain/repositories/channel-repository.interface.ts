import { ChannelType, ChannelProvider } from '@prisma/client';
import { ChannelEntity, CreateChannelData, UpdateChannelData } from '../entities/channel.js';

export interface ChannelSearchCriteria {
  id?: string;
  name?: string;
  limit?: number;
  offset?: number;
  type?: ChannelType;
  is_active?: boolean;
  company_id?: number;
  sortDir?: 'asc' | 'desc';
  provider_account?: string;
  provider?: ChannelProvider;
  sortBy?: 'created_at' | 'updated_at' | 'name';
}

export interface ChannelRepositoryInterface {
  create(data: CreateChannelData): Promise<ChannelEntity>;
  findById(id: string): Promise<ChannelEntity | null>;
  findByProviderAccount(provider_account: string): Promise<ChannelEntity | null>;
  findByCredentialsId(credentials_id: string): Promise<ChannelEntity | null>;
  findByCompany(company_id: number, criteria?: Omit<ChannelSearchCriteria, 'company_id'>): Promise<ChannelEntity[]>;
  search(criteria: ChannelSearchCriteria): Promise<{ channels: ChannelEntity[], total: number }>;
  update(id: string, data: UpdateChannelData): Promise<ChannelEntity>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  countByCompany(company_id: number): Promise<number>;
  exists(id: string): Promise<boolean>;
  findActiveByType(type: ChannelType, company_id: number): Promise<ChannelEntity[]>;
  findActiveChannels(): Promise<ChannelEntity[]>;
}
