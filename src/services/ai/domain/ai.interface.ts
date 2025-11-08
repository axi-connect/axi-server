// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface AIServiceConfig {
    baseURL?: string;
    apiKey?: string;
    defaultModel?: string;
    timeout?: number;
    maxRetries?: number;
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    responseFormat?: { type: "json_object" | "text" };
    stream?: boolean;
    stopSequences?: string[];
    user?: string;
}

export interface ChatResponse {
    content: string | null;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
}

export type StreamCallback = (chunk: string) => void | Promise<void>;