import { ContactType } from '@prisma/client';
import { ConversationEntity, CreateConversationData, UpdateConversationData } from '../entities/conversation.js';

export interface ConversationSearchCriteria {
  id?: string;
  date_to?: Date;
  limit?: number;
  offset?: number;
  status?: string;
  date_from?: Date;
  company_id?: number;
  channel_id?: string;
  external_id?: string;
  contact_id?: string;
  contact_type?: ContactType;
  assigned_agent_id?: number;
  sortDir?: 'asc' | 'desc';
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at';
}

export interface ConversationRepositoryInterface {
  create(data: CreateConversationData): Promise<ConversationEntity>;
  findById(id: string): Promise<ConversationEntity | null>;
  findByExternalId(external_id: string, channel_id: string): Promise<ConversationEntity | null>;
  findByContact(contact_id: string, channel_id: string): Promise<ConversationEntity[]>;
  findByChannel(channel_id: string, criteria?: Omit<ConversationSearchCriteria, 'channel_id'>): Promise<ConversationEntity[]>;
  search(criteria: ConversationSearchCriteria): Promise<{ conversations: ConversationEntity[], total: number }>;
  update(id: string, data: UpdateConversationData): Promise<ConversationEntity>;
  delete(id: string): Promise<boolean>;
  assignAgent(id: string, agent_id: number): Promise<ConversationEntity>;
  unassignAgent(id: string): Promise<ConversationEntity>;
  updateLastMessage(id: string, timestamp: Date): Promise<ConversationEntity>;
  countByStatus(status: string, company_id: number): Promise<number>;
  countByAgent(agent_id: number): Promise<number>;
  findActiveByAgent(agent_id: number): Promise<ConversationEntity[]>;
}
