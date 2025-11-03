import { ContactType } from '@prisma/client';
import { HttpError } from '@/shared/errors/http.error.js';
import type { MessageEntity } from '@/modules/conversations/domain/entities/message.js';
import type { Contact, ConversationDto } from '@/modules/conversations/domain/entities/conversation.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import type { CompaniesRepository } from '@/modules/identities/companies/infrastructure/companies.repository.js';
import { ChannelRepositoryInterface } from '@/modules/channels/domain/repositories/channel-repository.interface.js';
import { MessageRepositoryInterface } from '@/modules/conversations/domain/repositories/message-repository.interface.js';
import type { ConversationEntity, CreateConversationData, UpdateConversationData } from '@/modules/conversations/domain/entities/conversation.js';
import type { ConversationRepositoryInterface, ConversationSearchCriteria } from '@/modules/conversations/domain/repositories/conversation-repository.interface.js';

export interface UpdateConversationInput {
  status?: string;
  assigned_agent_id?: number;
  contact_meta?: any;
}

export class ConversationUseCases {
  constructor(
    private conversationRepository: ConversationRepositoryInterface,
    private messageRepository: MessageRepositoryInterface,
    private companiesRepository: CompaniesRepository,
    private agentsRepository: AgentsRepository,
    private channelRepository: ChannelRepositoryInterface,
  ) {}

  async createConversation(input: CreateConversationData): Promise<ConversationEntity> {
    const companyExists = await this.companiesRepository.existsById(input.company_id);
    if (!companyExists) throw new HttpError(404, `Company '${input.company_id}' not found`);

    // Check if conversation with external_id already exists for this channel
    const existing = await this.conversationRepository.findByExternalId(input.external_id, input.channel_id);
    if (existing) throw new HttpError(409, `Conversation with external_id '${input.external_id}' already exists for this channel`);

    const { company_id, channel_id, external_id, contact_id, contact_meta, contact_type, assigned_agent_id} = input;

    if(channel_id){
      const channel = await this.channelRepository.findById(channel_id);
      if (!channel) throw new HttpError(404, `Channel '${channel_id}' not found`);
    }

    if (assigned_agent_id) {
      const exists = await this.agentsRepository.existsById(assigned_agent_id);
      if (!exists) throw new HttpError(404, `Agent '${assigned_agent_id}' not found`);
    }

    return this.conversationRepository.create({ company_id, channel_id, external_id, contact_id, contact_meta, contact_type, assigned_agent_id});
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

  async listConversations(criteria: ConversationSearchCriteria): Promise<ConversationDto[]> {
    const { conversations } = await this.conversationRepository.search(criteria);

    const results: ConversationDto[] = [];
    for (const conv of conversations) {
      let assigned_agent: { id: string; name: string; avatar: string } | undefined;
      const latestMessage: MessageEntity | null = await this.messageRepository.findLatestByConversation(conv.id);
      const contactMeta = conv.contact_meta as unknown as Contact;

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

      const { name, number, profile_pic_url, meta, id: contact_id } = contactMeta;

      const dto: ConversationDto = {
        id: conv.id,
        assigned_agent,
        status: conv.status,
        company_id: conv.company_id,
        channel_id: conv.channel_id,
        external_id: conv.external_id,
        updated_at: conv.updated_at.toISOString(),
        created_at: conv.created_at.toISOString(),
        contact: {
          meta,
          name,
          number,
          id: contact_id,
          profile_pic_url,
          type: conv.contact_type,
          company_id: conv.company_id,
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

  async updateConversation(id: string, input: UpdateConversationInput): Promise<ConversationEntity> {
    const updateData: UpdateConversationData = {
      status: input.status,
      assigned_agent_id: input.assigned_agent_id,
      contact_meta: input.contact_meta
    };

    return this.conversationRepository.update(id, updateData);
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversationRepository.delete(id);
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
