import { AIService } from '@/services/ai/index.js';
import { StepFactory } from '../steps/step-factory.js';
import { FlowDefinition, StepDefinition } from '../interfaces/workflow.interface.js';
import { WorkflowEngineService, type WorkflowState } from '../../application/services/workflow-engine.service.js';
import { type IntentionClassification, IntentionClassifierService } from '../../application/services/intention-classifier.service.js';

/**
 * Utilidad para validación y clasificación de intenciones
*/
class IntentionValidationUtil {
    /**
     * Valida la confianza de una intención clasificada y determina el siguiente paso
     */
    static validateAndRoute(classification: IntentionClassification): {
        isValid: boolean;
        needsClarification: boolean;
        priority: 'high' | 'medium' | 'low';
        nextStep: string;
        confidence: number;
    } {
        // Umbrales de confianza por tipo de intención
        const confidenceThresholds = {
            'high': 0.8,    // Intenciones críticas (compras, soporte urgente)
            'medium': 0.6,  // Intenciones normales (consultas, citas)
            'low': 0.4      // Intenciones básicas (saludos, general)
        };

        // Determinar prioridad de la intención
        const priority = this.getIntentionPriority(classification.code);
        const minConfidence = confidenceThresholds[priority];
        const isValid = (classification.confidence >= minConfidence) && classification.code !== 'general_inquiry';
        const needsClarification = !isValid;

        return {
            isValid,
            needsClarification,
            priority,
            nextStep: isValid ? 'transfer_to_specialized_flow' : 'ask_for_clarification',
            confidence: classification.confidence
        };
    }

    /**
     * Determina la prioridad de una intención para ajustar umbrales de confianza
    */
    private static getIntentionPriority(intentionCode: string): 'high' | 'medium' | 'low' {
        const highPriorityIntentions = ['buy_intent', 'support_request'];
        const mediumPriorityIntentions = ['schedule_appointment', 'product_question'];
        const lowPriorityIntentions = ['general_inquiry', 'follow_up'];

        if (highPriorityIntentions.includes(intentionCode)) return 'high';
        if (mediumPriorityIntentions.includes(intentionCode)) return 'medium';
        return 'low';
    }
}

/**
 * Reception Flow - Flujo general para atención inicial
 *
 * Este flujo maneja las primeras interacciones con usuarios nuevos o
 * mensajes sin contexto específico. Su objetivo es:
 * 1. Dar una bienvenida cálida y profesional
 * 2. Analizar el sentimiento y contexto del mensaje inicial
 * 3. Clasificar y validar la intención del usuario
 * 4. Dirigir al flujo apropiado o pedir más información
*/
export class ReceptionFlow {
    private stepFactory: StepFactory;

    constructor(
        aiService: AIService,
        private intentionClassifier: IntentionClassifierService,
        private workflowEngine: WorkflowEngineService
    ) {
        this.stepFactory = new StepFactory(aiService);
    }

    /**
     * Crea la definición completa del Reception Flow
    */
    createFlow(): FlowDefinition {
        return {
            version: '1.0.0',
            name: 'Reception Flow',
            initialStep: 'welcome_user',
            finalStep: 'transfer_to_specialized_flow',
            timeout: 300000, // 5 minutos para completar el flujo
            description: 'Flujo general para atención inicial o recepción de mensajes sin contexto específico',
            steps: [
                // PASO 1: Bienvenida y análisis inicial
                this.createWelcomeStep(),

                // PASO 2: Análisis de sentimiento
                // this.createSentimentAnalysisStep(),

                // PASO 3: Clasificación y validación integrada de intención
                this.createInitialIntentionExtractionStep(),

                // PASO 4: Pedir clarificación si la intención no es clara
                this.createAskClarificationStep(),

                // PASO 4: Transferencia al flujo especializado 
                this.createFlowTransferStep()
            ],
            metadata: {
                priority: 'high',
                type: 'reception',
                estimated_duration: '2-5 minutos'
            }
        };
    }

    /**
     * Paso 1: Bienvenida personalizada al usuario
    */
    private createWelcomeStep(): StepDefinition {
        return this.stepFactory.createStaticMessage(
            'welcome_user',
            '¡Hola! 👋 Bienvenido a Axi Connect\n\n' +
            'Soy tu asistente virtual y estoy aquí para ayudarte. ' +
            'Cuéntame ¿en qué puedo asistirte hoy?\n\n' +
            'Por ejemplo:\n' +
            '• Quiero comprar un producto\n' +
            '• Necesito agendar una cita\n' +
            '• Tengo una pregunta sobre un servicio\n' +
            '• Necesito soporte técnico',
            {
                nextStep: 'extract_intention',
                data: {
                    user_greeted: true,
                    welcome_timestamp: new Date().toISOString(),
                }
            }
        );
    }

    /**
     * Paso 2: Análisis del sentimiento del mensaje inicial
    */
    private createSentimentAnalysisStep(): StepDefinition {
        const step = this.stepFactory.createSentimentAnalysis(
            'analyze_sentiment',
            {
                nextStep: 'extract_intention',
                positiveThreshold: 0.6
            }
        );

        // Agregar avance automático: siempre continuar después del análisis
        step.autoAdvance = true;

        return step;
    }

