import { AIService } from '@/services/ai/index.js';
import { StepContext, StepResult, StepDefinition } from '../interfaces/workflow.interface.js';

/**
 * Paso reutilizable para comunicación con IA
 * Maneja preguntas/respuestas usando el servicio de IA
*/
export class AICommunicationStep {
    constructor(private aiService: AIService) {}

    /**
     * Crea un paso para enviar un mensaje a la IA y obtener respuesta
    */
    createAIQuestionStep(options: {
        id: string;
        question: string;
        contextPrompt?: string;
        requiredData?: string[];
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: `AI Communication: ${options.question.substring(0, 50)}...`,
            description: `Envía pregunta a IA: ${options.question}`,
            timeout: options.timeout || 10000,
            retries: 2,
            nextStep: options.nextStep,
            requiredData: options.requiredData,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // Construir el prompt con contexto
                    let prompt = options.question;

                    if (options.contextPrompt) {
                        prompt = `${options.contextPrompt}\n\nPregunta: ${options.question}`;
                    }

                    // Agregar datos recopilados del contexto si existen
                    if (Object.keys(context.collectedData).length > 0) {
                        prompt += `\n\nInformación recopilada hasta ahora:\n${JSON.stringify(context.collectedData, null, 2)}`;
                    }

                    // Agregar historial de conversación reciente
                    prompt += `\n\nMensaje del usuario: ${context.message.message}`;

                    // Llamar a la IA
                    const aiResponse = await this.aiService.createChat([
                        { role: 'system', content: 'Eres un asistente profesional de Axi Connect. Responde de manera clara, concisa y útil.' },
                        { role: 'user', content: prompt }
                    ], {
                        temperature: 0.7,
                        maxTokens: 500
                    });

                    if (!aiResponse) {
                        return {
                            completed: false,
                            error: 'No se pudo obtener respuesta de la IA'
                        };
                    }

                    return {
                        completed: true,
                        message: aiResponse.content,
                        shouldSendMessage: true,
                        data: {
                            ai_response: aiResponse.content,
                            ai_question: options.question
                        }
                    };

                } catch (error) {
                    console.error(`Error en paso AI ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al comunicarse con IA: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso para análisis de sentimientos usando IA
    */
    createSentimentAnalysisStep(options: {
        id: string;
        nextStep?: string;
        positiveThreshold?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Análisis de Sentimiento',
            description: 'Analiza el sentimiento del mensaje del usuario',
            timeout: 8000,
            retries: 1,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    const prompt = `Analiza el sentimiento del siguiente mensaje y clasifícalo como POSITIVO, NEGATIVO o NEUTRAL.
                    También proporciona un score de confianza entre 0 y 1.

Responde en formato JSON:
{
    "sentiment": "POSITIVO|NEGATIVO|NEUTRAL",
    "confidence": 0.95,
    "reasoning": "breve explicación"
}

Mensaje: "${context.message.message}"`;

                    const aiResponse = await this.aiService.createJsonChat<{
                        sentiment: 'POSITIVO' | 'NEGATIVO' | 'NEUTRAL';
                        confidence: number;
                        reasoning: string;
                    }>([
                        { role: 'system', content: 'Eres un analizador de sentimientos. Responde únicamente con JSON válido.' },
                        { role: 'user', content: prompt }
                    ], {
                        temperature: 0,
                        maxTokens: 200
                    });

                    if (!aiResponse) {
                        return {
                            completed: false,
                            error: 'No se pudo analizar el sentimiento del mensaje'
                        };
                    }

                    const sentiment = aiResponse.sentiment;
                    const threshold = options.positiveThreshold || 0.7;

                    return {
                        completed: true,
                        data: {
                            sentiment,
                            sentiment_confidence: aiResponse.confidence,
                            sentiment_reasoning: aiResponse.reasoning,
                            is_positive: sentiment === 'POSITIVO' && aiResponse.confidence >= threshold
                        }
                    };

                } catch (error) {
                    console.error(`Error en análisis de sentimiento ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al analizar sentimiento: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }
}