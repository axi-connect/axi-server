import { AIService } from '@/services/ai/index.js';
import { IntegrationStep } from './integration.step.js';
import { DataCollectionStep } from './data-collection.step.js';
import { AICommunicationStep } from './ai-communication.step.js';
import { StepDefinition } from '../interfaces/workflow.interface.js';

/**
 * Factory centralizada para crear pasos reutilizables
 * Proporciona una interfaz unificada para crear instancias de pasos comunes
 */
export class StepFactory {
    private aiStep: AICommunicationStep;
    private dataStep: DataCollectionStep;
    private integrationStep: IntegrationStep;

    constructor(aiService: AIService) {
        this.aiStep = new AICommunicationStep(aiService);
        this.dataStep = new DataCollectionStep(aiService);
        this.integrationStep = new IntegrationStep();
    }

    // ===== PASOS DE COMUNICACIÓN CON IA =====

    /**
     * Crea un paso para hacer una pregunta a la IA
    */
    createAIQuestion(
        id: string,
        question: string,
        options?: {
            contextPrompt?: string;
            requiredData?: string[];
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.aiStep.createAIQuestionStep({
            id,
            question,
            ...options
        });
    }

    /**
     * Crea un paso para analizar el sentimiento del mensaje
     */
    createSentimentAnalysis(
        id: string,
        options?: {
            nextStep?: string;
            positiveThreshold?: number;
        }
    ): StepDefinition {
        return this.aiStep.createSentimentAnalysisStep({
            id,
            ...options
        });
    }

    // ===== PASOS DE RECOPILACIÓN DE DATOS =====

    /**
     * Crea un paso para extraer datos específicos usando IA
     */
    createDataExtraction(
        id: string,
        fields: Array<{
            name: string;
            description: string;
            required: boolean;
            validation?: (value: unknown) => boolean;
        }>,
        options?: {
            nextStep?: string;
            timeout?: number;
            allowPartial?: boolean;
        }
    ): StepDefinition {
        return this.dataStep.createDataExtractionStep({
            id,
            fields,
            ...options
        });
    }

    /**
     * Crea un paso para solicitar datos específicos al usuario
     */
    createDataRequest(
        id: string,
        requestMessage: string,
        expectedFields: string[],
        options?: {
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.dataStep.createDataRequestStep({
            id,
            requestMessage,
            expectedFields,
            ...options
        });
    }

    /**
     * Crea un paso para validar datos recopilados
     */
    createDataValidation(
        id: string,
        validations: Array<{
            field: string;
            validator: (value: unknown) => boolean;
            errorMessage: string;
        }>,
        options?: {
            nextStep?: string;
            onValidationFail?: string;
        }
    ): StepDefinition {
        return this.dataStep.createDataValidationStep({
            id,
            validations,
            ...options
        });
    }

    // ===== PASOS DE INTEGRACIÓN =====

    /**
     * Crea un paso para consultar el catálogo
     */
    createCatalogQuery(
        id: string,
        options: {
            queryType: 'search' | 'get_by_id' | 'get_all';
            searchTerm?: string;
            categoryId?: number;
            limit?: number;
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.integrationStep.createCatalogQueryStep({
            id,
            ...options
        });
    }

    /**
     * Crea un paso para verificar disponibilidad de agenda
     */
    createScheduleAvailability(
        id: string,
        options?: {
            date?: string;
            timeRange?: { start: string; end: string };
            serviceType?: string;
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.integrationStep.createScheduleAvailabilityStep({
            id,
            ...options
        });
    }

    /**
     * Crea un paso para crear una reserva/cita
     */
    createAppointmentBooking(
        id: string,
        requiredData: string[],
        options?: {
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.integrationStep.createAppointmentBookingStep({
            id,
            requiredData,
            ...options
        });
    }

    /**
     * Crea un paso para buscar información de cliente
     */
    createCustomerLookup(
        id: string,
        lookupBy: 'phone' | 'email' | 'id',
        options?: {
            nextStep?: string;
            createIfNotFound?: boolean;
            timeout?: number;
        }
    ): StepDefinition {
        return this.integrationStep.createCustomerLookupStep({
            id,
            lookupBy,
            ...options
        });
    }

    /**
     * Crea un paso para llamadas HTTP genéricas
     */
    createHttpRequest(
        id: string,
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        options?: {
            headers?: Record<string, string>;
            body?: Record<string, unknown>;
            expectedStatus?: number;
            responseMapper?: (response: unknown) => Record<string, unknown>;
            nextStep?: string;
            timeout?: number;
        }
    ): StepDefinition {
        return this.integrationStep.createHttpRequestStep({
            id,
            url,
            method,
            ...options
        });
    }

    // ===== PASOS UTILITARIOS =====

    /**
     * Crea un paso que siempre se completa (útil para mensajes estáticos)
     */
    createStaticMessage(
        id: string,
        message: string,
        options?: {
            nextStep?: string;
            data?: Record<string, unknown>;
        }
    ): StepDefinition {
        return {
            id,
            name: 'Mensaje Estático',
            description: `Envía mensaje: ${message.substring(0, 50)}...`,
            nextStep: options?.nextStep,
            execute: async () => ({
                completed: true,
                message,
                shouldSendMessage: true,
                data: options?.data || {}
            })
        };
    }

    /**
     * Crea un paso de condición basado en datos recopilados
     */
    createConditionalStep(
        id: string,
        condition: (context: any) => boolean,
        trueStep: string,
        falseStep: string,
        options?: {
            description?: string;
        }
    ): StepDefinition {
        return {
            id,
            name: 'Paso Condicional',
            description: options?.description || 'Evalúa condición y decide siguiente paso',
            condition,
            execute: async (context) => ({
                completed: true,
                nextStep: condition(context) ? trueStep : falseStep,
                data: { condition_result: condition(context) }
            })
        };
    }

    /**
     * Crea un paso de espera/configuración
     */
    createDelayStep(
        id: string,
        delayMs: number,
        options?: {
            nextStep?: string;
            message?: string;
        }
    ): StepDefinition {
        return {
            id,
            name: `Espera ${delayMs}ms`,
            description: `Pausa la ejecución por ${delayMs} milisegundos`,
            nextStep: options?.nextStep,
            execute: async () => {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return {
                    completed: true,
                    message: options?.message,
                    shouldSendMessage: !!options?.message,
                    data: { delay_completed: true, delay_duration: delayMs }
                };
            }
        };
    }
}
