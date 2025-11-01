import { MessageStatus } from '@prisma/client';
import { HttpError } from '@/shared/errors/http.error.js';
import { MessageEntity, CreateMessageData } from '../../domain/entities/message.js';
import { MessageRepositoryInterface, MessageSearchCriteria } from '../../domain/repositories/message-repository.interface.js';

export class MessageUseCases {
  constructor(private messageRepository: MessageRepositoryInterface) {}

  async sendMessage(input: CreateMessageData): Promise<MessageEntity> {
    return this.messageRepository.create(input);
  }

  async getMessageById(id: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(id);
    if (!message) throw new HttpError(404, 'Message not found');
    return message;
  }

  async getMessagesByConversation(search: MessageSearchCriteria): Promise<MessageEntity[]> {
    return this.messageRepository.findByConversation(search);
  }

  async updateMessageStatus(id: string, status: MessageStatus): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(id);
    if (!message) throw new HttpError(404, 'Message not found');
    if (message.status === status) throw new HttpError(400, 'Message already has this status');
    return this.messageRepository.update(id, { status });
  }
}