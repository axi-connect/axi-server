import { AIService } from '@/services/ai/index.js';
import { StepFactory } from '../steps/step-factory.js';
import { FlowDefinition, StepDefinition } from '../interfaces/workflow.interface.js';
import { type IntentionClassification, IntentionClassifierService } from '../../application/services/intention-classifier.service.js';

/**
 * Reception Flow - Flujo general para atención inicial
 *
 * Este flujo maneja las primeras interacciones con usuarios nuevos o
 * mensajes sin contexto específico. Su objetivo es:
 * 1. Dar una bienvenida cálida y profesional
 * 2. Analizar el sentimiento y contexto del mensaje inicial
 * 3. Intentar clasificar la intención del usuario
 * 4. Dirigir al flujo apropiado o pedir más información
*/
export class ReceptionFlow {
    private stepFactory: StepFactory;

    constructor(
        aiService: AIService, 
        private intentionClassifier: IntentionClassifierService
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
            timeout: 300000, // 5 minutos para completar el flujo
            finalStep: 'transfer_to_specialized_flow',
            description: 'Flujo general para atención inicial o recepción de mensajes sin contexto específico',
            steps: [
                // PASO 1: Bienvenida y análisis inicial
                this.createWelcomeStep(),

                // PASO 2: Análisis de sentimiento
                this.createSentimentAnalysisStep(),

                // PASO 3: Extracción de intención inicial
                this.createInitialIntentionExtractionStep(),

                // PASO 4: Validación y clasificación
                this.createIntentionValidationStep(),

                // PASO 5: Transferencia al flujo especializado
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
                nextStep: 'analyze_sentiment',
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
            nextStep: 'validate_intention',
            name: 'Clasificación de Intención del Usuario',
            timeout: 10000, // 10 segundos para clasificación
            description: 'Clasifica la intención del usuario usando el servicio de IA especializado',
            execute: async (context) => {
                try {
                    console.log('🤖 Clasificando intención del usuario...');

                    // Usar el servicio centralizado de clasificación de intenciones
                    const classification = await this.intentionClassifier.classifyConversation(context.conversation.id);

                    if (!classification) {
                        return {
                            data: {},
                            completed: false,
                            error: 'No se pudo clasificar la intención del usuario',
                        };
                    }

                    console.log(`✅ Intención clasificada: ${classification.code} (confianza: ${(classification.confidence * 100).toFixed(1)}%)`);

                    return {
                        completed: true,
                        data: { classified_intention: classification }
                    };

                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error('Error clasificando intención:', err);

                    return {
                        data: {},
                        completed: false,
                        error: `Error en clasificación de intención: ${err.message}`,
                    };
                }
            }
        };
    }

    /**
     * Paso 4: Validación de la intención clasificada
    */
    private createIntentionValidationStep(): StepDefinition {
        return {
            retries: 0,
            autoAdvance: true,
            id: 'validate_intention',
            timeout: 2000, // Validación rápida
            requiredData: ['classified_intention'],
            name: 'Validación de Intención Clasificada',
            description: 'Valida si la intención clasificada tiene suficiente confianza para continuar',
            execute: async (context) => {
                try {
                    const collectedData = context.collectedData;
                    const classifiedIntention = collectedData.classified_intention as IntentionClassification;

                    console.log(`🔍 Validando intención: ${classifiedIntention?.code} (confianza: ${(classifiedIntention.confidence * 100).toFixed(1)}%)`);

                    // Umbrales de confianza por tipo de intención
                    const confidenceThresholds = {
                        'low': 0.4,      // Intenciones básicas (saludos, general)
                        'medium': 0.6,   // Intenciones normales (consultas, citas)
                        'high': 0.8,     // Intenciones críticas (compras, soporte urgente)
                    };

                    // Determinar prioridad de la intención
                    const intentionPriority = this.getIntentionPriority(classifiedIntention?.code);
                    const minConfidence = confidenceThresholds[intentionPriority];

                    if (classifiedIntention.confidence >= minConfidence) {
                        console.log(`✅ Intención validada con confianza suficiente (${classifiedIntention.confidence} >= ${minConfidence})`);

                        return {
                            completed: true,
                            nextStep: 'transfer_to_specialized_flow',
                            data: {
                                validation_passed: true,
                                intention_priority: intentionPriority
                            }
                        };
                    } else {
                        console.log(`⚠️ Intención con baja confianza (${classifiedIntention.confidence} < ${minConfidence}), solicitando clarificación`);

                        return {
                            completed: true,
                            nextStep: 'ask_for_clarification',
                            data: {
                                validation_passed: false,
                                needs_clarification: true,
                                intention_priority: intentionPriority,
                            }
                        };
                    }

                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error('Error en validación de intención:', err);

                    return {
                        completed: false,
                        error: `Error en validación: ${err.message}`,
                        nextStep: 'ask_for_clarification',
                        data: {
                            validation_error: true
                        }
                    };
                }
            }
        };
    }

