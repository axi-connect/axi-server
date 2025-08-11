import { PrismaClient } from "@prisma/client"
import { Agent, Company, User, Client, Lead} from "@prisma/client";
import { createClientInterface } from "../../clients/domain/repository.interface.js";
import { agentDependency, companyDependency, createAgentInterface, createCompanyInterface, createUserInterface, identitiesRepositoryInterface, updateCompanyInterface, updateUserInterface } from "../domain/repository.interface.js";

export class IdentitiesRepository implements identitiesRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient
    }

    async getCompany(value?:any, column:string = 'id'):Promise<companyDependency[]>{
        return this.db.company.findMany({
            where: value ? {[column]: value} : undefined,
            include: {
                company_schedule: true
            }
        });
    }

    async deleteCompany(company_id:number):Promise<Company>{
        return await this.db.company.delete({where: {id: company_id}});
    }

    async updateCompany(company_id:number, company_data:updateCompanyInterface):Promise<Company>{
        return this.db.company.update({
            where: {id: company_id},
            data: company_data
        })
    }

    async createCompany(company_data:createCompanyInterface):Promise<Company>{
        return await this.db.company.create({
            data: company_data,
            include: {
                user: true,
                agent: {
                    include: {
                        agentIntention:true
                    }
                },
                company_schedule: true
            }
        })
    }

    async getUser(options?:{
        value?:any, 
        column?:string, 
        include?:Record<string, any>
    }):Promise<User[]>{
        let value = options?.value;
        let include = options?.include;
        let column = options?.column ?? 'id';
        
        return await this.db.user.findMany({
            where: value ? {[column]: value} : undefined,
            include: {
                role: true,
                company: true
            }
        });
    }

    async createUser(user_data:createUserInterface):Promise<User>{
        return await this.db.user.create({
            data: user_data
        })
    }

    async updateUser(user_id:number, user_data:updateUserInterface):Promise<User>{
        return await this.db.user.update({
            where: {id: user_id},
            data: user_data
        });
    }

    async deleteUser(user_id:number): Promise<User> {
        return await this.db.user.delete({
            where: {id: user_id}
        })
    }

    async createAgent(agent_data:createAgentInterface):Promise<Agent>{
        return await this.db.agent.create({
            data: agent_data,
            include: {
                agentIntention: true
            }
        })
    }

    async getAgent(value?:any, column:string='id'):Promise<agentDependency[]>{
        const agent:any = await this.db.agent.findMany({
            where: value ? {[column]: value} : undefined,
            include: {
                company: true,
                agentIntention: {
                    include: {
                        intention: true,
                        ai_requirement: true,
                    }
                }
            }
        });

        return agent;
    }

    async getClient(value?:any, column:string='id'):Promise<Client[]>{
        return await this.db.client.findMany({
            where: value ? {[column]: value} : undefined,
        });
    }

    async getLead(value?:any, column:string='id'):Promise<Lead[]>{
        return await this.db.lead.findMany({where: value ? {[column]: value} : undefined,});
    }

    async createClient(client_data:createClientInterface):Promise<Client>{
        return await this.db.client.create({data: client_data})
    }
}