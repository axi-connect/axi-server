import { Agent, AgentIntention, AIRequirement, Intention, Company, AgentStatus, ChannelType } from "@prisma/client";

export interface AgentIntentionDependency extends AgentIntention{
    intention: Intention
    ai_requirement: AIRequirement
}

export interface AgentWithRelations extends Agent{
    company: Company,
    agentIntention: AgentIntentionDependency[]
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
}

export interface AgentsRepositoryInterface{
    getAgent(value?:any, column?:string):Promise<AgentWithRelations[]>
    createAgent(agent_data:CreateAgentInput):Promise<Agent>
    updateAgent(agent_id:number, agent_data:UpdateAgentInput):Promise<Agent>
    deleteAgent(agent_id:number):Promise<Agent>
}

export type AgentsViewMode = 'summary' | 'detail';

export interface AgentSearchInterface{
    name?: string;
    phone?: string;
    company_id?: number;
    alive?: boolean;
    limit?: number;
    offset?: number;
    view?: AgentsViewMode;
    sortBy?: 'id' | 'name' | 'phone' | 'company_id' | 'alive';
    sortDir?: 'asc' | 'desc';
}

export interface AgentSummaryDTO{
    id:number;
    name:string;
    phone:string;
    alive:boolean;
    company_id:number;
}

export interface AgentDetailDTO extends AgentSummaryDTO{
    client_id:string;
    company: {id:number, name:string};
    agentIntention: AgentIntentionDependency[];
}