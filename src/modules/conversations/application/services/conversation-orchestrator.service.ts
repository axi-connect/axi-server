import { MessageEntity } from '../../domain/entities/message.js';
import { AgentMatchingService } from './agent-matching.service.js';
import { WorkflowEngineService } from './workflow-engine.service.js';
import { MessageHandlerData } from '../../domain/entities/conversation.js';
import { IntentionClassifierService } from './intention-classifier.service.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';

export class ConversationOrchestratorService {
    constructor(
        private agentMatching: AgentMatchingService,
        private workflowEngine: WorkflowEngineService,
        private intentionClassifier: IntentionClassifierService,
        private channelRuntime: ChannelRuntimeService,
        private emitWebSocketEvent: (event: WebSocketEvent) => void,
        public readonly conversationRepository: ConversationRepositoryInterface,
    ) {}

    /**
     * Procesa un mensaje entrante completo: intención → agente → workflow
     * Incluye indicadores de escritura (typing) para experiencia más humana
    */
    async processIncomingMessage({ conversation, message, contact }: MessageHandlerData<MessageEntity>): Promise<void> {
        if (!conversation) throw new Error('Conversation not found');

        // Activar typing mientras procesa (experiencia más humana)
        await this.channelRuntime.sendTyping(conversation.channel_id, contact.id);

        try {
            // 1. Clasificar intención si no existe
            if (!conversation.intention_id) {
                console.log(`🤖 Clasificando intención para conversación ${conversation.id}`);
                const choice = await this.intentionClassifier.classifyConversation(conversation.id);

                if (choice) {
                    conversation.intention_id = choice.intentionId;
                    await this.conversationRepository.update(conversation.id, { intention_id: choice.intentionId });

                    this.emitWebSocketEvent?.({
                        channelId: conversation.channel_id,
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

                    console.log(`✅ Intención clasificada: ${choice.code} (${choice.confidence})`);
                }
            }

            // 2. Asignar agente si no existe y hay intención
            if (conversation.intention_id && !conversation.assigned_agent_id) {
                console.log(`👤 Asignando agente para conversación ${conversation.id} (intención: ${conversation.intention_id})`);

                const assignedAgentId = await this.agentMatching.assignIfNeeded(conversation, conversation.intention_id);

                if (assignedAgentId) {
                    conversation.assigned_agent_id = assignedAgentId;

                    this.emitWebSocketEvent?.({
                        channelId: conversation.channel_id,
                        event: 'agent.assigned',
                        companyId: contact.company_id,
                        timestamp: new Date(),
                        data: {
                            conversation_id: conversation.id,
                            agent_id: assignedAgentId
                        }
                    } as WebSocketEvent<'agent.assigned'>);

                    console.log(`✅ Agente asignado: ${assignedAgentId}`);
                }
            }

            // 3. Procesar workflow si tenemos intención y agente
            if (conversation.intention_id && conversation.assigned_agent_id) {
                console.log(`🔄 Procesando workflow para conversación ${conversation.id}`);
                await this.workflowEngine.processMessage({ conversation, message, contact });
            }

        } catch (error) {
            console.error('Error en processIncomingMessage:', error);
            throw error;
        } finally {
            // Siempre limpiar typing después de enviar mensaje
            await this.channelRuntime.clearTyping(conversation.channel_id, conversation.contact_id!);
        }
    }
}