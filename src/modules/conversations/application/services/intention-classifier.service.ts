 import { AIService } from '@/services/ai/index.js';
import { getRedisClient } from '@/database/redis.js';
import { MessageDirection, type Intention } from '@prisma/client';
import type { MessageEntity } from '../../domain/entities/message.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { MessageRepositoryInterface } from '../../domain/repositories/message-repository.interface.js';

export type IntentionClassification = {
    code: string;
    confidence: number;
    intentionId: number;
};

type AiIntentionResponse = { intentionId?: number; code?: string; confidence?: number };

type ClassifierOptions = {
    maxHistory?: number;
    aiTimeoutMs?: number;
    cacheTtlSeconds?: number;
};

export class IntentionClassifierService {
    private readonly ai: AIService;
    private readonly maxHistory: number;
    private readonly aiTimeoutMs: number;
    private readonly cacheTtlSeconds: number;
    private readonly redis = getRedisClient();

    constructor(
        private readonly messageRepository: MessageRepositoryInterface,
        private readonly parametersRepository: ParametersRepository,
        options?: ClassifierOptions
    ) {
        this.maxHistory = options?.maxHistory ?? 15;
        this.cacheTtlSeconds = options?.cacheTtlSeconds ?? 5 * 60; // 5 min
        this.aiTimeoutMs = options?.aiTimeoutMs ?? 1500; // SLA IA fría
        this.ai = new AIService();
    }

    private buildCacheKey(conversationId: string, lastMessageId: string | null): string {
        return lastMessageId
        ? `intent:conv:${conversationId}:last:${lastMessageId}`
        : `intent:conv:${conversationId}:bootstrap`;
    }

    private formatHistory(messages: MessageEntity[]): string {
        // Más nuevo primero en repo, revertimos a cronológico
        const chronological = [...messages].reverse();
        const lines: string[] = [];
        for (const m of chronological) {
            const role = m.direction === MessageDirection.incoming ? 'CLIENTE' : 'AGENTE';
            // Limitar longitud por línea para prompt hygiene
            const content = (m.message ?? '').slice(0, 500);
            lines.push(`${role}: ${content}`);
        }
        return lines.join('\n');
    }

    private formatIntentions(intentions: Intention[]): string {
        // Listado compacto de opciones disponibles: CODE: instructions
        return intentions
        .map((i) => `${i.id}|${i.code}: Si el cliente tiene la intención de ${i.ai_instructions}`)
        .join('\n');
    }

    async classifyConversation(conversationId: string): Promise<IntentionClassification | null> {
        // Obtener último mensaje para cache-key
        const latest = await this.messageRepository.findLatestByConversation(conversationId);
        const cacheKey = this.buildCacheKey(conversationId, latest?.id ?? null);

        // Cache hit
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as IntentionClassification;
                return parsed;
            } catch {
                // continuar
            }
        }

        // Obtener historial
        const history = await this.messageRepository.findByConversation({
            conversation_id: conversationId,
            limit: this.maxHistory,
            sortBy: 'timestamp',
            sortDir: 'desc'
        });
        const historyText = this.formatHistory(history);

        // Obtener intenciones disponibles (global por ahora)
        const { intentions } = await this.parametersRepository.findIntentions({ limit: 100 });
        if (!intentions.length) return null;
        const intentionsText = this.formatIntentions(intentions);

        // Construir prompt
        const prompt = [
            'Analiza el contexto de la conversación y selecciona la intención más adecuada.',
            'Devuelve estrictamente un JSON válido con la forma {"intentionId": number, "code": string, "confidence": number}.',
            'Restringe la elección a la lista de intenciones proporcionadas.',
            '',
            'HISTORIAL:',
            historyText || '(sin historial)',
            '',
            'INTENCIONES DISPONIBLES (id|code: instrucciones):',
            intentionsText
        ].join('\n');

        // Ejecutar IA con timeout (SLA) usando API tipada
        const aiTask = this.ai.createJsonChat<AiIntentionResponse>(
            [{ role: 'system', content: prompt }],
            { temperature: 0, maxTokens: 256 }
        );
        const timeoutTask = new Promise<null>((resolve) => setTimeout(() => resolve(null), this.aiTimeoutMs));
        const aiResult = await Promise.race<[AiIntentionResponse | null, null] | [null, null]>([
            aiTask.then((r) => [r, null] as [AiIntentionResponse | null, null]),
            timeoutTask.then(() => [null, null] as [null, null])
        ]);
        const AIContent = aiResult?.[0] ?? null;
 
        // Fallback heurístico si timeout o respuesta vacía
        const choice = AIContent ? this.safeParseClassification(AIContent, intentions) : this.keywordHeuristic(history, intentions);
        if (!choice) return null;

        // Cachear
        await this.redis.setEx(cacheKey, this.cacheTtlSeconds, JSON.stringify(choice));
        return choice;
    }

    private safeParseClassification(content: AiIntentionResponse, intentions: Intention[]): IntentionClassification | null {
        try {
            const { intentionId, code, confidence } = content;
            if (!confidence) return null;
            const matched = intentionId
                ? intentions.find((i) => i.id === intentionId)
                : intentions.find((i) => i.code.toLowerCase() === (code ?? '').toLowerCase());
            if (!matched) return null;
            return { intentionId: matched.id, code: matched.code, confidence: Math.max(0, Math.min(1, confidence)) };
        } catch {
            return null;
        }
    }

    private keywordHeuristic(history: MessageEntity[], intentions: Intention[]): IntentionClassification | null {
        if (!history.length) return null;
        const text = history[0]?.message?.toLowerCase() ?? '';
        let best: { it: Intention; score: number } | null = null;
        for (const it of intentions) {
            const description = it.description.toLowerCase();
            const instructions = it.ai_instructions.toLowerCase();
            const score =
                (text.includes(description) ? 1 : 0) +
                (Math.min(0.5, instructions.split(' ').filter((w) => w && text.includes(w)).length / 20));
            if (!best || score > best.score) best = { it, score };
        }
        if (!best) return null;
        return { intentionId: best.it.id, code: best.it.code, confidence: Math.max(0.3, Math.min(0.8, best.score)) };
    }
}