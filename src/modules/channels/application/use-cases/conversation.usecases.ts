import { ParticipantType } from '@prisma/client';
import { ConversationEntity, CreateConversationData, UpdateConversationData } from '../../domain/entities/conversation.js';
import { ConversationRepositoryInterface, ConversationSearchCriteria } from '../../domain/repositories/conversation-repository.interface.js';

export interface CreateConversationInput {
  company_id: number;
  channel_id: string;
  external_id: string;
  participant_id?: string;
  participant_meta?: any;
  participant_type: ParticipantType;
}

export interface UpdateConversationInput {
  status?: string;
  assigned_agent_id?: number;
  participant_meta?: any;
}

export interface ConversationSearchInput {
  status?: string;
  channel_id?: string;
  assigned_agent_id?: number;
  participant_id?: string;
  participant_type?: ParticipantType;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at';
  sortDir?: 'asc' | 'desc';
}

export class ConversationUseCases {
  constructor(private conversationRepository: ConversationRepositoryInterface) {}

  async createConversation(input: CreateConversationInput): Promise<ConversationEntity> {
    // Check if conversation with external_id already exists for this channel
    const existing = await this.conversationRepository.findByExternalId(input.external_id, input.channel_id);
    if (existing) {
      throw new Error(`Conversation with external_id '${input.external_id}' already exists for this channel`);
    }

    const conversationData: CreateConversationData = {
      company_id: input.company_id,
      channel_id: input.channel_id,
      external_id: input.external_id,
      participant_id: input.participant_id,
      participant_meta: input.participant_meta,
      participant_type: input.participant_type
    };

    return this.conversationRepository.create(conversationData);
  }

  async getConversationById(id: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
  }

  async getConversationByExternalId(external_id: string, channel_id: string): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByExternalId(external_id, channel_id);
  }

  async updateConversation(id: string, input: UpdateConversationInput): Promise<ConversationEntity> {
    const updateData: UpdateConversationData = {
      status: input.status,
      assigned_agent_id: input.assigned_agent_id,
      participant_meta: input.participant_meta
    };

    return this.conversationRepository.update(id, updateData);
  }

  async assignAgent(conversation_id: string, agent_id: number): Promise<ConversationEntity> {
    return this.conversationRepository.assignAgent(conversation_id, agent_id);
  }

  async unassignAgent(conversation_id: string): Promise<ConversationEntity> {
    return this.conversationRepository.unassignAgent(conversation_id);
  }

  async updateLastMessage(conversation_id: string, timestamp: Date): Promise<ConversationEntity> {
    return this.conversationRepository.updateLastMessage(conversation_id, timestamp);
  }

  async getActiveConversationsByAgent(agent_id: number): Promise<ConversationEntity[]> {
    return this.conversationRepository.findActiveByAgent(agent_id);
  }

  async countConversationsByAgent(agent_id: number): Promise<number> {
    return this.conversationRepository.countByAgent(agent_id);
  }
}
