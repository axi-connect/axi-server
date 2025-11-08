import { Agent, AgentIntention, AIRequirement, Intention, Company, AgentStatus, ChannelType, AgentCharacter } from "@prisma/client";

export interface AgentIntentionDependency extends AgentIntention{
    intention: Intention
    ai_requirement: AIRequirement
}

export interface CreateAgentIntentionInput{
    intention_id: number,
    require_catalog: boolean,
    require_schedule: boolean,
    require_db: boolean,
    require_sheet: boolean,
    require_reminder: boolean,
    ai_requirement_id:number,
}

export interface CreateAgentInput{
    name:string;
    phone:string;
    client_id?:string;
    company_id:number;
    channel: ChannelType;
    character_id?: number;
    agentIntention: {
        create: CreateAgentIntentionInput[]
    }
    status?: AgentStatus;
    skills: string[];
}

// Payload esperado desde la API para crear agente
export interface CreateAgentPayload{
    name: string;
    phone: string;
    status: AgentStatus;
    channel: ChannelType;
    company_id: number;
    skills: string[];
    character_id?: number;
    intentions?: Array<{
        intention_id: number;
        ai_requirement_id?: number;
        requirements: {
            require_catalog: boolean;
            require_schedule: boolean;
            require_sheet: boolean;
            require_db: boolean;
            require_reminder: boolean;
        }
    }>;
}

export interface UpdateAgentInput{
    name?:string;
    phone?:string;
    alive?:boolean;
    status?: AgentStatus;
    channel?: ChannelType;
    company_id?: number;
    character_id?: number | null;
    skills?: string[];
}

export interface AgentsRepositoryInterface{
    deleteAgent(agent_id:number):Promise<Agent>
    existsById(agent_id:number):Promise<boolean>
    createAgent(agent_data:CreateAgentInput):Promise<Agent>
    getAgent(value?:any, column?:string):Promise<AgentDetailDTO[]>
    updateAgent(agent_id:number, agent_data:UpdateAgentInput):Promise<Agent>
}

export type AgentsViewMode = 'summary' | 'detail';

export interface AgentSearchInterface{
    name?: string;
    phone?: string;
    alive?: boolean;
    limit?: number;
    offset?: number;
    skills?: string[];
    company_id?: number;
    view?: AgentsViewMode;
    intention_id?: number;
    sortDir?: 'asc' | 'desc';
    sortBy?: 'id' | 'name' | 'phone' | 'company_id' | 'alive';
}

export interface AgentSummaryDTO{
    id:number;
    name:string;
    phone:string;
    alive:boolean;
    character: AgentCharacter;
    company:{ id:number, name:string };
}

export interface AgentDetailDTO extends AgentSummaryDTO{
    client_id:string;
    company: Company;
    skills: string[];
    agentIntention: AgentIntentionDependency[];
}