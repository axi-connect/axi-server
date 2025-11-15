import { MessageDirection } from '@prisma/client';
import { MessageIngestionService } from './message-ingestion.service.js';
import { ConversationResolver } from './conversation-resolver.service.js';
import { MessageEntity, MessageInput } from '../../domain/entities/message.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { ConversationOrchestratorService } from './conversation-orchestrator.service.js';
import { ConversationEntity, MessageHandlerData } from '../../domain/entities/conversation.js';
import { ConversationalFirewallService } from './conversational-firewall.service.js';
import { FirewallConfig } from '../../domain/interfaces/firewall.interface.js';

export class MessageRoutingService {
    private emitWebSocketEvent?: (event: WebSocketEvent) => void;
    private firewall?: ConversationalFirewallService;

    constructor(
        private messageIngestion: MessageIngestionService,
        private conversationResolver: ConversationResolver,
        private conversationOrchestrator?: ConversationOrchestratorService,
        firewallConfig?: FirewallConfig
    ) {
        // Inicializar firewall si se proporciona configuración
        if (firewallConfig) {
            this.firewall = new ConversationalFirewallService(firewallConfig);
        }
    }

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
            console.log('🔥 Verificando firewall para mensaje entrante');

            // 🛡️ PASO 1: Verificar firewall antes de procesar
            if (this.firewall) {
                const firewallResult = await this.firewall.checkMessage(contact.id!, message.message || '');

                if (!firewallResult.allowed) {
                    console.log(`🚫 Mensaje bloqueado por firewall: ${firewallResult.blockedReason}`);

                    // Crear mensaje de respuesta automática para usuario bloqueado
                    const blockedMessage: MessageInput = {
                        from: '', // Se determinará por el provider
                        message: firewallResult.blockedReason || '🤖 Mensaje temporalmente bloqueado por medidas de seguridad.',
                        content_type: 'chat',
                        provider_message_id: '',
                        to: contact.id!,
                        conversation_id: conversation?.id || '',
                        channel_id: channelId,
                        direction: MessageDirection.outgoing
                    };

                    // Enviar mensaje de bloqueo directamente (sin pasar por ingestion/orchestrator)
                    // Esto requiere acceso al channel runtime, pero por ahora emitimos el evento
                    this.emit({
                        channelId,
                        data: {
                            id: 'firewall-block',
                            message: blockedMessage.message,
                            direction: MessageDirection.outgoing,
                            content_type: 'chat',
                            created_at: new Date(),
                            updated_at: new Date()
                        } as MessageEntity,
                        event: 'message.blocked',
                        companyId: contact.company_id,
                        timestamp: new Date()
                    });

                    // Aún guardamos el mensaje original para registro
                    const savedMessage = await this.messageIngestion.ingest(message);

                    // Emitir evento de firewall block
                    this.emit({
                        channelId,
                        data: {
                            contactId: contact.id,
                            violations: firewallResult.violations,
                            riskScore: firewallResult.riskScore,
                            cooldownSeconds: firewallResult.cooldownSeconds
                        },
                        event: 'firewall.blocked',
                        companyId: contact.company_id,
                        timestamp: new Date()
                    });

                    return savedMessage;
                }

                console.log('✅ Mensaje aprobado por firewall, procesando normalmente');
            }

            // 🟢 PASO 2: Procesar mensaje normalmente si pasa el firewall
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

            console.log(`📨 Mensaje procesado exitosamente en canal ${channelId}`);
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
