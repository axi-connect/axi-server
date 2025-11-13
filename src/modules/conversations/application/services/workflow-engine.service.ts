import { MessageDirection } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { MessageEntity } from '../../domain/entities/message.js';
import { MessageInput } from '../../domain/entities/message.js';
import { FlowRegistryService } from './flow-registry.service.js';
import { StepExecutorService } from './step-executor.service.js';
import type { ConversationEntity, MessageHandlerData } from '../../domain/entities/conversation.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';
import { StepContext, StepDefinition, StepResult, FlowDefinition } from '../../domain/interfaces/workflow.interface.js';

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
        private readonly channelRuntimeService: ChannelRuntimeService,
        private readonly flowRegistry: FlowRegistryService,
        private readonly stepExecutor: StepExecutorService,
    ) {}

    /**
     * Inicializa el workflow para una conversación si no existe
    */
    async initializeWorkflow(conversation: ConversationEntity): Promise<WorkflowState | null> {
        // Si ya tiene estado, no reinicializar
        if (conversation.workflow_state) return conversation.workflow_state as WorkflowState;

        // Requiere intención y agente asignado
        if (!conversation.intention_id || !conversation.assigned_agent_id) return null;

        // Obtener intención para determinar el flow
        const intentions = await this.parametersRepository.getIntention([conversation.intention_id]);
     
        const {flow_name} = intentions[0];
        if (!flow_name) return null;
     
        const initialState: WorkflowState = {
            collectedData: {},
            completedSteps: [],
            flowName: flow_name,
            lastStepAt: new Date(),
            intentionId: conversation.intention_id,
            agentId: conversation.assigned_agent_id
        };
     
        // Persistir estado inicial
        conversation.workflow_state = initialState;
        await this.updateWorkflowState(conversation, initialState);
        return initialState;
    }

    /**
     * Actualiza el estado del workflow
    */
    async updateWorkflowState(
        conversation: ConversationEntity,
        updates: Partial<WorkflowState>
    ): Promise<WorkflowState | null> {
        const current = conversation.workflow_state;
        if (!current) return null;

        const updated: WorkflowState = {
            ...current,
            ...updates,
            lastStepAt: new Date()
        };

        await this.conversationRepository.update(conversation.id, {
            workflow_state: updated as unknown as InputJsonValue
        });

        return updated;
    }

    /**
     * Marca un paso como completado y avanza al siguiente
    */
    async completeStep(
        conversation: ConversationEntity,
        step: StepDefinition,
        result: StepResult
    ): Promise<WorkflowState | null> {
        const current = conversation.workflow_state;
        if (!current) return null;

        // Evitar repetir pasos ya completados
        // if (current.completedSteps.includes(step.id)) throw new Error('Paso ya completado');

        // Determinar siguiente paso
        let nextStepId = result.nextStep;

        // Si no hay nextStep definido en el resultado, usar el definido en el paso
        if (!nextStepId) nextStepId = step.nextStep;

        const updated: WorkflowState = {
            ...current,
            lastStepAt: new Date(),
            currentStep: nextStepId,
            completedSteps: [...current.completedSteps, step.id],
            collectedData: { ...current.collectedData, ...(result.data || {}) }
        };

        return this.updateWorkflowState(conversation, updated);
    }

    /**
     * Procesa un mensaje y avanza el workflow si corresponde
    */
    async processMessage(
        { conversation, message }: MessageHandlerData<MessageEntity>
    ): Promise<void> {
        if (!conversation) throw new Error('Conversation not found');
        // Inicializar workflow si no existe
        let state = conversation.workflow_state as WorkflowState | null;
        if (!state) {
            state = await this.initializeWorkflow(conversation);
            if (!state) return;
        }

        await this.switchToFlow(conversation, message);
    }

    /**
     * Ejecuta un paso y maneja el avance automático si corresponde
    */
    private async executeStep(
        conversation: ConversationEntity,
        message: MessageEntity,
        flow: FlowDefinition,
        currentStep: StepDefinition,
        workflowState: WorkflowState
    ): Promise<void> {
        const currentStepId = currentStep.id;

        // Preparar contexto para el paso
        const context: StepContext = {
            message,
            conversation,
            companyId: conversation.company_id,
            channelId: conversation.channel_id,
            collectedData: workflowState.collectedData || {}
        };

        console.log('📚 Collected data:', context.collectedData);

        // Ejecutar el paso
        const result = await this.stepExecutor.executeStep(currentStep, context);

        // Actualizar estado basado en el resultado
        if (result.completed) {
            // Si el flujo tiene finalStep y estamos en el paso final, marcar como completado
            if (flow.finalStep && currentStepId === flow.finalStep) {
                conversation.workflow_state!.status = 'completed';
            }

            // Marcar paso como completado
            const state = await this.completeStep(conversation, currentStep, result);
            if (!state) throw new Error('Error al marcar paso como completado');
            conversation.workflow_state = state;

            // Enviar mensaje si el paso lo indica
            if (result.shouldSendMessage && result.message) {
                await this.sendWorkflowMessage(conversation, result.message);
            }

            // Verificar si el paso debe avanzar automáticamente
            const shouldAutoAdvance = this.shouldAutoAdvance(currentStep, result, context);
            if (shouldAutoAdvance) {
                console.log(`🔄 Avance automático activado para paso '${currentStepId}'`);

                // Determinar el siguiente paso
                const nextStepId = result.nextStep || currentStep.nextStep;
                if (nextStepId) {
                    const nextStep = flow.steps.find(step => step.id === nextStepId);
                    if (nextStep) {
                        console.log(`➡️ Continuando automáticamente al paso '${nextStepId}'`);

                        // Ejecutar recursivamente el siguiente paso
                        await this.executeStep(conversation, message, flow, nextStep as StepDefinition, state);
                        return; // Salir para evitar doble ejecución
                    } else {
                        console.warn(`Siguiente paso '${nextStepId}' no encontrado en flujo '${flow.name}'`);
                    }
                } else {
                    console.log(`Fin del flujo alcanzado después del paso '${currentStepId}'`);
                }
            } else {
                console.log(`⏹️ Avance automático no activado para paso '${currentStepId}', esperando input del usuario`);
            }
        } else if (result.error) {
            // Marcar workflow como fallido si hay error crítico
            await this.updateWorkflowState(conversation, {
                status: 'failed',
                error: result.error
            });
            console.error(`Error en paso '${currentStepId}' del flujo '${flow.name}': ${result.error}`);
        }
    }

    /**
     * Cambia dinámicamente el flujo de una conversación basado en nueva intención
    */
    async switchToFlow(
        conversation: ConversationEntity,
        message: MessageEntity
    ): Promise<void> {
        console.log(`🔄 Cambiando flujo para conversación ${conversation.id} basado en intención ${conversation.intention_id}`);

        const state = conversation.workflow_state as WorkflowState;

        if(!state.flowName) {
            // Obtener intención para determinar el flow
            const intentions = await this.parametersRepository.getIntention([conversation.intention_id]);
            const {flow_name} = intentions[0];
            state.flowName = flow_name;
        }

        // Obtener la definición del flujo
        const flow = this.flowRegistry.getFlow(state.flowName);
        if (!flow) {
            console.error(`Flujo '${state.flowName}' no encontrado`);
            return;
        }

        // Encontrar el paso actual
        const currentStepId = state.currentStep || flow.initialStep;
        const currentStep = flow.steps.find(step => step.id === currentStepId);

        if (!currentStep) {
            console.error(`Paso '${currentStepId}' no encontrado en flujo '${flow.name}'`);
            return;
        }

        try {
            // Ejecutar el paso actual y manejar avance automático
            await this.executeStep(conversation, message, flow, currentStep, state);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`Error ejecutando paso '${currentStepId}' en flujo '${flow.name}':`, err);

            // Marcar como fallido
            await this.updateWorkflowState(conversation, {
                status: 'failed',
                error: err.message
            });
        }
    }

    /**
     * Determina si un paso debe avanzar automáticamente al siguiente
    */
    private shouldAutoAdvance(
        step: StepDefinition,
        result: StepResult,
        context: StepContext
    ): boolean {
        if (!step.autoAdvance) return false;

        // Si autoAdvance es un booleano, usar directamente
        if (typeof step.autoAdvance === 'boolean') {
            return step.autoAdvance;
        }

        // Si es una función, evaluarla con el resultado y contexto
        return step.autoAdvance(result, context);
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
            const result = await this.channelRuntimeService.emitMessage(messageInput);

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
     * Resetea el workflow (útil para reiniciar o cambiar de intención)
    */
    async resetWorkflow(conversationId: string): Promise<void> {
        await this.conversationRepository.update(conversationId, {
            workflow_state: undefined
        });
    }
}