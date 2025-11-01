import { ContactType } from '@prisma/client';
import { getRedisClient } from '@/database/redis.js';
import type { ChannelRepositoryInterface } from '@/modules/channels/domain/repositories/channel-repository.interface.js';
import type { Contact, ConversationEntity, CreateConversationData } from '@/modules/conversations/domain/entities/conversation.js';
import type { ConversationRepositoryInterface } from '@/modules/conversations/domain/repositories/conversation-repository.interface.js';
import { InputJsonValue } from '@prisma/client/runtime/library';

export type ParticipantMeta = {
  name?: string;
  phone?: string | null;
  avatar?: string | null;
};

export class ConversationResolver {
  private readonly redis = getRedisClient();

    constructor(
        private readonly conversationRepository: ConversationRepositoryInterface,
        private readonly channelRepository: ChannelRepositoryInterface,
        private readonly cacheTtlSeconds: number = 60 * 60 * 24 // 24h
    ) {}

    private buildCacheKey(channelId: string, participantId: string): string {
        return `conv:map:${channelId}:${participantId}`;
    }

    /**
     * Resuelve (o crea) una conversación para un participante en un canal.
     * - Usa Redis como caché primaria (24h)
     * - Fallback a base de datos y crea si no existe
    */
    async resolve(params: {
        channelId: string;
        contact: Contact;
    }): Promise<ConversationEntity> {
        const { channelId, contact } = params;

        // 1) Cache lookup
        const cacheKey = this.buildCacheKey(channelId, contact.id);
        const cachedId = await this.redis.get(cacheKey);
        if (cachedId) {
            const found = await this.conversationRepository.findById(cachedId);
            if (found) return found;
        }

        // 2) DB lookup by (participant_id, channel)
        const existing = await this.conversationRepository.findByContact(contact.id, channelId);
        if (existing.length > 0) {
            const conversation = existing[0];
            await this.redis.setEx(cacheKey, this.cacheTtlSeconds, conversation.id);
            return conversation;
        }

        // 3) Create new conversation
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) throw new Error(`Canal ${channelId} no encontrado para crear conversación`);

        const conversationData: CreateConversationData = {
            channel_id: channelId,
            // Usar el uuid de WhatsApp como external_id por defecto para idempotencia por canal
            contact_id: contact.id,
            external_id: contact.id,
            company_id: channel.company_id,
            contact_type: ContactType.prospect,
            contact_meta: contact as unknown as InputJsonValue
        };

        const created = await this.conversationRepository.create(conversationData);

        // 4) Cache write
        await this.redis.setEx(cacheKey, this.cacheTtlSeconds, created.id);

        return created;
    }
}