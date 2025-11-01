import { getRedisClient } from '@/database/redis.js';
import { MessageDirection, MessageStatus } from '@prisma/client';
import type { MessageEntity } from '@/modules/conversations/domain/entities/message.js';
import type { CreateMessageData } from '@/modules/conversations/domain/entities/message.js';
import type { MessageRepositoryInterface } from '@/modules/conversations/domain/repositories/message-repository.interface.js';
import type { ConversationRepositoryInterface } from '@/modules/conversations/domain/repositories/conversation-repository.interface.js';

export interface IngestIncomingInput extends Omit<CreateMessageData, 'direction' | 'status'> {
  channel_id: string;
  provider_message_id: string;
}

export class MessageIngestionService {
  private readonly redis = getRedisClient();
  private readonly maxMetadataBytes: number;
  private readonly idempotencyTtlSeconds: number;

  constructor(
    private readonly messageRepository: MessageRepositoryInterface,
    private readonly conversationRepository: ConversationRepositoryInterface,
    options?: { idempotencyTtlSeconds?: number; maxMetadataBytes?: number }
  ) {
    this.idempotencyTtlSeconds = options?.idempotencyTtlSeconds ?? 15 * 60; // 15 min
    this.maxMetadataBytes = options?.maxMetadataBytes ?? 32 * 1024; // 32KB
  }

  private buildIdemKey(channelId: string, providerMessageId: string): string {
    return `msg:idem:${channelId}:${providerMessageId}`;
  }

  private truncateMetadata(metadata: unknown): unknown {
    try {
      const serialized = JSON.stringify(metadata);
      if (serialized.length <= this.maxMetadataBytes) return metadata;
      // Truncar de forma segura conservando estructura básica
      const slice = serialized.slice(0, this.maxMetadataBytes - 3) + '...';
      return { truncated: true, data: slice };
    } catch {
      return null;
    }
  }

  async ingestIncoming(input: IngestIncomingInput): Promise<MessageEntity> {
    const { channel_id, content_type, conversation_id, provider_message_id, message, from, to, payload } = input;
    const metadata = this.truncateMetadata(input.metadata);

    // Idempotencia (best-effort)
    const key = this.buildIdemKey(channel_id, provider_message_id);
    const exists = await this.redis.exists(key);
    if (exists) {
      // Buscar y retornar último mensaje para la conversación como fallback
      const latest = await this.messageRepository.findLatestByConversation(conversation_id);
      if (latest) return latest;
    }

    // Persistir mensaje
    const saved = await this.messageRepository.create({
      to,
      from,
      message,
      payload,
      metadata,
      content_type,
      conversation_id,
      status: MessageStatus.RECEIVED,
      direction: MessageDirection.incoming,
    });

    // Actualizar last_message_at
    await this.conversationRepository.updateLastMessage(conversation_id, saved.timestamp);

    // Set idempotencia
    await this.redis.setEx(key, this.idempotencyTtlSeconds, '1');

    return saved;
  }
}