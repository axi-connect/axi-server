import { PrismaClient } from '@prisma/client';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { MessageEntity, CreateMessageData, UpdateMessageData } from '../../domain/entities/message.js';
import { MessageRepositoryInterface, MessageSearchCriteria } from '../../domain/repositories/message-repository.interface.js';

export class MessageRepository implements MessageRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateMessageData): Promise<MessageEntity> {
    const message = await this.prisma.messageLog.create({
      data: {
        from: data.from,
        to: data.to,
        message: data.message,
        payload: data.payload,
        metadata: data.metadata,
        direction: data.direction,
        conversation_id: data.conversation_id,
        content_type: data.content_type
      }
    });

    return this.mapToEntity(message);
  }

  async findById(id: string): Promise<MessageEntity | null> {
    const message = await this.prisma.messageLog.findUnique({
      where: { id }
    });

    return message ? this.mapToEntity(message) : null;
  }

  async findByConversation(conversation_id: string, criteria?: Omit<MessageSearchCriteria, 'conversation_id'>): Promise<MessageEntity[]> {
    const where: any = { conversation_id };

    if (criteria) {
      if (criteria.direction) where.direction = criteria.direction;
      if (criteria.status) where.status = criteria.status;
      if (criteria.content_type) where.content_type = criteria.content_type;
      if (criteria.from) where.from = criteria.from;
      if (criteria.to) where.to = criteria.to;
      if (criteria.date_from || criteria.date_to) {
        where.timestamp = {};
        if (criteria.date_from) where.timestamp.gte = criteria.date_from;
        if (criteria.date_to) where.timestamp.lte = criteria.date_to;
      }
    }

    const messages = await this.prisma.messageLog.findMany({
      where,
      orderBy: criteria?.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'desc' } : { timestamp: 'desc' },
      take: criteria?.limit,
      skip: criteria?.offset
    });

    return messages.map(message => this.mapToEntity(message));
  }

  async search(criteria: MessageSearchCriteria): Promise<{ messages: MessageEntity[], total: number }> {
    const where: any = {};

    if (criteria.id) where.id = criteria.id;
    if (criteria.conversation_id) where.conversation_id = criteria.conversation_id;
    if (criteria.direction) where.direction = criteria.direction;
    if (criteria.status) where.status = criteria.status;
    if (criteria.content_type) where.content_type = criteria.content_type;
    if (criteria.from) where.from = criteria.from;
    if (criteria.to) where.to = criteria.to;
    if (criteria.date_from || criteria.date_to) {
      where.timestamp = {};
      if (criteria.date_from) where.timestamp.gte = criteria.date_from;
      if (criteria.date_to) where.timestamp.lte = criteria.date_to;
    }

    const [messages, total] = await Promise.all([
      this.prisma.messageLog.findMany({
        where,
        orderBy: criteria.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'desc' } : { timestamp: 'desc' },
        take: criteria.limit,
        skip: criteria.offset
      }),
      this.prisma.messageLog.count({ where })
    ]);

    return {
      messages: messages.map(message => this.mapToEntity(message)),
      total
    };
  }

  async update(id: string, data: UpdateMessageData): Promise<MessageEntity> {
    const message = await this.prisma.messageLog.update({
      where: { id },
      data: {
        status: data.status,
        metadata: data.metadata,
        updated_at: new Date()
      }
    });

    return this.mapToEntity(message);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.messageLog.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async countByConversation(conversation_id: string): Promise<number> {
    return this.prisma.messageLog.count({
      where: { conversation_id }
    });
  }

  async findLatestByConversation(conversation_id: string): Promise<MessageEntity | null> {
    const message = await this.prisma.messageLog.findFirst({
      where: { conversation_id },
      orderBy: { timestamp: 'desc' }
    });

    return message ? this.mapToEntity(message) : null;
  }

  async updateStatus(id: string, status: MessageStatus): Promise<MessageEntity> {
    const message = await this.prisma.messageLog.update({
      where: { id },
      data: { status, updated_at: new Date() }
    });

    return this.mapToEntity(message);
  }

  async bulkUpdateStatus(ids: string[], status: MessageStatus): Promise<MessageEntity[]> {
    await this.prisma.messageLog.updateMany({
      where: { id: { in: ids } },
      data: { status, updated_at: new Date() }
    });

    const messages = await this.prisma.messageLog.findMany({
      where: { id: { in: ids } }
    });

    return messages.map(message => this.mapToEntity(message));
  }

  private mapToEntity(message: any): MessageEntity {
    return {
      id: message.id,
      from: message.from,
      to: message.to,
      message: message.message,
      payload: message.payload,
      metadata: message.metadata,
      direction: message.direction,
      timestamp: message.timestamp,
      conversation_id: message.conversation_id,
      status: message.status,
      content_type: message.content_type,
      created_at: message.created_at,
      updated_at: message.updated_at
    };
  }
}
