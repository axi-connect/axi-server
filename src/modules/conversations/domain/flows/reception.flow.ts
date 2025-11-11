import { AIService } from '@/services/ai/index.js';
import { StepFactory } from '../steps/step-factory.js';
import { FlowDefinition, StepDefinition } from '../interfaces/workflow.interface.js';

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

    constructor(aiService: AIService) {
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
                supported_channels: ['whatsapp', 'web', 'telegram'],
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
                    welcome_timestamp: new Date().toISOString(),
                    user_greeted: true
                }
            }
        );
    }

    /**
     * Paso 2: Análisis del sentimiento del mensaje inicial
     */
    private createSentimentAnalysisStep() {
        return this.stepFactory.createSentimentAnalysis(
            'analyze_sentiment',
            {
                nextStep: 'extract_intention',
                positiveThreshold: 0.6
            }
        );
    }

    /**
     * Paso 3: Extracción de intención inicial del mensaje
     */
    private createInitialIntentionExtractionStep() {
        return this.stepFactory.createDataExtraction(
            'extract_intention',
            [
                {
                    name: 'user_intention',
                    description: 'La intención principal del usuario (compra, consulta, soporte, cita, etc.)',
                    required: true
                },
                {
                    name: 'urgency_level',
                    description: 'Nivel de urgencia (bajo, medio, alto)',
                    required: false
                },
                {
                    name: 'topic_keywords',
                    description: 'Palabras clave del tema (producto, servicio, precio, horario, etc.)',
                    required: false
                },
                {
                    name: 'has_specific_request',
                    description: 'Si tiene una solicitud específica o solo consulta general',
                    required: false,
                    validation: (value) => typeof value === 'boolean'
                }
            ],
            {
                nextStep: 'validate_intention',
                allowPartial: true
            }
        );
    }

    /**
     * Paso 4: Validación y clasificación de la intención
     */
    private createIntentionValidationStep() {
        return this.stepFactory.createConditionalStep(
            'validate_intention',
            (context) => {
                // Lógica para determinar si la intención es clara y válida
                const collectedData = context.collectedData;
                const userIntention = collectedData.user_intention as string;
                const hasSpecificRequest = collectedData.has_specific_request as boolean;

                // Si tiene intención clara Y solicitud específica, ir directo al flujo
                if (userIntention && hasSpecificRequest) {
                    return true;
                }

                // Si tiene intención pero no específica, pedir más detalles
                if (userIntention && !hasSpecificRequest) {
                    return false;
                }

                // Si no entendió nada, pedir clarificación
                return false;
            },
            'transfer_to_specialized_flow', // true: intención clara
            'ask_for_clarification' // false: necesita más información
        );
    }

    /**
     * Paso 5: Transferencia al flujo especializado apropiado
     */
    private createFlowTransferStep() {
        return this.stepFactory.createAIQuestion(
            'transfer_to_specialized_flow',
            'Basándote en la intención del usuario y la información recopilada, ' +
            'determina cuál es el flujo más apropiado y proporciona una respuesta ' +
            'de transición profesional.\n\n' +
            'Flujos disponibles:\n' +
            '- Seller Flow: Para intenciones de compra\n' +
            '- Booking Flow: Para agendar citas/reuniones\n' +
            '- Support Flow: Para soporte técnico/PQRS\n' +
            '- Inquiry Flow: Para preguntas generales\n\n' +
            'Si no está claro, sugiere opciones al usuario.',
            {
                contextPrompt: 'Eres un coordinador de flujos en Axi Connect. ' +
                    'Tu tarea es dirigir al usuario al flujo correcto basado en su intención.',
                nextStep: 'flow_completed',
                data: {
                    flow_transfer_completed: true,
                    transfer_timestamp: new Date().toISOString()
                }
            }
        );
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
export function createReceptionFlow(aiService: AIService): FlowDefinition {
    const receptionFlow = new ReceptionFlow(aiService);
    return receptionFlow.createFlow();
}
