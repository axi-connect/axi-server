import { MessageDirection, MessageStatus } from '@prisma/client';
import { MessageEntity, CreateMessageData, UpdateMessageData } from '../entities/message.js';

export interface MessageSearchCriteria {
  id?: string;
  to?: string;
  from?: string;
  date_to?: Date;
  limit?: number;
  offset?: number;
  date_from?: Date;
  content_type?: string;
  status?: MessageStatus;
  conversation_id?: string;
  sortDir?: 'asc' | 'desc';
  direction?: MessageDirection;
  sortBy?: 'timestamp' | 'created_at';
}

export interface MessageRepositoryInterface {
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<MessageEntity | null>;
  create(data: CreateMessageData): Promise<MessageEntity>;
  countByConversation(conversation_id: string): Promise<number>;
  update(id: string, data: UpdateMessageData): Promise<MessageEntity>;
  findByConversation(criteria: MessageSearchCriteria): Promise<MessageEntity[]>;
  findLatestByConversation(conversation_id: string): Promise<MessageEntity | null>;
  search(criteria: MessageSearchCriteria): Promise<{ messages: MessageEntity[], total: number }>;
}