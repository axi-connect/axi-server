import { PrismaClient } from '@prisma/client';
import { ChannelProvider } from '@prisma/client';
import { CredentialRepositoryInterface, CredentialSearchCriteria } from '../../domain/repositories/credential-repository.interface.js';
import { ChannelCredentialEntity, CreateChannelCredentialData, UpdateChannelCredentialData } from '../../domain/entities/channel-credential.js';

export class CredentialRepository implements CredentialRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateChannelCredentialData): Promise<ChannelCredentialEntity> {
    const credential = await this.prisma.channelCredential.create({
      data: {
        channel_id: data.channel_id,
        provider: data.provider,
        credentials: data.credentials,
        expires_at: data.expires_at
      }
    });

    return this.mapToEntity(credential);
  }

  async findById(id: string): Promise<ChannelCredentialEntity | null> {
    const credential = await this.prisma.channelCredential.findUnique({
      where: { id }
    });

    return credential ? this.mapToEntity(credential) : null;
  }

  async findByChannelId(channel_id: string): Promise<ChannelCredentialEntity | null> {
    const credential = await this.prisma.channelCredential.findFirst({
      where: { channel_id }
    });

    return credential ? this.mapToEntity(credential) : null;
  }

  async findByProvider(provider: ChannelProvider, criteria?: Omit<CredentialSearchCriteria, 'provider'>): Promise<ChannelCredentialEntity[]> {
    const where: any = { provider };

    if (criteria) {
      if (criteria.channel_id) where.channel_id = criteria.channel_id;
      if (criteria.is_active !== undefined) where.is_active = criteria.is_active;
    }

    const credentials = await this.prisma.channelCredential.findMany({
      where,
      orderBy: criteria?.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'asc' } : { created_at: 'desc' },
      take: criteria?.limit,
      skip: criteria?.offset
    });

    return credentials.map(credential => this.mapToEntity(credential));
  }

  async search(criteria: CredentialSearchCriteria): Promise<{ credentials: ChannelCredentialEntity[], total: number }> {
    const where: any = {};

    if (criteria.id) where.id = criteria.id;
    if (criteria.channel_id) where.channel_id = criteria.channel_id;
    if (criteria.provider) where.provider = criteria.provider;
    if (criteria.is_active !== undefined) where.is_active = criteria.is_active;
    if (criteria.expires_at) where.expires_at = { lte: criteria.expires_at };

    const [credentials, total] = await Promise.all([
      this.prisma.channelCredential.findMany({
        where,
        orderBy: criteria.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'asc' } : { created_at: 'desc' },
        take: criteria.limit,
        skip: criteria.offset
      }),
      this.prisma.channelCredential.count({ where })
    ]);

    return {
      credentials: credentials.map(credential => this.mapToEntity(credential)),
      total
    };
  }

  async update(id: string, data: UpdateChannelCredentialData): Promise<ChannelCredentialEntity> {
    const credential = await this.prisma.channelCredential.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(credential);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.channelCredential.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async findExpired(): Promise<ChannelCredentialEntity[]> {
    const credentials = await this.prisma.channelCredential.findMany({
      where: {
        expires_at: { lte: new Date() },
        is_active: true
      }
    });

    return credentials.map(credential => this.mapToEntity(credential));
  }

  async validateCredentials(id: string): Promise<boolean> {
    const credential = await this.prisma.channelCredential.findUnique({
      where: { id }
    });

    if (!credential) return false;

    // Check if expired
    if (credential.expires_at && credential.expires_at <= new Date()) {
      return false;
    }

    // Check if active
    return credential.is_active;
  }

  private mapToEntity(credential: any): ChannelCredentialEntity {
    return {
      id: credential.id,
      channel_id: credential.channel_id,
      provider: credential.provider,
      credentials: credential.credentials,
      is_active: credential.is_active,
      expires_at: credential.expires_at,
      created_at: credential.created_at,
      updated_at: credential.updated_at
    };
  }
}
