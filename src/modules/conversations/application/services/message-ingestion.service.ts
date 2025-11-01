import { getRedisClient } from '@/database/redis.js';
import { MessageDirection, MessageStatus } from '@prisma/client';
import type { MessageEntity } from '@/modules/conversations/domain/entities/message.js';
import type { MessageUseCases } from '@/modules/conversations/application/use-cases/message.usecases.js';
import type { ConversationUseCases } from '@/modules/conversations/application/use-cases/conversation.usecases.js';

export interface IngestIncomingInput {
  channelId: string;
  conversationId: string;
  providerMessageId?: string;
  body: string;
  from?: string;
  to?: string;
  timestamp?: Date;
  metadata?: unknown;
  contentType?: string; // default 'text'
}

export class MessageIngestionService {
  private readonly redis = getRedisClient();
  private readonly idempotencyTtlSeconds: number;
  private readonly maxMetadataBytes: number;

  constructor(
    private readonly messageUseCases: MessageUseCases,
    private readonly conversationUseCases: ConversationUseCases,
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
    const { channelId, conversationId, providerMessageId, body, from, to } = input;
    const contentType = input.contentType ?? 'text';
    const timestamp = input.timestamp ?? new Date();
    const metadata = this.truncateMetadata(input.metadata);

    // Idempotencia (best-effort)
    if (providerMessageId) {
      const key = this.buildIdemKey(channelId, providerMessageId);
      const exists = await this.redis.exists(key);
      if (exists) {
        // Buscar y retornar último mensaje para la conversación como fallback
        const latest = await this.messageUseCases.getLatestMessage(conversationId);
        if (latest) return latest;
      }
    }

    // Persistir mensaje
    const saved = await this.messageUseCases.sendMessage({
      from,
      to,
      message: body,
      payload: undefined,
      metadata,
      direction: MessageDirection.incoming,
      conversation_id: conversationId,
      content_type: contentType
    });

    // Marcar como RECEIVED
    await this.messageUseCases.updateMessageStatus(saved.id, MessageStatus.RECEIVED);

    // Actualizar last_message_at
    await this.conversationUseCases.updateLastMessage(conversationId, timestamp);

    // Set idempotencia
    if (providerMessageId) {
      const key = this.buildIdemKey(channelId, providerMessageId);
      await this.redis.setEx(key, this.idempotencyTtlSeconds, '1');
    }

    return saved;
  }
}


