import { MessageDirection, MessageStatus } from '@prisma/client';
import { MessageEntity, CreateMessageData, UpdateMessageData } from '../../domain/entities/message.js';
import { MessageRepositoryInterface, MessageSearchCriteria } from '../../domain/repositories/message-repository.interface.js';

export interface CreateMessageInput {
  from?: string;
  to?: string;
  message: string;
  payload?: any;
  metadata?: any;
  direction: MessageDirection;
  conversation_id: string;
  content_type: string;
}

export interface UpdateMessageInput {
  status?: MessageStatus;
  metadata?: any;
}

export interface MessageSearchInput {
  conversation_id?: string;
  direction?: MessageDirection;
  status?: MessageStatus;
  content_type?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'created_at';
  sortDir?: 'asc' | 'desc';
}

export class MessageUseCases {
  constructor(private messageRepository: MessageRepositoryInterface) {}

  async sendMessage(input: CreateMessageInput): Promise<MessageEntity> {
    const messageData: CreateMessageData = {
      from: input.from,
      to: input.to,
      message: input.message,
      payload: input.payload,
      metadata: input.metadata,
      direction: input.direction,
      conversation_id: input.conversation_id,
      content_type: input.content_type
    };

    return this.messageRepository.create(messageData);
  }

  async getMessageById(id: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }
    return message;
  }

  async getMessagesByConversation(conversation_id: string, search?: Omit<MessageSearchInput, 'conversation_id'>): Promise<MessageEntity[]> {
    const criteria: MessageSearchCriteria = {
      conversation_id,
      ...search
    };
    return this.messageRepository.findByConversation(conversation_id, criteria);
  }

  async updateMessage(id: string, input: UpdateMessageInput): Promise<MessageEntity> {
    const updateData: UpdateMessageData = {
      status: input.status,
      metadata: input.metadata
    };

    return this.messageRepository.update(id, updateData);
  }

  async updateMessageStatus(id: string, status: MessageStatus): Promise<MessageEntity> {
    return this.messageRepository.updateStatus(id, status);
  }

  async getLatestMessage(conversation_id: string): Promise<MessageEntity | null> {
    return this.messageRepository.findLatestByConversation(conversation_id);
  }

  async countMessages(conversation_id: string): Promise<number> {
    return this.messageRepository.countByConversation(conversation_id);
  }
}
