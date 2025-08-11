import { Company, User, Agent, AgentIntention, Product, CompanySchedule, Intention, AIRequirement, Client } from "@prisma/client";
import { createClientInterface } from "../../clients/domain/repository.interface.js";


export interface companyDependency extends Company{
    company_schedule: CompanySchedule[]
}

export interface agentIntentionDependency extends AgentIntention{
    intention: Intention
    ai_requirement: AIRequirement
}

export interface agentDependency extends Agent{
    company: Company,
    agentIntention: agentIntentionDependency[]
}

interface agentIntention extends Agent{
    agentIntention: {
        create: {
            intention_id: number,
            require_catalog: boolean,
            require_schedule: boolean,
            require_db: boolean,
            require_sheet: boolean,
            require_reminder: boolean,
            ai_requirement_id:number,
        }[]
    }
}

export interface createCompanyInterface{
    nit:string
    name:string
    city:string    
    address:string
    isotype?:string
    industry:string
    activity_description:string
    user: {create: User}
    agent:{create: agentIntention}
    product: {create: Product}
    company_schedule: {create: CompanySchedule}
}

export interface updateCompanyInterface{
    name?:string,
    city?:string,    
    address?:string,
    isotype?:string,
    industry?:string,
}

export interface createUserInterface{
    name:string;
    phone: string;
    email: string;
    role_id: number;
    avatar?: string;
    password: string;
    company_id: number;
}

export interface updateUserInterface{
    name?:string;
    phone?: string;
    email?: string;
    role_id?: number;
    avatar?: string;
    password?: string;
    company_id?: number;
}

export interface createAgentInterface{
    name:string;
    phone:string;
    client_id:string;
    company_id:number;
    agentFunction: {
        create: agentIntention
    }
}

export interface identitiesRepositoryInterface{
    deleteCompany(company_id:number):Promise<Company>
    getCompany(value?:any, column?:string):Promise<Company[]>
    createCompany(company_data:createCompanyInterface):Promise<Company>
    updateCompany(company_id:number, company_data:updateCompanyInterface):Promise<Company>
    deleteUser(user_id:number):Promise<User>
    getUser(value?:any, column?:string):Promise<User[]>
    createUser(user_data:createUserInterface):Promise<User>
    updateUser(user_id:number, user_data:updateUserInterface):Promise<User>
    createAgent(agent_data:createAgentInterface):Promise<Agent>
    getAgent(value?:any, column?:string):Promise<agentDependency[]>
    createClient(client_data:createClientInterface):Promise<Client>
}