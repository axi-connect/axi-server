import { ChannelType } from '@prisma/client';
import { getRedisClient } from '@/database/redis.js';
import type { ConversationEntity } from '../../domain/entities/conversation.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import { ConversationRepositoryInterface } from '../../domain/repositories/conversation-repository.interface.js';
import { ChannelRepositoryInterface } from '@/modules/channels/domain/repositories/channel-repository.interface.js';

export interface AgentMatchOptions {
  requiredSkills?: string[];
  cacheTtlSeconds?: number;
  maxCandidates?: number;
}

export class AgentMatchingService {
    private readonly redis = getRedisClient();
    private readonly cacheTtlSeconds: number;
    private readonly maxCandidates: number;

    constructor(
        private readonly agentsRepository: AgentsRepository,
        private readonly conversationRepository: ConversationRepositoryInterface,
        private readonly channelRepository: ChannelRepositoryInterface,
        options?: AgentMatchOptions
    ) {
        this.cacheTtlSeconds = options?.cacheTtlSeconds ?? 60;
        this.maxCandidates = options?.maxCandidates ?? 50;
    }

    private buildLoadKey(agentId: number): string {
        return `agent:load:${agentId}`;
    }

    private async getApproxAgentLoad(agentId: number): Promise<number> {
        // Try cached load first
        const key = this.buildLoadKey(agentId);
        const cached = await this.redis.get(key);
        if (cached) {
            const n = Number(cached);
            if (!Number.isNaN(n)) return n;
        }
        // Fallback: compute from active conversations
        const active = await this.conversationRepository.findActiveByAgent(agentId);
        const load = active.length;
        await this.redis.setEx(key, this.cacheTtlSeconds, String(load));
        return load;
    }

    private async chooseLeastLoaded(agentIds: number[]): Promise<number | null> {
        if (agentIds.length === 0) return null;
        let best: { id: number; load: number } | null = null;
        for (const id of agentIds) {
            const load = await this.getApproxAgentLoad(id);
            if (!best || load < best.load || (load === best.load && id < best.id)) best = { id, load };
        }
        return best ? best.id : null;
    }

    /**
     * Encuentra un agente disponible por intención, canal y compañía con balanceo por carga.
     */
    async matchAgentForConversation(
        conversation: ConversationEntity,
        intentionId: number,
        options?: AgentMatchOptions
    ): Promise<number | null> {
        const channel = await this.channelRepository.findById(conversation.channel_id);
        if (!channel) return null;

        // Fetch candidates (detailed) by company; filter in-memory by status/channel/intention/skills
        const { agents: candidates } = await this.agentsRepository.findAgentsSummary({ 
            alive: true,
            intention_id: intentionId,
            limit: this.maxCandidates,
            skills: options?.requiredSkills,
            company_id: conversation.company_id, 
        });

        console.log('candidates', candidates);
        if (candidates.length === 0) {
            // Fallback: default agent on channel (if any)
            if (channel.default_agent_id) return channel.default_agent_id;
            return null;
        }

        const candidateIds = candidates.map((a) => a.id);
        return this.chooseLeastLoaded(candidateIds);
    }

    /**
     * Asigna el agente si no existe uno, actualiza contador de carga y retorna el id asignado.
     */
    async assignIfNeeded(conversation: ConversationEntity, intentionId: number, options?: AgentMatchOptions): Promise<number | null> {
        const agentId = await this.matchAgentForConversation(conversation, intentionId, options);
        if (!agentId) return null;
        await this.conversationRepository.assignAgent(conversation.id, agentId);
        // Increment load counter (best-effort)
        const key = this.buildLoadKey(agentId);
        try {
            const current = await this.redis.get(key);
            const n = Number(current);
            const next = Number.isNaN(n) ? 1 : n + 1;
            await this.redis.setEx(key, this.cacheTtlSeconds, String(next));
        } catch {
            // ignore
        }
        return agentId;
    }
}