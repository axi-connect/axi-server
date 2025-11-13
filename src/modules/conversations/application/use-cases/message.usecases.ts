import { MessageStatus } from '@prisma/client';
import { HttpError } from '@/shared/errors/http.error.js';
import type { MessageInput, MessageEntity } from '../../domain/entities/message.js';
import type { ProviderResponse } from '@/modules/channels/infrastructure/providers/BaseProvider.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';
import { MessageRepositoryInterface, MessageSearchCriteria } from '../../domain/repositories/message-repository.interface.js';

export class MessageUseCases {
  constructor(
    private channelRuntimeService: ChannelRuntimeService,
    private messageRepository: MessageRepositoryInterface,
  ) {}

  /**
   * Envía un mensaje a través del runtime
   * @param input - Datos del mensaje
   * @returns Mensaje creado
  */
  async sendMessage(input: MessageInput): Promise<ProviderResponse> {
    return await this.channelRuntimeService.emitMessage(input);
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