import { Contact } from '../../domain/entities/conversation.js';
import { MessageEntity } from '../../domain/entities/message.js';
import { AgentMatchingService } from './agent-matching.service.js';
import { WorkflowEngineService } from './workflow-engine.service.js';
import { ConversationEntity } from '../../domain/entities/conversation.js';
import { IntentionClassifierService } from './intention-classifier.service.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';

export class ConversationOrchestratorService {
    constructor(
        private agentMatching: AgentMatchingService,
        private workflowEngine: WorkflowEngineService,
        private intentionClassifier: IntentionClassifierService,
        private emitWebSocketEvent: (event: WebSocketEvent) => void,
        public readonly conversationRepository: ConversationRepositoryInterface,
    ) {}

    /**
     * Procesa un mensaje entrante completo: intención → agente → workflow
    */
    async processIncomingMessage(
        conversation: ConversationEntity,
        message: MessageEntity,
        contact: Contact
    ): Promise<void> {
        // 1. Clasificar intención si no existe
        if (!conversation.intention_id) {
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
            }
        }

        // 2. Asignar agente si no existe y hay intención
        if (conversation.intention_id && !conversation.assigned_agent_id) {
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
            }
        }

        // 3. Procesar workflow si tenemos intención y agente
        if (conversation.intention_id && conversation.assigned_agent_id) {
            await this.workflowEngine.processMessage(conversation, message);
        }
    }
}