import { MessageDirection, MessageStatus } from '@prisma/client';
import { MessageEntity, CreateMessageData, UpdateMessageData } from '../entities/message.js';

export interface MessageSearchCriteria {
  id?: string;
  conversation_id?: string;
  direction?: MessageDirection;
  status?: MessageStatus;
  content_type?: string;
  from?: string;
  to?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'created_at';
  sortDir?: 'asc' | 'desc';
}

export interface MessageRepositoryInterface {
  create(data: CreateMessageData): Promise<MessageEntity>;
  findById(id: string): Promise<MessageEntity | null>;
  findByConversation(conversation_id: string, criteria?: Omit<MessageSearchCriteria, 'conversation_id'>): Promise<MessageEntity[]>;
  search(criteria: MessageSearchCriteria): Promise<{ messages: MessageEntity[], total: number }>;
  update(id: string, data: UpdateMessageData): Promise<MessageEntity>;
  delete(id: string): Promise<boolean>;
  countByConversation(conversation_id: string): Promise<number>;
  findLatestByConversation(conversation_id: string): Promise<MessageEntity | null>;
  updateStatus(id: string, status: MessageStatus): Promise<MessageEntity>;
  bulkUpdateStatus(ids: string[], status: MessageStatus): Promise<MessageEntity[]>;
}
