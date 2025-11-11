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
                    const prompt = JSON.stringify({
                        task: "ai_question",
                        return_format: "text_response",
                        question: options.question,
                        context_prompt: options.contextPrompt,
                        collected_data: context.collectedData,
                        user_message: context.message.message,
                        response_style: {
                            tone: "professional and helpful",
                            length: "concise but complete",
                            language: "Spanish"
                        },
                        instructions: "Provide a clear, concise, and helpful response as Axi Connect professional assistant."
                    });

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
                        message: aiResponse.content || '',
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
            retries: 1,
            timeout: 8000,
            id: options.id,
            nextStep: options.nextStep,
            name: 'Análisis de Sentimiento',
            description: 'Analiza el sentimiento del mensaje del usuario',
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    const prompt = JSON.stringify({
                        task: "sentiment_analysis",
                        return_format: "json",
                        message: context.message.message,
                        expected_format: {
                            sentiment: "POSITIVO | NEGATIVO | NEUTRAL",
                            confidence: "number between 0-1",
                            reasoning: "brief explanation string"
                        },
                        instructions: "Analyze the sentiment and return JSON with exactly these field names and types"
                    });

                    console.log('🤖❓ Prompt', prompt);

                    const AIResponse = await this.aiService.createJsonChat<{
                        sentiment: 'POSITIVO' | 'NEGATIVO' | 'NEUTRAL';
                        confidence: number;
                        reasoning: string;
                    }>([
                        { role: 'system', content: 'Eres un analizador de sentimientos. Responde únicamente con JSON válido.' },
                        { role: 'user', content: prompt }
                    ], {
                        temperature: 0,
                        maxTokens: 512
                    });

                    if (!AIResponse) {
                        return {
                            completed: false,
                            error: 'No se pudo analizar el sentimiento del mensaje'
                        };
                    }

                    console.log('🤖 AIResponse', AIResponse);
                    const sentiment = AIResponse.sentiment;
                    const threshold = options.positiveThreshold || 0.7;

                    return {
                        completed: true,
                        data: {
                            sentiment,
                            sentiment_reasoning: AIResponse.reasoning,
                            sentiment_confidence: AIResponse.confidence,
                            is_positive: sentiment === 'POSITIVO' && AIResponse.confidence >= threshold
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