import { PrismaClient } from '@prisma/client';
import { ConversationEntity, CreateConversationData, UpdateConversationData } from '@/modules/conversations/domain/entities/conversation.js';
import { ConversationRepositoryInterface, ConversationSearchCriteria } from '@/modules/conversations/domain/repositories/conversation-repository.interface.js';

export class ConversationRepository implements ConversationRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateConversationData): Promise<ConversationEntity> {
    const conversation = await this.prisma.conversation.create({ data });

    return this.mapToEntity(conversation);
  }

  async findById(id: string): Promise<ConversationEntity | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id }
    });

    return conversation ? this.mapToEntity(conversation) : null;
  }

  async findByExternalId(external_id: string, channel_id: string): Promise<ConversationEntity | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        channel_id,
        external_id
      }
    });

    return conversation ? this.mapToEntity(conversation) : null;
  }

  async findByContact(contact_id: string, channel_id: string): Promise<ConversationEntity[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        contact_id,
        channel_id
      },
      orderBy: { updated_at: 'desc' }
    });

    return conversations.map(conversation => this.mapToEntity(conversation));
  }

  async findByChannel(channel_id: string, criteria?: Omit<ConversationSearchCriteria, 'channel_id'>): Promise<ConversationEntity[]> {
    const where: any = { channel_id };

    if (criteria) {
      if (criteria.status) where.status = criteria.status;
      if (criteria.assigned_agent_id) where.assigned_agent_id = criteria.assigned_agent_id;
      if (criteria.participant_id) where.participant_id = criteria.participant_id;
      if (criteria.participant_type) where.participant_type = criteria.participant_type;
      if (criteria.date_from || criteria.date_to) {
        where.created_at = {};
        if (criteria.date_from) where.created_at.gte = criteria.date_from;
        if (criteria.date_to) where.created_at.lte = criteria.date_to;
      }
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: criteria?.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'desc' } : { updated_at: 'desc' },
      take: criteria?.limit,
      skip: criteria?.offset
    });

    return conversations.map(conversation => this.mapToEntity(conversation));
  }

  async search(criteria: ConversationSearchCriteria): Promise<{ conversations: ConversationEntity[], total: number }> {
    const where: any = {};

    if (criteria.id) where.id = criteria.id;
    if (criteria.status) where.status = criteria.status;
    if (criteria.company_id) where.company_id = criteria.company_id;
    if (criteria.channel_id) where.channel_id = criteria.channel_id;
    if (criteria.external_id) where.external_id = criteria.external_id;
    if (criteria.assigned_agent_id) where.assigned_agent_id = criteria.assigned_agent_id;
    if (criteria.participant_id) where.participant_id = criteria.participant_id;
    if (criteria.participant_type) where.participant_type = criteria.participant_type;
    if (criteria.date_from || criteria.date_to) {
      where.created_at = {};
      if (criteria.date_from) where.created_at.gte = criteria.date_from;
      if (criteria.date_to) where.created_at.lte = criteria.date_to;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: criteria.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'desc' } : { updated_at: 'desc' },
        take: criteria.limit,
        skip: criteria.offset
      }),
      this.prisma.conversation.count({ where })
    ]);

    return {
      conversations: conversations.map(conversation => this.mapToEntity(conversation)),
      total
    };
  }

  async update(id: string, data: UpdateConversationData): Promise<ConversationEntity> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: data.status,
        assigned_agent_id: data.assigned_agent_id,
        contact_meta: data.contact_meta,
        last_message_at: data.last_message_at,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(conversation);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.conversation.delete({where: { id }});
      return true;
    } catch {
      return false;
    }
  }

  async assignAgent(id: string, agent_id: number): Promise<ConversationEntity> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        assigned_agent_id: agent_id,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(conversation);
  }

  async unassignAgent(id: string): Promise<ConversationEntity> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        assigned_agent_id: null,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(conversation);
  }

  async updateLastMessage(id: string, timestamp: Date): Promise<ConversationEntity> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        last_message_at: timestamp,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(conversation);
  }

  async countByStatus(status: string, company_id: number): Promise<number> {
    return this.prisma.conversation.count({
      where: { status, company_id }
    });
  }

  async countByAgent(agent_id: number): Promise<number> {
    return this.prisma.conversation.count({
      where: { assigned_agent_id: agent_id }
    });
  }

  async findActiveByAgent(agent_id: number): Promise<ConversationEntity[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        assigned_agent_id: agent_id,
        status: 'open'
      },
      orderBy: { last_message_at: 'desc' }
    });

    return conversations.map(conversation => this.mapToEntity(conversation));
  }

  private mapToEntity(conversation: any): ConversationEntity {
    return {
      id: conversation.id,
      status: conversation.status,
      company_id: conversation.company_id,
      channel_id: conversation.channel_id,
      contact_id: conversation.contact_id,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      external_id: conversation.external_id,
      contact_type: conversation.contact_type,
      contact_meta: conversation.contact_meta,
      last_message_at: conversation.last_message_at,
      assigned_agent_id: conversation.assigned_agent_id,
    };
  }
}