    /**
     * Determina la prioridad de una intención para ajustar umbrales de confianza
    */
    private getIntentionPriority(intentionCode: string): 'high' | 'medium' | 'low' {
        const highPriorityIntentions = ['buy_intent', 'support_request'];
        const mediumPriorityIntentions = ['schedule_appointment', 'product_question'];
        const lowPriorityIntentions = ['general_inquiry', 'follow_up'];

        if (highPriorityIntentions.includes(intentionCode)) return 'high';
        if (mediumPriorityIntentions.includes(intentionCode)) return 'medium';
        return 'low';
    }

    /**
     * Paso 5: Transferencia al flujo especializado apropiado
    */
    private createFlowTransferStep(): StepDefinition {
        return {
            id: 'transfer_to_specialized_flow',
            name: 'Transferencia a Flujo Especializado',
            timeout: 5000,
            retries: 1,
            description: 'Determina el flujo especializado apropiado basado en la intención clasificada',
            requiredData: ['classified_intention', 'intention_code'],
            autoAdvance: false, // Este paso SÍ debe enviar mensaje al usuario
            execute: async (context) => {
                try {
                    const collectedData = context.collectedData;
                    const intentionCode = collectedData.intention_code as string;
                    const confidence = collectedData.confidence as number;

                    console.log(`🔀 Transfiriendo a flujo especializado para intención: ${intentionCode}`);

                    // Mapear intenciones a flujos especializados
                    const flowMapping = {
                        'buy_intent': {
                            flowName: 'Seller Flow',
                            message: `Perfecto, veo que estás interesado en realizar una compra. Te conectaré con nuestro especialista en ventas que te ayudará con todo el proceso.`,
                            priority: 'high'
                        },
                        'schedule_appointment': {
                            flowName: 'Booking Flow',
                            message: `Entiendo que deseas agendar una cita o reunión. Te ayudaré a encontrar el horario perfecto para ti.`,
                            priority: 'medium'
                        },
                        'support_request': {
                            flowName: 'Support Flow',
                            message: `Lamento cualquier inconveniente. Nuestro equipo de soporte técnico te asistirá inmediatamente.`,
                            priority: 'high'
                        },
                        'product_question': {
                            flowName: 'Inquiry Flow',
                            message: `Excelente pregunta sobre nuestros productos. Te proporcionaré toda la información que necesitas.`,
                            priority: 'medium'
                        },
                        'general_inquiry': {
                            flowName: 'Inquiry Flow',
                            message: `Hola, soy tu asistente de Axi Connect. ¿En qué puedo ayudarte hoy?`,
                            priority: 'low'
                        },
                        'follow_up': {
                            flowName: 'Retention Flow',
                            message: `¡Gracias por contactarnos nuevamente! Es un placer atenderte.`,
                            priority: 'low'
                        }
                    };

                    const flowConfig = flowMapping[intentionCode as keyof typeof flowMapping] || {
                        flowName: 'Inquiry Flow',
                        message: `Hola, soy tu asistente de Axi Connect. ¿En qué puedo ayudarte hoy?`,
                        priority: 'low'
                    };

                    console.log(`📋 Flujo asignado: ${flowConfig.flowName} (prioridad: ${flowConfig.priority})`);

                    return {
                        completed: true,
                        shouldSendMessage: true,
                        message: flowConfig.message,
                        data: {
                            target_flow: flowConfig.flowName,
                            flow_priority: flowConfig.priority,
                            transfer_reason: `Intención clasificada: ${intentionCode} (${(confidence * 100).toFixed(1)}% confianza)`
                        }
                    };

                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error('Error en transferencia de flujo:', err);

                    return {
                        completed: false,
                        error: `Error en transferencia: ${err.message}`,
                        shouldSendMessage: true,
                        message: 'Disculpa, tuve un problema al procesar tu solicitud. ¿Puedes intentar nuevamente?',
                        data: {
                            transfer_error: true
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
export function createReceptionFlow(aiService: AIService, intentionClassifier: IntentionClassifierService): FlowDefinition {
    const receptionFlow = new ReceptionFlow(aiService, intentionClassifier);
    return receptionFlow.createFlow();
}