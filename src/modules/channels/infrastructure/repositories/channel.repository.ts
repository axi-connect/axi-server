import { ChannelType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { ChannelEntity, CreateChannelData, UpdateChannelData } from '../../domain/entities/channel.js';
import { ChannelRepositoryInterface, ChannelSearchCriteria } from '../../domain/repositories/channel-repository.interface.js';

export class ChannelRepository implements ChannelRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateChannelData): Promise<ChannelEntity> {
    const channel = await this.prisma.channel.create({data});
    return this.mapToEntity(channel);
  }

  async findById(id: string): Promise<ChannelEntity | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id }
    });

    return channel ? this.mapToEntity(channel) : null;
  }

  async findByProviderAccount(provider_account: string): Promise<ChannelEntity | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { provider_account }
    });

    return channel ? this.mapToEntity(channel) : null;
  }

  async findByCredentialsId(credentials_id: string): Promise<ChannelEntity | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { credentials_id }
    });

    return channel ? this.mapToEntity(channel) : null;
  }

  async findByCompany(company_id: number, criteria?: Omit<ChannelSearchCriteria, 'company_id'>): Promise<ChannelEntity[]> {
    const where: any = {
      company_id,
      deleted_at: null // Only active channels
    };

    if (criteria) {
      if (criteria.name) where.name = { contains: criteria.name, mode: 'insensitive' };
      if (criteria.type) where.type = criteria.type;
      if (criteria.provider) where.provider = criteria.provider;
      if (criteria.is_active !== undefined) where.is_active = criteria.is_active;
      if (criteria.provider_account) where.provider_account = { contains: criteria.provider_account };
    }

    const channels = await this.prisma.channel.findMany({
      where,
      orderBy: criteria?.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'asc' } : { created_at: 'desc' },
      take: criteria?.limit,
      skip: criteria?.offset
    });

    return channels.map(channel => this.mapToEntity(channel));
  }

  async search(criteria: ChannelSearchCriteria): Promise<{ channels: ChannelEntity[], total: number }> {
    const where: any = {
      deleted_at: null // Only non-deleted channels
    };

    if (criteria.id) where.id = criteria.id;
    if (criteria.name) where.name = { contains: criteria.name, mode: 'insensitive' };
    if (criteria.type) where.type = criteria.type;
    if (criteria.provider) where.provider = criteria.provider;
    if (criteria.is_active !== undefined) where.is_active = criteria.is_active;
    if (criteria.company_id) where.company_id = criteria.company_id;
    if (criteria.provider_account) where.provider_account = { contains: criteria.provider_account };

    const [channels, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        orderBy: criteria.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'asc' } : { created_at: 'desc' },
        take: criteria.limit,
        skip: criteria.offset
      }),
      this.prisma.channel.count({ where })
    ]);

    return {
      channels: channels.map(channel => this.mapToEntity(channel)),
      total
    };
  }

  async update(id: string, data: UpdateChannelData): Promise<ChannelEntity> {
    const channel = await this.prisma.channel.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        config: data.config,
        provider: data.provider,
        is_active: data.is_active,
        provider_account: data.provider_account,
        default_agent_id: data.default_agent_id,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(channel);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.channel.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.channel.update({
        where: { id },
        data: { deleted_at: new Date() }
      });
      return true;
    } catch {
      return false;
    }
  }

  async countByCompany(company_id: number): Promise<number> {
    return this.prisma.channel.count({
      where: {
        company_id,
        deleted_at: null,
        is_active: true
      }
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.channel.count({
      where: { id, deleted_at: null }
    });
    return count > 0;
  }

  async findActiveByType(type: ChannelType, company_id: number): Promise<ChannelEntity[]> {
    const channels = await this.prisma.channel.findMany({
      where: {
        type,
        company_id,
        is_active: true,
        deleted_at: null
      }
    });

    return channels.map(channel => this.mapToEntity(channel));
  }

  async validateCompanyExists(company_id: number): Promise<boolean> {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: company_id },
        select: { id: true }
      });
      return company !== null;
    } catch {
      return false;
    }
  }

  async findActiveChannels(): Promise<ChannelEntity[]> {
    const channels = await this.prisma.channel.findMany({
      where: {
        is_active: true,
        deleted_at: null
      },
      include: {
        credentials: true,
        company: true
      }
    });

    return channels.map(channel => this.mapToEntity(channel));
  }

  private mapToEntity(channel: any): ChannelEntity {
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      config: channel.config,
      provider: channel.provider,
      is_active: channel.is_active,
      credentials_id: channel.credentials_id,
      provider_account: channel.provider_account,
      default_agent_id: channel.default_agent_id,
      company_id: channel.company_id,
      created_at: channel.created_at,
      updated_at: channel.updated_at,
      deleted_at: channel.deleted_at
    };
  }
}
