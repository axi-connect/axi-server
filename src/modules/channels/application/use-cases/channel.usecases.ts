import { HttpError } from '@/shared/errors/http.error.js';
import { ChannelType, ChannelProvider } from '@prisma/client';
import { ChannelEntity, CreateChannelData, UpdateChannelData } from '../../domain/entities/channel.js';
import { CredentialRepositoryInterface } from '../../domain/repositories/credential-repository.interface.js';
import { ChannelRepositoryInterface, ChannelSearchCriteria } from '../../domain/repositories/channel-repository.interface.js';

export interface CreateChannelInput {
  name: string;
  type: ChannelType;
  provider: ChannelProvider;
  provider_account: string;
  credentials: any; // Encrypted credentials
  config?: any;
  default_agent_id?: number;
  company_id: number;
  expires_at?: Date;
}

export interface UpdateChannelInput {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  provider_account?: string;
  config?: any;
  is_active?: boolean;
  default_agent_id?: number;
}

export interface ChannelSearchInput {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortDir?: 'asc' | 'desc';
}

export class ChannelUseCases {
  constructor(
    private channelRepository: ChannelRepositoryInterface,
    private credentialRepository: CredentialRepositoryInterface
  ) {}

  async createChannel(input: CreateChannelInput): Promise<ChannelEntity> {
    // Validate required fields
    if (!input.name || !input.type || !input.provider || !input.provider_account || !input.credentials) {
      throw new HttpError(400, 'Missing required fields: name, type, provider, provider_account, credentials');
    }

    // Check if provider_account already exists
    const existingChannel = await this.channelRepository.findByProviderAccount(input.provider_account);
    if (existingChannel) {
      throw new HttpError(409, `Channel with provider account '${input.provider_account}' already exists`);
    }

    // Create credentials first
    const credentialData = {
      channel_id: '', // Will be updated after channel creation
      provider: input.provider,
      credentials: input.credentials,
      expires_at: input.expires_at
    };

    const credential = await this.credentialRepository.create(credentialData);

    try {
      // Create channel with credential reference
      const channelData: CreateChannelData = {
        name: input.name,
        type: input.type,
        config: input.config,
        provider: input.provider,
        credentials_id: credential.id,
        provider_account: input.provider_account,
        default_agent_id: input.default_agent_id,
        company_id: input.company_id
      };

      const channel = await this.channelRepository.create(channelData);

      // Update credential with channel_id
      await this.credentialRepository.update(credential.id, { channel_id: channel.id });

      return channel;
    } catch (error) {
      // If channel creation fails, delete the credential
      await this.credentialRepository.delete(credential.id);
      throw error;
    }
  }

  async getChannelById(id: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }
    return channel;
  }

  async getChannelsByCompany(company_id: number, search?: ChannelSearchInput): Promise<{ channels: ChannelEntity[], total: number }> {
    const criteria: ChannelSearchCriteria = {
      company_id,
      ...search
    };
    return this.channelRepository.search(criteria);
  }

  async updateChannel(id: string, input: UpdateChannelInput): Promise<ChannelEntity> {
    // Verify channel exists
    const existingChannel = await this.channelRepository.findById(id);
    if (!existingChannel) {
      throw new HttpError(404, 'Channel not found');
    }

    // If provider_account is being updated, check for conflicts
    if (input.provider_account && input.provider_account !== existingChannel.provider_account) {
      const conflict = await this.channelRepository.findByProviderAccount(input.provider_account);
      if (conflict) {
        throw new HttpError(409, `Channel with provider account '${input.provider_account}' already exists`);
      }
    }

    const updateData: UpdateChannelData = {
      name: input.name,
      type: input.type,
      provider: input.provider,
      provider_account: input.provider_account,
      config: input.config,
      is_active: input.is_active,
      default_agent_id: input.default_agent_id
    };

    return this.channelRepository.update(id, updateData);
  }

  async deleteChannel(id: string): Promise<boolean> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }

    // Soft delete the channel
    return this.channelRepository.softDelete(id);
  }

  async activateChannel(id: string): Promise<ChannelEntity> {
    return this.channelRepository.update(id, { is_active: true });
  }

  async deactivateChannel(id: string): Promise<ChannelEntity> {
    return this.channelRepository.update(id, { is_active: false });
  }

  async getActiveChannelsByType(type: ChannelType, company_id: number): Promise<ChannelEntity[]> {
    return this.channelRepository.findActiveByType(type, company_id);
  }
}
