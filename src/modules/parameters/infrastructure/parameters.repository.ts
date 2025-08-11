import { AgentIntention, AIRequirement, CompanySchedule, Intention, PrismaClient, Form } from "@prisma/client";
import { createAIRequirement, createIntentionInterface, createFormInterface, formDependency } from "../domain/parameters.interface.js";

export class ParametersRepository{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient
    }

    async getAgentIntention(agent_id:number):Promise<AgentIntention[]>{
        return await this.db.agentIntention.findMany({
            where: {agent_id},
            include: {
                intention: true
            }
        });
    }

    async getIntention(value:any[], column:string = 'id'):Promise<Intention[]>{
        return await this.db.intention.findMany({
            where: {[column]: {in: value}}
        });
    }

    async getAIRequirement(value:any, column:string = 'id'):Promise<AIRequirement[]>{
        return await this.db.aIRequirement.findMany({
            where: {[column]: value}
        });
    }

    async createAIRequirement(ai_requirement_data: createAIRequirement):Promise<AIRequirement>{
        return this.db.aIRequirement.create({
            data: ai_requirement_data
        });
    }

    async getCompanySchedule(company_id:number):Promise<CompanySchedule[]>{
        return await this.db.companySchedule.findMany({
            where: {company_id}
        });
    }

    async createIntention(intention_data: createIntentionInterface):Promise<Intention>{

        return await this.db.intention.create({
            data: intention_data,
            include: {
                agentIntention: true
            }
        });
    }

    async deleteIntention(intention_id:number):Promise<Intention>{
        return await this.db.intention.delete({
            where: {id: intention_id}
        });
    }

    async createForm(form_data: createFormInterface):Promise<formDependency>{
        return await this.db.form.create({
            data: form_data,
            include: {
                fields: true
            }
        });
    }

    async getForm(where:{[key:string]: any}):Promise<formDependency[]>{
        return await this.db.form.findMany({
            where,
            include: {
                fields: true
            }
        });
    }
}