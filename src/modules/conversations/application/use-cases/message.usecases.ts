import { MessageDirection, MessageStatus } from '@prisma/client';
import { MessageEntity, CreateMessageData, UpdateMessageData } from '../../domain/entities/message.js';
import { MessageRepositoryInterface, MessageSearchCriteria } from '../../domain/repositories/message-repository.interface.js';

export class MessageUseCases {
  constructor(private messageRepository: MessageRepositoryInterface) {}

  async sendMessage(input: CreateMessageData): Promise<MessageEntity> {
    return this.messageRepository.create(input);
  }

  async getMessageById(id: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }
    return message;
  }

  async getMessagesByConversation(conversation_id: string, search?: Omit<MessageSearchCriteria, 'conversation_id'>): Promise<MessageEntity[]> {
    const criteria: MessageSearchCriteria = {
      conversation_id,
      ...search
    };
    return this.messageRepository.findByConversation(conversation_id, criteria);
  }

  async updateMessage(id: string, input: UpdateMessageData): Promise<MessageEntity> {
    return this.messageRepository.update(id, input);
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
