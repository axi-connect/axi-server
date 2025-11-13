import { MessageDirection } from '@prisma/client';
import { MessageIngestionService } from './message-ingestion.service.js';
import { ConversationResolver } from './conversation-resolver.service.js';
import { MessageEntity, MessageInput } from '../../domain/entities/message.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { ConversationOrchestratorService } from './conversation-orchestrator.service.js';
import { ConversationEntity, MessageHandlerData } from '../../domain/entities/conversation.js';

export class MessageRoutingService {
    private emitWebSocketEvent?: (event: WebSocketEvent) => void;

    constructor(
        private messageIngestion: MessageIngestionService,
        private conversationResolver: ConversationResolver,
        private conversationOrchestrator?: ConversationOrchestratorService
    ) {}

    public async messageRouter(channelId: string, { message, contact }: MessageHandlerData<MessageInput>): Promise<void> {
        // Resolver/crear conversación si el servicio está disponible
        let conversation: ConversationEntity | undefined = undefined;
        if (this.conversationResolver) {
            if (contact.id) {
                conversation = await this.conversationResolver.resolve({channelId, contact});
            }
        }

        if (!conversation || !this.messageIngestion) throw new Error(`Error resolviendo conversación en canal ${channelId}`);
        message.conversation_id = conversation.id;

        message.direction === MessageDirection.incoming
        ? this.handleIncomingMessage(channelId, { message, contact, conversation })
        : this.handleOutgoingMessage(channelId, message, contact.company_id);
    }

    public async handleIncomingMessage(channelId: string, { message, contact, conversation }: MessageHandlerData<MessageInput>): Promise<MessageEntity> {
        try {
            console.log('Handling incoming message', message.direction);
            const savedMessage = await this.messageIngestion.ingest(message);

            // Emitir evento de mensaje recibido
            this.emit({
                channelId,
                data: savedMessage,
                event: 'message.received',
                companyId: contact.company_id,
                timestamp: new Date()
            });

            // Coordinar intención → agente → workflow
            if (this.conversationOrchestrator) {
                console.log('Processing incoming message', conversation?.id);
                await this.conversationOrchestrator.processIncomingMessage({ conversation, message: savedMessage, contact });
            }

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

            this.emit({
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

    /**
     * Configura el callback para emitir eventos WebSocket
    */
    setWebSocketEventEmitter(emitter: (event: WebSocketEvent) => void): void {
        this.emitWebSocketEvent = emitter;
    }

    private emit(event: WebSocketEvent): void {
        if (this.emitWebSocketEvent) this.emitWebSocketEvent(event);
    }
}
