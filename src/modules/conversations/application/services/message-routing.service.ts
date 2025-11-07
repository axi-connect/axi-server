import { MessageDirection } from '@prisma/client';
import { MessageIngestionService } from './message-ingestion.service.js';
import { ConversationResolver } from './conversation-resolver.service.js';
import { MessageEntity, MessageInput } from '../../domain/entities/message.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { MessageHandlerData } from '@/modules/channels/infrastructure/providers/BaseProvider.js';

export class MessageRoutingService {
    constructor(
        private messageIngestion: MessageIngestionService,
        private conversationResolver: ConversationResolver,
        private emitWebSocketEvent: (event: WebSocketEvent) => void
    ) {}

    public async messageRouter(channelId: string, { message, contact }: MessageHandlerData): Promise<void> {
        // Resolver/crear conversación si el servicio está disponible
        let conversation_id: string | undefined = undefined;
        if (this.conversationResolver) {
            if (contact.id) {
                const conv = await this.conversationResolver.resolve({channelId, contact});
                conversation_id = conv.id;
            }
        }

        if (!conversation_id || !this.messageIngestion) throw new Error(`Error resolviendo conversación en canal ${channelId}`);
        message.conversation_id = conversation_id;

        message.direction === MessageDirection.incoming
        ? this.handleIncomingMessage(channelId, { message, contact })
        : this.handleOutgoingMessage(channelId, message, contact.company_id);
    }

    public async handleIncomingMessage(channelId: string, { message, contact }: MessageHandlerData): Promise<MessageEntity> {
        try {
            const savedMessage = await this.messageIngestion.ingest(message);

            // Emitir evento WebSocket
            this.emitWebSocketEvent({
                channelId,
                data: savedMessage,
                event: 'message.received',
                companyId: contact.company_id,
                timestamp: new Date()
            });

            console.log(`📨 Mensaje recibido en canal ${channelId}`);

            return savedMessage;
        } catch (error) {
            console.error(`❌ Error procesando mensaje en canal ${channelId}:`, error);
            throw error;
        }
    }

    public async handleOutgoingMessage(channelId: string, message: MessageInput, companyId: number): Promise<MessageEntity> {
        try {
            const savedMessage = await this.messageIngestion.ingest(message);

            this.emitWebSocketEvent({
                channelId,
                data: savedMessage,
                event: 'message.sent',
                timestamp: new Date(),
                companyId: companyId,
            });

            return savedMessage;
        } catch (error) {
            console.error(`❌ Error procesando mensaje en canal ${channelId}:`, error);
            throw error;
        }
    }
}
