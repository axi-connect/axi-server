import { ParticipantType } from '@prisma/client';
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
  participant_id?: string;
  sortDir?: 'asc' | 'desc';
  assigned_agent_id?: number;
  participant_type?: ParticipantType;
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at';
}

export interface ConversationRepositoryInterface {
  create(data: CreateConversationData): Promise<ConversationEntity>;
  findById(id: string): Promise<ConversationEntity | null>;
  findByExternalId(external_id: string, channel_id: string): Promise<ConversationEntity | null>;
  findByParticipant(participant_id: string, channel_id: string): Promise<ConversationEntity[]>;
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
