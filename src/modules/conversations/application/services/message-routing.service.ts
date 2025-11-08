import { MessageDirection } from '@prisma/client';
import { MessageIngestionService } from './message-ingestion.service.js';
import { ConversationResolver } from './conversation-resolver.service.js';
import { MessageEntity, MessageInput } from '../../domain/entities/message.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { MessageHandlerData } from '@/modules/channels/infrastructure/providers/BaseProvider.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';
import { IntentionClassifierService } from './intention-classifier.service.js';

export class MessageRoutingService {
    constructor(
        private messageIngestion: MessageIngestionService,
        private conversationResolver: ConversationResolver,
        private emitWebSocketEvent: (event: WebSocketEvent) => void,
        private conversationRepository?: ConversationRepositoryInterface,
        private intentionClassifier?: IntentionClassifierService
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

            // Clasificar intención si no existe aún (con cache y fallback IA)
            if (this.conversationRepository && this.intentionClassifier) {
                const conversation = await this.conversationRepository.findById(message.conversation_id);
                if (conversation && !conversation.intention_id) {
                    const choice = await this.intentionClassifier.classifyConversation(conversation.id);
                    if (choice) {
                        await this.conversationRepository.update(conversation.id, { intention_id: choice.intentionId });
                        // Emitir evento de intención detectada
                        this.emitWebSocketEvent({
                            channelId,
                            event: 'intent.detected',
                            companyId: contact.company_id,
                            timestamp: new Date(),
                            data: {
                                conversation_id: conversation.id,
                                intention_id: choice.intentionId,
                                code: choice.code,
                                confidence: choice.confidence
                            }
                        } as WebSocketEvent<'intent.detected'>);
                    }
                }
            }

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
