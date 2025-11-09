import { InputJsonValue } from '@prisma/client/runtime/library';
import { MessageEntity } from '../../domain/entities/message.js';
import { MessageInput } from '../../domain/entities/message.js';
import { FlowRegistryService } from './flow-registry.service.js';
import { StepExecutorService } from './step-executor.service.js';
import { StepContext } from '../../domain/interfaces/workflow.interface.js';
import type { ConversationEntity } from '../../domain/entities/conversation.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';
import { MessageDirection } from '@prisma/client';

/**
 * Estado del workflow persistido por conversación
*/
export interface WorkflowState {
    error?: string;
    agentId?: number;
    lastStepAt?: Date;
    flowName?: string;
    currentStep?: string;
    intentionId?: number;
    completedSteps: string[];
    collectedData: Record<string, unknown>;
    status?: 'running' | 'completed' | 'failed' | 'paused';
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

export class WorkflowEngineService {
    constructor(
        private readonly conversationRepository: ConversationRepositoryInterface,
        private readonly parametersRepository: ParametersRepository,
        private readonly channelRuntime: ChannelRuntimeService,
        private readonly flowRegistry: FlowRegistryService,
        private readonly stepExecutor: StepExecutorService,
    ) {}

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
    ): Promise<void> {
        // Inicializar workflow si no existe
        let state = conversation.workflow_state as WorkflowState | null;
        if (!state) {
            state = await this.initializeWorkflow(conversation);
            if (!state) return;
        }

        // Obtener definición del flujo
        const flow = this.flowRegistry.getFlow(state.flowName!);
        if (!flow) {
            console.error(`Flujo '${state.flowName}' no encontrado para conversación ${conversation.id}`);
            return;
        }

        // Encontrar el paso actual
        const currentStepId = state.currentStep || flow.initialStep;
        const currentStep = flow.steps.find(step => step.id === currentStepId);

        if (!currentStep) {
            console.error(`Paso '${currentStepId}' no encontrado en flujo '${flow.name}'`);
            return;
        }

        // Preparar contexto para el paso
        const context: StepContext = {
            message,
            conversation,
            companyId: conversation.company_id,
            channelId: conversation.channel_id,
            collectedData: state.collectedData || {}
        };

        try {
            // Ejecutar el paso
            const result = await this.stepExecutor.executeStep(currentStep, context);

            // Actualizar estado basado en el resultado
            if (result.completed) {
                // Marcar paso como completado
                await this.completeStep(conversation.id, currentStepId, result.data);

                // Enviar mensaje si el paso lo indica
                if (result.shouldSendMessage && result.message) {
                    await this.sendWorkflowMessage(conversation, result.message);
                }

                // Determinar siguiente paso
                let nextStepId = result.nextStep;

                // Si no hay nextStep definido en el resultado, usar el definido en el paso
                if (!nextStepId) nextStepId = currentStep.nextStep;

                // Si hay un siguiente paso, actualizar estado
                if (nextStepId) {
                    await this.updateWorkflowState(conversation.id, {currentStep: nextStepId});
                } else if (flow.finalStep && currentStepId === flow.finalStep) {
                    // Si no hay siguiente paso y el flujo tiene finalStep, marcar como completado
                    await this.updateWorkflowState(conversation.id, {status: 'completed'});
                }
            } else if (result.error) {
                // Marcar workflow como fallido si hay error crítico
                await this.updateWorkflowState(conversation.id, {
                    status: 'failed',
                    error: result.error
                });
                console.error(`Error en paso '${currentStepId}' del flujo '${flow.name}': ${result.error}`);
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`Error ejecutando paso '${currentStepId}' en flujo '${flow.name}':`, err);

            // Marcar como fallido
            await this.updateWorkflowState(conversation.id, {
                status: 'failed',
                error: err.message
            });
        }
    }

    /**
     * Envía un mensaje generado por un paso del workflow
    */
    private async sendWorkflowMessage(conversation: ConversationEntity, message: string): Promise<void> {
        try {
            const messageInput: MessageInput = {
                from: '', // Se determinará automáticamente por el provider
                message: message,
                content_type: 'chat',
                provider_message_id: '', // Se generará automáticamente por el provider
                to: conversation.contact_id!, // ID del contacto (número de teléfono)
                conversation_id: conversation.id,
                channel_id: conversation.channel_id,
                direction: MessageDirection.outgoing,
            };

            // Enviar mensaje a través del runtime
            const result = await this.channelRuntime.emitMessage(messageInput);

            if (!result.success) {
                console.error(`Error enviando mensaje del workflow: ${result.error}`);
                throw new Error(`Fallo al enviar mensaje del workflow: ${result.error}`);
            }

            console.log(`Mensaje del workflow enviado exitosamente a conversación ${conversation.id}`);

        } catch (error) {
            console.error(`Error crítico enviando mensaje del workflow:`, error);
            throw error; // Re-throw para que el workflow pueda manejar el error
        }
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