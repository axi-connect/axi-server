import { PrismaClient, Agent, AgentStatus } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { AgentsRepositoryInterface, CreateAgentInput, UpdateAgentInput, AgentSearchInterface, AgentSummaryDTO, AgentDetailDTO } from "../domain/repository.interface.js";

export class AgentsRepository implements AgentsRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
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

    async getAgent(value?:any, column:string='id'):Promise<AgentDetailDTO[]>{
        return await this.db.agent.findMany({
            where: value ? {[column]: value} : undefined,
            include: {
                company: true,
                character: true,
                agentIntention: {
                    include: {
                        intention: true,
                        ai_requirement: true,
                    }
                }
            }
        }) as unknown as AgentDetailDTO[];
    }

    async findAgentsSummary(search:AgentSearchInterface = {}):Promise<{agents: AgentSummaryDTO[], total:number}>{
        const where:any = {};
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(typeof search.alive === 'boolean') where.alive = search.alive;
        if (search.intention_id) {
            where.agentIntention = {
                some: {intention_id: search.intention_id}
            };
        }
        if (search.skills && search.skills.length > 0) {
            where.skills = {
                hasEvery: search.skills  // Postgres: tiene todas las skills | "hasSome" si solo necesita una
            };
        }
        
        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [agents, total] = await this.db.$transaction([
            this.db.agent.findMany({
                where,
                select: {
                    id:true, name:true, phone:true, alive:true,
                    company: { select: { id:true, name:true } },
                    character: { select: { id:true, avatar_url:true, style:true } },
                },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.agent.count({ where })
        ]);
        console.log('agents', agents)
        return {agents: agents as AgentSummaryDTO[], total};
    }

    async findAgentsDetail(search:AgentSearchInterface = {}):Promise<{agents: AgentDetailDTO[], total:number}>{
        const where:any = {};
        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(typeof search.alive === 'boolean') where.alive = search.alive;
        if (search.intention_id) {
            where.agentIntention = {
                some: {intention_id: search.intention_id}
            };
        }
        if (search.skills && search.skills.length > 0) {
            where.skills = {
                hasEvery: search.skills  // Postgres: tiene todas las skills | "hasSome" si solo necesita una
            };
        }

        const [agents, total] = await this.db.$transaction([
            this.db.agent.findMany({
                where,
                include: { company: true, character: true, agentIntention: { include: { intention:true, ai_requirement:true } } },
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
            skills: a.skills,
            client_id: a.client_id,
            character: a.character,
            agentIntention: a.agentIntention,
            company: {id: a.company.id, name: a.company.name}
        })) as AgentDetailDTO[];
        return {agents: detail, total};
    }

    async updateAgent(agent_id:number, agent_data:UpdateAgentInput):Promise<Agent>{
        const data:any = {
            name: agent_data.name,
            phone: agent_data.phone,
            alive: agent_data.alive,
            status: agent_data.status,
            channel: agent_data.channel,
            skills: agent_data.skills,
            // company_id: agent_data.company_id,
        };

        // Relations
        if(typeof (agent_data as any).company_id === 'number'){
            data.company = { connect: { id: (agent_data as any).company_id } };
        }
        if((agent_data as any).character_id !== undefined){
            const cid = (agent_data as any).character_id as any;
            if(cid === null){
                data.character = { disconnect: true };
            } else if(typeof cid === 'number'){
                data.character = { connect: { id: cid } };
            }
        }

        if(Array.isArray((agent_data as any).intentions)){
            const intentions = (agent_data as any).intentions;
            data.agentIntention = {
                deleteMany: {},
                create: intentions.map((i:any)=>({
                    requirements: i.requirements,
                    intention: { connect: { id: i.intention_id } },
                    ...(i.ai_requirement_id ? { ai_requirement: { connect: { id: i.ai_requirement_id } } } : {})
                }))
            };
        }

        return await this.db.agent.update({
            data,
            include: {
                agentIntention: true
            },
            where: { id: agent_id },
        })
    }

    async deleteAgent(agent_id:number):Promise<Agent>{
        return await this.db.agent.delete({where: {id: agent_id}})
    }

    async existsById(agent_id:number):Promise<boolean>{
        try{
            const ag = await this.db.agent.findUnique({ where: { id: agent_id }, select: { id: true } });
            return ag != null;
        }catch{
            return false;
        }
    }
}