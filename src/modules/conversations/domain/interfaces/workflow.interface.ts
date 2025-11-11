import { MessageEntity } from '../entities/message.js';
import { ConversationEntity } from '../entities/conversation.js';

/**
 * Contexto que recibe un paso durante su ejecución
*/
export interface StepContext {
    companyId: number;
    channelId: string;
    message: MessageEntity;
    conversation: ConversationEntity;
    collectedData: Record<string, unknown>;
}

/**
 * Resultado que devuelve un paso después de su ejecución
*/
export interface StepResult {
    error?: string;
    message?: string;
    nextStep?: string;
    completed: boolean;
    shouldSendMessage?: boolean;
    data?: Record<string, unknown>;
}

/**
 * Definición de un paso individual en un flujo
*/
export interface StepDefinition {
    id: string;
    name: string;
    timeout?: number; // en milisegundos
    retries?: number;
    nextStep?: string;
    description?: string;
    requiredData?: string[];
    condition?: (context: StepContext) => boolean;
    execute: (context: StepContext) => Promise<StepResult>;
    onError?: (error: Error, context: StepContext) => Promise<StepResult>;
    // Propiedad para avance automático
    autoAdvance?: boolean | ((result: StepResult, context: StepContext) => boolean);
}

/**
 * Definición completa de un flujo de trabajo
*/
export interface FlowDefinition {
    name: string;
    version?: string;
    timeout?: number; // timeout total del flujo
    finalStep?: string;
    initialStep: string;
    description?: string;
    steps: StepDefinition[];
    metadata?: Record<string, unknown>;
}

/**
 * Estado de ejecución de un flujo
*/
export interface FlowExecutionState {
    error?: string;
    startedAt: Date;
    lastStepAt: Date;
    flowName: string;
    currentStep: string;
    completedSteps: string[];
    collectedData: Record<string, unknown>;
    status: 'running' | 'completed' | 'failed' | 'paused';
}

/**
 * Resultado de la ejecución de un flujo completo
*/
export interface FlowExecutionResult {
    error?: string;
    totalTime: number; // en milisegundos
    completed: boolean;
    stepsExecuted: number;
    finalData?: Record<string, unknown>;
}