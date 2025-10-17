import { ChannelProvider } from '@prisma/client';
import { CredentialRepositoryInterface } from '@/modules/channels/domain/repositories/credential-repository.interface.js';
import { ChannelCredentialEntity, CreateChannelCredentialData, UpdateChannelCredentialData } from '@/modules/channels/domain/entities/channel-credential.js';

export interface CreateCredentialInput {
  channel_id: string;
  provider: ChannelProvider;
  credentials: any;
  expires_at?: Date;
}

export interface UpdateCredentialInput {
  credentials?: any;
  is_active?: boolean;
  expires_at?: Date;
}

export class ChannelCredentialUseCases {
  constructor(private credentialRepository: CredentialRepositoryInterface) {}

  async createCredential(input: CreateCredentialInput): Promise<ChannelCredentialEntity> {
    // Check if credential already exists for this channel
    const existing = await this.credentialRepository.findByChannelId(input.channel_id);
    if (existing) {
      throw new Error(`Credential already exists for channel '${input.channel_id}'`);
    }

    const credentialData: CreateChannelCredentialData = {
      channel_id: input.channel_id,
      provider: input.provider,
      credentials: input.credentials,
      expires_at: input.expires_at
    };

    return this.credentialRepository.create(credentialData);
  }

  async getCredentialById(id: string): Promise<ChannelCredentialEntity> {
    const credential = await this.credentialRepository.findById(id);
    if (!credential) {
      throw new Error('Credential not found');
    }
    return credential;
  }

  async getCredentialByChannel(channel_id: string): Promise<ChannelCredentialEntity> {
    const credential = await this.credentialRepository.findByChannelId(channel_id);
    if (!credential) {
      throw new Error(`No credential found for channel '${channel_id}'`);
    }
    return credential;
  }

  async updateCredential(id: string, input: UpdateCredentialInput): Promise<ChannelCredentialEntity> {
    const updateData: UpdateChannelCredentialData = {
      credentials: input.credentials,
      is_active: input.is_active,
      expires_at: input.expires_at
    };

    return this.credentialRepository.update(id, updateData);
  }

  async activateCredential(id: string): Promise<ChannelCredentialEntity> {
    return this.credentialRepository.activate(id);
  }

  async deactivateCredential(id: string): Promise<ChannelCredentialEntity> {
    return this.credentialRepository.deactivate(id);
  }

  async validateCredential(id: string): Promise<boolean> {
    return this.credentialRepository.validateCredentials(id);
  }

  async getExpiredCredentials(): Promise<ChannelCredentialEntity[]> {
    return this.credentialRepository.findExpired();
  }
}
