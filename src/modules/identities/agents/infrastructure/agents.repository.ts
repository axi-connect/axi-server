import { PrismaClient, Agent, AgentStatus } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { AgentsRepositoryInterface, AgentWithRelations, CreateAgentInput, UpdateAgentInput, AgentSearchInterface, AgentSummaryDTO, AgentDetailDTO } from "../domain/repository.interface.js";

export class AgentsRepository implements AgentsRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
    }

    async getAgent(value?:any, column:string='id'):Promise<AgentWithRelations[]>{
        return await this.db.agent.findMany({
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
        }) as unknown as AgentWithRelations[];
    }

    async createAgent(agent_data:CreateAgentInput):Promise<Agent>{
        const data:any = { ...agent_data };
        if(!data.status) data.status = AgentStatus.available;
        if(!data.skills) data.skills = [];
        return await this.db.agent.create({
            data,
            include: {
                agentIntention: true
            }
        })
    }

    async updateAgent(agent_id:number, agent_data:UpdateAgentInput):Promise<Agent>{
        return await this.db.agent.update({
            where: {id: agent_id},
            data: agent_data
        })
    }

    async deleteAgent(agent_id:number):Promise<Agent>{
        return await this.db.agent.delete({where: {id: agent_id}})
    }

    async findAgentsSummary(search:AgentSearchInterface = {}):Promise<{agents: AgentSummaryDTO[], total:number}>{
        const where:any = {};
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(typeof search.alive === 'boolean') where.alive = search.alive;

        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [agents, total] = await this.db.$transaction([
            this.db.agent.findMany({
                where,
                select: { id:true, name:true, phone:true, alive:true, company_id:true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.agent.count({ where })
        ]);
        return {agents: agents as AgentSummaryDTO[], total};
    }

    async findAgentsDetail(search:AgentSearchInterface = {}):Promise<{agents: AgentDetailDTO[], total:number}>{
        const where:any = {};
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(typeof search.alive === 'boolean') where.alive = search.alive;

        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [agents, total] = await this.db.$transaction([
            this.db.agent.findMany({
                where,
                include: { company: true, agentIntention: { include: { intention:true, ai_requirement:true } } },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.agent.count({ where })
        ]);
        const detail = agents.map((a:any)=>({
            id: a.id,
            name: a.name,
            phone: a.phone,
            alive: a.alive,
            company_id: a.company_id,
            client_id: a.client_id,
            company: {id: a.company.id, name: a.company.name},
            agentIntention: a.agentIntention
        })) as AgentDetailDTO[];
        return {agents: detail, total};
    }
}