    /**
     * Paso 3: Clasificación de intención usando el servicio especializado
    */
    private createInitialIntentionExtractionStep(): StepDefinition {
        return {
            retries: 1,
            requiredData: [],
            autoAdvance: true,
            id: 'extract_intention',
            timeout: 10000, // 10 segundos para clasificación completa
            name: 'Clasificación y Validación de Intención del Usuario',
            description: 'Clasifica la intención del usuario y valida su confianza para determinar el siguiente paso',
            execute: async (context) => {
                try {
                    console.log('🤖 Clasificando intención del usuario...');

                    // Usar el servicio centralizado de clasificación de intenciones
                    const classification = await this.intentionClassifier.classifyConversation(context.conversation.id);

                    if (!classification) {
                        console.log('❌ No se pudo clasificar la intención, solicitando clarificación');
                        return {
                            completed: true,
                            nextStep: 'ask_for_clarification',
                            data: {
                                classification_failed: true,
                                needs_clarification: true
                            }
                        };
                    }

                    console.log(`✅ Intención clasificada: ${classification.code} (confianza: ${(classification.confidence * 100).toFixed(1)}%)`);

                    // Validar la clasificación usando la utilidad integrada
                    const validation = IntentionValidationUtil.validateAndRoute(classification);

                    console.log(`🔍 Validación: ${validation.isValid ? '✅ Válida' : '⚠️ Necesita clarificación'} (prioridad: ${validation.priority})`);

                    return {
                        completed: true,
                        nextStep: validation.nextStep,
                        data: {
                            classified_intention: classification,
                            validation_passed: validation.isValid,
                            intention_priority: validation.priority,
                            needs_clarification: validation.needsClarification
                        }
                    };

                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error('Error en clasificación de intención:', err);

                    return {
                        completed: true,
                        nextStep: 'ask_for_clarification',
                        data: {
                            classification_error: true,
                            needs_clarification: true,
                            error_message: err.message
                        }
                    };
                }
            }
        };
    }

    /**
     * Paso 4: Transferencia automática al flujo especializado
    */
    private createFlowTransferStep(): StepDefinition {
        return {
            retries: 1,
            id: 'transfer_to_specialized_flow',
            requiredData: ['classified_intention'],
            name: 'Transferencia Automática a Flujo Especializado',
            autoAdvance: false, // No envía mensajes, delega al nuevo flujo
            timeout: 10000, // Tiempo suficiente para inicializar nuevo flujo
            description: 'Transfiere automáticamente al flujo especializado correspondiente usando lógica centralizada',
            execute: async (context) => {
                try {
                    const collectedData = context.collectedData;
                    const classifiedIntention = collectedData.classified_intention as IntentionClassification;

                    console.log(`🔄 Transfiriendo automáticamente a flujo especializado para intención: ${classifiedIntention.code} (ID: ${classifiedIntention.intentionId})`);
                    // Usar lógica centralizada del workflow engine para cambiar de flujo
                    // Esto inicializará el workflow correcto y ejecutará su primer paso
                    await this.workflowEngine.switchToFlow(
                        {
                            ...context.conversation, 
                            workflow_state: {
                                ...context.conversation.workflow_state as WorkflowState,
                                flowName: undefined
                            },
                            intention_id: classifiedIntention.intentionId
                        },
                        context.message
                    );

                    console.log(`✅ Transferencia completada - Nuevo flujo activo para conversación ${context.conversation.id}`);

                    return {
                        completed: true,
                        data: {
                            flow_transfer_completed: true,
                            transferred_at: new Date().toISOString(),
                            transferred_to_intention: classifiedIntention.code,
                        }
                    };

                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error('Error en transferencia automática de flujo:', err);

                    return {
                        completed: false,
                        error: `Error en transferencia automática: ${err.message}`,
                        data: {
                            flow_transfer_error: true,
                            error_details: err.message
                        }
                    };
                }
            }
        };
    }

    /**
     * Paso adicional: Pedir clarificación si la intención no es clara
    */
    private createAskClarificationStep() {
        return this.stepFactory.createDataRequest(
            'ask_for_clarification',
            'Entiendo que necesitas ayuda, pero me gustaría entender mejor tu solicitud. ' +
            '¿Podrías darme más detalles sobre qué necesitas?\n\n' +
            'Por ejemplo:\n' +
            '• "¿Quiero comprar un producto específico"\n' +
            '• "Necesito soporte con un problema técnico"\n' +
            '• "Quiero agendar una reunión para mañana"',
            ['clarified_intention'],
            {
                nextStep: 'extract_intention', // Reintentar extracción con más info
                timeout: 60000 // Dar más tiempo para respuesta
            }
        );
    }

    /**
     * Paso final: Completar el flujo de recepción
    */
    private createFlowCompletionStep() {
        return this.stepFactory.createStaticMessage(
            'flow_completed',
            'Gracias por proporcionar esa información. ' +
            'Te estoy conectando con el especialista apropiado...',
            {
                data: {
                    reception_flow_completed: true,
                    completion_timestamp: new Date().toISOString()
                }
            }
        );
    }
}

// Factory function para crear el flujo fácilmente
export function createReceptionFlow(
    aiService: AIService,
    intentionClassifier: IntentionClassifierService,
    workflowEngine: WorkflowEngineService
): FlowDefinition {
    const receptionFlow = new ReceptionFlow(aiService, intentionClassifier, workflowEngine);
    return receptionFlow.createFlow();
}