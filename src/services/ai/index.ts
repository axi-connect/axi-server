import OpenAI from "openai";
import { Stream } from "openai/streaming.mjs";
import type { AIServiceConfig, ChatOptions, ChatResponse, StreamCallback } from './domain/ai.interface.js';
import { ChatCompletionMessageParam, ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs";

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<AIServiceConfig, 'baseURL' | 'apiKey'>> = {
  defaultModel: 'deepseek-chat',
  timeout: 60000,
  maxRetries: 3,
};

const DEFAULT_CHAT_OPTIONS: Required<Omit<ChatOptions, 'model' | 'stopSequences' | 'user' | 'responseFormat'>> = {
    topP: 1,
    stream: false,
    temperature: 0.7,
    maxTokens: 4096,
    frequencyPenalty: 0,
    presencePenalty: 0,
};

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

export class AIService {
    private client: OpenAI;
    private config: Required<AIServiceConfig>;

    constructor(config?: AIServiceConfig) {
        this.config = {
            timeout: config?.timeout || DEFAULT_CONFIG.timeout,
            apiKey: config?.apiKey || process.env.AI_API_KEY || '',
            baseURL: config?.baseURL || process.env.AI_BASE_URL || '',
            maxRetries: config?.maxRetries || DEFAULT_CONFIG.maxRetries,
            defaultModel: config?.defaultModel || DEFAULT_CONFIG.defaultModel,
        };

        this.validateConfig();
        this.client = this.createClient();
    }

    // --------------------------------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------------------------------
    private validateConfig(): void {
        if (!this.config.baseURL)  throw new Error('AI_BASE_URL is required');
        if (!this.config.apiKey) throw new Error('AI_API_KEY is required');
    }

    private validateMessages(messages: ChatCompletionMessageParam[]): void {
        if (!Array.isArray(messages) || messages.length === 0) throw new Error('Messages array cannot be empty');
    }

    // --------------------------------------------------------------------------
    // INICIALIZACIÓN
    // --------------------------------------------------------------------------
    private createClient(): OpenAI {
        return new OpenAI({
            apiKey: this.config.apiKey,
            timeout: this.config.timeout,
            baseURL: this.config.baseURL,
            maxRetries: this.config.maxRetries,
        });
    }

    // --------------------------------------------------------------------------
    // MÉTODOS PÚBLICOS - CHAT
    // --------------------------------------------------------------------------

    /**
     * Crea un chat completion sin streaming
    */
    async createChat(
        messages: ChatCompletionMessageParam[],
        options?: ChatOptions
    ): Promise<ChatResponse> {
        this.validateMessages(messages);
        const params = this.buildChatParams(messages, { ...options, stream: false });

        try {
            // Forzamos tipo específico ya que stream es false
            const completion = await this.client.chat.completions.create(params) as OpenAI.Chat.Completions.ChatCompletion;
            
            return {
                model: completion.model,
                finishReason: completion.choices[0]?.finish_reason,
                content: completion.choices[0]?.message?.content || null,
                usage: completion.usage ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens,
                } : undefined,
            };
          } catch (error) {
            throw this.handleError(error);
          }
    }

    /**
     * Crea un chat completion con streaming
    */
    async createChatStream(
        messages: ChatCompletionMessageParam[],
        onChunk: StreamCallback,
        options?: ChatOptions
    ): Promise<ChatResponse> {
        this.validateMessages(messages);

        const params = this.buildChatParams(messages, { ...options, stream: true });

        try {
            const stream = await this.client.chat.completions.create(params);
            
            let model = '';
            let fullContent = '';
            let finishReason = '';

            for await (const chunk of stream as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>) {
                const content = chunk.choices[0]?.delta?.content || '';
                
                if (content) {
                    fullContent += content;
                    await onChunk(content);
                }

                if (chunk.model) model = chunk.model;
                if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
            }

            return {
                content: fullContent || null,
                model,
                finishReason,
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Chat con formato JSON
    */
    async createJsonChat<T = any>(
        messages: ChatCompletionMessageParam[],
        options?: Omit<ChatOptions, 'responseFormat'>
    ): Promise<T | null> {
        const response = await this.createChat(messages, {
            ...options,
            responseFormat: { type: 'json_object' },
        });

        if (!response.content) return null;

        try {
            return JSON.parse(response.content) as T;
        } catch (error) {
            throw new Error(`Failed to parse JSON response: ${error}`);
        }
    }

    // --------------------------------------------------------------------------
    // UTILIDADES
    // --------------------------------------------------------------------------

    private buildChatParams(
        messages: ChatCompletionMessageParam[],
        options?: ChatOptions
    ): ChatCompletionCreateParamsBase {
        const params: any = {
            messages,
            model: options?.model || this.config.defaultModel,
            top_p: options?.topP ?? DEFAULT_CHAT_OPTIONS.topP,
            stream: options?.stream ?? DEFAULT_CHAT_OPTIONS.stream,
            max_tokens: options?.maxTokens ?? DEFAULT_CHAT_OPTIONS.maxTokens,
            temperature: options?.temperature ?? DEFAULT_CHAT_OPTIONS.temperature,
            presence_penalty: options?.presencePenalty ?? DEFAULT_CHAT_OPTIONS.presencePenalty,
            frequency_penalty: options?.frequencyPenalty ?? DEFAULT_CHAT_OPTIONS.frequencyPenalty,
        };

        if (options?.responseFormat) params.response_format = options.responseFormat;
        if (options?.stopSequences && options.stopSequences.length > 0) params.stop = options.stopSequences;
        if (options?.user) params.user = options.user;

        return params;
    }

    private handleError(error: unknown): Error {
        if (error instanceof OpenAI.APIError) {
            return new Error(
                `OpenAI API Error (${error.status}): ${error.message}`
            );
        }
        
        if (error instanceof Error) return error;

        return new Error('Unknown error occurred');
    }

    // --------------------------------------------------------------------------
    // GETTERS
    // --------------------------------------------------------------------------

    getDefaultModel(): string {
        return this.config.defaultModel;
    }

    getConfig(): Readonly<Required<AIServiceConfig>> {
        return { ...this.config };
    }

    // --------------------------------------------------------------------------
    // ACTUALIZACIÓN DE CONFIGURACIÓN
    // --------------------------------------------------------------------------

    updateDefaultModel(model: string): void {
        this.config.defaultModel = model;
    }
}

// ============================================================================
// FACTORY PARA INSTANCIAS SINGLETON
// ============================================================================

export class AIServiceFactory {
  private static instances = new Map<string, AIService>();

  static getInstance(name: string = 'default', config?: AIServiceConfig): AIService {
    if (!this.instances.has(name)) this.instances.set(name, new AIService(config));
    return this.instances.get(name) as AIService;
  }

  static clearInstance(name: string = 'default'): void {
    this.instances.delete(name);
  }

  static clearAllInstances(): void {
    this.instances.clear();
  }
}