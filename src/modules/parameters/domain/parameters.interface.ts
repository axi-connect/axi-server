import { Prisma, IntentionPriority, IntentionType } from "@prisma/client"

export interface createIntentionInterface{
    code: string
    flow_name: string
    description: string
    ai_instructions: string
    priority: IntentionPriority
    type: IntentionType
}

export interface createAIRequirement{
    instructions: Prisma.InputJsonValue
}

export interface AgentCharacterCreateInput{
    avatar_url?: string | null;
    style?: Prisma.InputJsonValue | null;
    voice?: Prisma.InputJsonValue | null;
    resources?: Prisma.InputJsonValue | null;
}

export type ViewMode = 'summary' | 'detail';

export interface IntentionSearchInterface{
    type?: 'sales'|'support'|'technical'|'onboarding'|'follow_up';
    priority?: 'low'|'medium'|'high'|'urgent';
    code?: string;
    flow_name?: string;
    description?: string;
    ai_instructions?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'id'|'code'|'flow_name'|'type'|'priority';
    sortDir?: 'asc'|'desc';
    view?: ViewMode;
}

export interface AgentCharacterSearchInterface{
    avatar_url?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'id'|'avatar_url';
    sortDir?: 'asc'|'desc';
    view?: ViewMode;
}

export interface AIRequirementSearchInterface{
    id?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'id';
    sortDir?: 'asc'|'desc';
    view?: ViewMode;
}