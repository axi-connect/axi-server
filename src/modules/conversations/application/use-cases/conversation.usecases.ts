import { ParticipantType } from '@prisma/client';
import { HttpError } from '@/shared/errors/http.error.js';
import type { MessageEntity } from '@/modules/conversations/domain/entities/message.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import type { CompaniesRepository } from '@/modules/identities/companies/infrastructure/companies.repository.js';
import type { Conversation as ConversationDto } from '@/modules/conversations/domain/entities/conversation.js';
import { MessageRepositoryInterface } from '@/modules/conversations/domain/repositories/message-repository.interface.js';
import type { ConversationEntity, CreateConversationData, UpdateConversationData } from '@/modules/conversations/domain/entities/conversation.js';
import type { ConversationRepositoryInterface, ConversationSearchCriteria } from '@/modules/conversations/domain/repositories/conversation-repository.interface.js';

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
  constructor(
    private conversationRepository: ConversationRepositoryInterface,
    private messageRepository: MessageRepositoryInterface,
    private companiesRepository: CompaniesRepository,
    private agentsRepository: AgentsRepository,
  ) {}

  async createConversation(input: CreateConversationData): Promise<ConversationEntity> {
    const companyExists = await this.companiesRepository.existsById(input.company_id);
    if (!companyExists) throw new HttpError(404, `Company '${input.company_id}' not found`);

    // Check if conversation with external_id already exists for this channel
    const existing = await this.conversationRepository.findByExternalId(input.external_id, input.channel_id);
    if (existing) throw new HttpError(409, `Conversation with external_id '${input.external_id}' already exists for this channel`);

    const { company_id, channel_id, external_id, participant_id, participant_meta, participant_type, assigned_agent_id} = input;

    if (assigned_agent_id) {
      const exists = await this.agentsRepository.existsById(assigned_agent_id);
      if (!exists) throw new HttpError(404, `Agent '${assigned_agent_id}' not found`);
    }

    return this.conversationRepository.create({ company_id, channel_id, external_id, participant_id, participant_meta, participant_type, assigned_agent_id});
  }

  async getConversationById(id: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
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

  async listConversations(criteria?: ConversationSearchInput): Promise<ConversationDto[]> {
    const searchCriteria: ConversationSearchCriteria = criteria ?? {};

    const { conversations } = await this.conversationRepository.search(searchCriteria);

    const results: ConversationDto[] = [];
    for (const conv of conversations) {
      let assigned_agent: { id: string; name: string; avatar: string } | undefined;
      const latestMessage: MessageEntity | null = await this.messageRepository.findLatestByConversation(conv.id);
      const participantMeta = (conv.participant_meta as unknown) as Record<string, unknown> | null;

      if (conv.assigned_agent_id) {
        const [agent] = await this.agentsRepository.getAgent(conv.assigned_agent_id);
        if (agent) {
          assigned_agent = {
            name: agent.name,
            id: String(agent.id),
            avatar: agent.character.avatar_url ?? ''
          };
        }
      }

      const dto: ConversationDto = {
        id: conv.id,
        assigned_agent,
        status: conv.status,
        company_id: conv.company_id,
        channel_id: conv.channel_id,
        external_id: conv.external_id,
        updated_at: conv.updated_at.toISOString(),
        created_at: conv.created_at.toISOString(),
        participant: {
          type: conv.participant_type,
          id: conv.participant_id ?? '',
          meta: participantMeta ?? null
        },
        last_message: latestMessage
          ? {
              id: latestMessage.id,
              message: latestMessage.message,
              created_at: latestMessage.timestamp.toISOString()
            }
          : undefined,
      };

      results.push(dto);
    }

    return results;
  }
}
