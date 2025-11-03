import { PrismaClient } from '@prisma/client';
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
    const message = await this.prisma.messageLog.findUnique({where: { id }});
    return message ? this.mapToEntity(message) : null;
  }

  async findByConversation(criteria: MessageSearchCriteria): Promise<MessageEntity[]> {
    const where: any = this.buildWhereClause(criteria);
    console.log(where);

    const messages = await this.prisma.messageLog.findMany({
      where,
      orderBy: criteria?.sortBy ? { [criteria.sortBy]: criteria.sortDir || 'desc' } : { timestamp: 'desc' },
      take: criteria?.limit,
      skip: criteria?.offset
    });

    return messages.map(message => this.mapToEntity(message));
  }

  async search(criteria: MessageSearchCriteria): Promise<{ messages: MessageEntity[], total: number }> {
    const where: any = this.buildWhereClause(criteria);

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

  // Helpers
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

  private buildWhereClause(criteria: MessageSearchCriteria): any {
    const where: any = {};
    const fieldMappings = ['id', 'conversation_id', 'direction', 'status', 'content_type', 'from', 'to'] as (keyof MessageSearchCriteria)[];

    fieldMappings.forEach(field => {
      if (criteria[field] !== undefined) where[field] = criteria[field];
    });

    if (criteria.date_from || criteria.date_to) {
      where.timestamp = {
        ...(criteria.date_from && { gte: criteria.date_from }),
        ...(criteria.date_to && { lte: criteria.date_to }),
      };
    }

    return where;
  }
}