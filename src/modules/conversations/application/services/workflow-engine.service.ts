import { getRedisClient } from '@/database/redis.js';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { MessageEntity } from '../../domain/entities/message.js';
import type { ConversationEntity } from '../../domain/entities/conversation.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { MessageRepositoryInterface } from '../../domain/repositories/message-repository.interface.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';

/**
 * Estado del workflow persistido por conversación
*/
export interface WorkflowState {
    agentId?: number;
    lastStepAt?: Date;
    flowName?: string;
    currentStep?: string;
    intentionId?: number;
    completedSteps: string[];
    collectedData: Record<string, unknown>;
}

/**
 * Resultado de ejecutar un paso del workflow
*/
export interface WorkflowStepResult {
    step: string;
    message?: string;
    nextStep?: string;
    completed: boolean;
    data?: Record<string, unknown>;
}

type WorkflowEngineOptions = {
    cacheTtlSeconds?: number;
};

export class WorkflowEngineService {
    private readonly redis = getRedisClient();
    private readonly cacheTtlSeconds: number;

    constructor(
        private readonly conversationRepository: ConversationRepositoryInterface,
        private readonly messageRepository: MessageRepositoryInterface,
        private readonly parametersRepository: ParametersRepository,
        private readonly agentsRepository: AgentsRepository,
        private readonly channelRuntime: ChannelRuntimeService,
        options?: WorkflowEngineOptions
    ) {
        this.cacheTtlSeconds = options?.cacheTtlSeconds ?? 5 * 60; // 5 min
    }

    /**
     * Obtiene el estado del workflow de una conversación
    */
    async getWorkflowState(conversationId: string): Promise<WorkflowState | null> {
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation || !conversation.workflow_state) return null;

        try {
            const state = conversation.workflow_state as WorkflowState;
            return {
                agentId: state.agentId,
                flowName: state.flowName,
                currentStep: state.currentStep,
                intentionId: state.intentionId,
                collectedData: state.collectedData || {},
                lastStepAt: state.lastStepAt ? new Date(state.lastStepAt) : undefined,
                completedSteps: Array.isArray(state.completedSteps) ? state.completedSteps : [],
            };
        } catch {
            return null;
        }
    }

    /**
     * Inicializa el workflow para una conversación si no existe
    */
    async initializeWorkflow(conversation: ConversationEntity): Promise<WorkflowState | null> {
        // Si ya tiene estado, no reinicializar
        if (conversation.workflow_state) return conversation.workflow_state as WorkflowState;

        // Requiere intención y agente asignado
        if (!conversation.intention_id || !conversation.assigned_agent_id) return null;

        // Obtener intención y agente para determinar el flow
        const intentions = await this.parametersRepository.getIntention([conversation.intention_id])

        const {flow_name} = intentions[0];
        if (!flow_name) return null;

        const initialState: WorkflowState = {
            collectedData: {},
            completedSteps: [],
            flowName: flow_name,
            currentStep: 'start',
            lastStepAt: new Date(),
            intentionId: conversation.intention_id,
            agentId: conversation.assigned_agent_id
        };

        // Persistir estado inicial
        await this.conversationRepository.update(conversation.id, {
            workflow_state: initialState as unknown as InputJsonValue
        });

        return initialState;
    }

    /**
     * Actualiza el estado del workflow
    */
    async updateWorkflowState(
        conversationId: string,
        updates: Partial<WorkflowState>
    ): Promise<WorkflowState | null> {
        const current = await this.getWorkflowState(conversationId);
        if (!current) return null;

        const updated: WorkflowState = {
            ...current,
            ...updates,
            lastStepAt: new Date()
        };

        await this.conversationRepository.update(conversationId, {
            workflow_state: updated as unknown as InputJsonValue
        });

        return updated;
    }

    /**
     * Marca un paso como completado y avanza al siguiente
    */
    async completeStep(
        conversationId: string,
        step: string,
        data?: Record<string, unknown>
    ): Promise<WorkflowState | null> {
        const current = await this.getWorkflowState(conversationId);
        if (!current) return null;

        // Evitar repetir pasos ya completados
        if (current.completedSteps.includes(step)) return current;

        const updated: WorkflowState = {
            ...current,
            completedSteps: [...current.completedSteps, step],
            collectedData: { ...current.collectedData, ...(data || {}) },
            lastStepAt: new Date()
        };

        await this.conversationRepository.update(conversationId, {
            workflow_state: updated as unknown as InputJsonValue
        });

        return updated;
    }

    /**
     * Procesa un mensaje y avanza el workflow si corresponde
    */
    async processMessage(
        conversation: ConversationEntity,
        message: MessageEntity
    ): Promise<WorkflowStepResult | null> {
        // Inicializar workflow si no existe
        let state = conversation.workflow_state as WorkflowState | null;
        if (!state) {
            state = await this.initializeWorkflow(conversation);
            if (!state) return null;
        }

        // Obtener historial reciente para contexto
        // const history = await this.messageRepository.findByConversation({
        //     limit: 10,
        //     sortDir: 'desc',
        //     sortBy: 'timestamp',
        //     conversation_id: conversationId,
        // });

        // Determinar si debemos avanzar el workflow
        // Por ahora, simplemente marcamos que se recibió un mensaje
        // La lógica específica del workflow se ejecutará en otro lugar
        const result: WorkflowStepResult = {
            completed: false,
            step: state.currentStep || 'start',
            data: {
                messageId: message.id,
                messageText: message.message,
                timestamp: message.timestamp
            }
        };

        return result;
    }

    /**
     * Verifica si un paso ya fue completado
    */
    async isStepCompleted(conversationId: string, step: string): Promise<boolean> {
        const state = await this.getWorkflowState(conversationId);
        return state?.completedSteps.includes(step) ?? false;
    }

    /**
     * Resetea el workflow (útil para reiniciar o cambiar de intención)
    */
    async resetWorkflow(conversationId: string): Promise<void> {
        await this.conversationRepository.update(conversationId, {
            workflow_state: undefined
        });
    }
}