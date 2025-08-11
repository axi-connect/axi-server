import { Fields, Form, Prisma, type_field } from "@prisma/client"

export interface createIntentionInterface{
    code: string
    flow_name: string
    description: string
    ai_instructions: string
    agentIntention: {
        create: {
            agent_id: number
            require_catalog: boolean
            require_schedule: boolean
            ai_requirement_id: number
        }
    }
}

export interface createAIRequirement{
    instructions: Prisma.InputJsonValue
}

export interface formDependency extends Form{
    fields: Fields[]
}

export interface createFormInterface{
    code: string
    title: string
    company_id: number
    description: string
    table_name: string
    fields: {
        create: {
            type: type_field;
            key: string;
            label: string;
            placeholder:string;
            options: string[];
            required: boolean;
        }[]
    }
}

