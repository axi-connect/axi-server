import { createAIRequirement, createIntentionInterface, AgentCharacterCreateInput } from "../domain/parameters.interface.js";
import { AgentIntention, AIRequirement, CompanySchedule, Intention, PrismaClient, AgentCharacter, Prisma } from "@prisma/client";

export class ParametersRepository{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient
    }

    async createIntention(intention_data: createIntentionInterface):Promise<Intention>{
        return await this.db.intention.create({data: intention_data});
    }

    async createAgentCharacter(data: AgentCharacterCreateInput):Promise<AgentCharacter>{
        return this.db.agentCharacter.create({
            data: {
              avatar_url: data.avatar_url ?? null,
              style: data.style ?? Prisma.JsonNull,
              voice: data.voice ?? Prisma.JsonNull,
              resources: data.resources ?? Prisma.JsonNull,
            } as Prisma.AgentCharacterCreateInput
        });
    }

    async createAIRequirement(ai_requirement_data: createAIRequirement):Promise<AIRequirement>{
        return this.db.aIRequirement.create({data: ai_requirement_data});
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

    async findIntentions(search:any = {}):Promise<{intentions: Intention[], total:number}>{
        const where:any = {};
        if (search.type) where.type = search.type;
        if (search.priority) where.priority = search.priority;
        if (search.code) where.code = { contains: search.code, mode: 'insensitive' };
        if (search.flow_name) where.flow_name = { contains: search.flow_name, mode: 'insensitive' };
        if (search.description) where.description = { contains: search.description, mode: 'insensitive' };
        if (search.ai_instructions) where.ai_instructions = { contains: search.ai_instructions, mode: 'insensitive' };

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [intentions, total] = await this.db.$transaction([
            this.db.intention.findMany({
                where,
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.intention.count({ where })
        ]);
        return { intentions, total };
    }

    async findAgentCharacters(search:any = {}):Promise<{characters: AgentCharacter[], total:number}>{
        const where:any = {};
        if (search.id) where.id = search.id;
        if (search.avatar_url) where.avatar_url = { contains: search.avatar_url, mode: 'insensitive' };

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [characters, total] = await this.db.$transaction([
            this.db.agentCharacter.findMany({
                where,
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.agentCharacter.count({ where })
        ]);
        return { characters, total };
    }

    async findAIRequirements(search:any = {}):Promise<{requirements: AIRequirement[], total:number}>{
        const where:any = {};
        if (search.id) where.id = search.id;

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [requirements, total] = await this.db.$transaction([
            this.db.aIRequirement.findMany({
                where,
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.aIRequirement.count({ where })
        ]);
        return { requirements, total };
    }

    async updateIntention(intention_id:number, data: Partial<createIntentionInterface>):Promise<Intention>{
        return await this.db.intention.update({ where: { id: intention_id }, data });
    }

    async updateAgentCharacter(character_id:number, data: AgentCharacterCreateInput):Promise<AgentCharacter>{
        const updateData: Prisma.AgentCharacterUpdateInput = {
        avatar_url: data.avatar_url ?? null,
        style: data.style ?? Prisma.JsonNull,
        voice: data.voice ?? Prisma.JsonNull,
        resources: data.resources ?? Prisma.JsonNull,
        };
        return await this.db.agentCharacter.update({ where: { id: character_id }, data: updateData });
    }

    async updateAIRequirement(requirement_id:number, data: { instructions?: any }):Promise<AIRequirement>{
        return await this.db.aIRequirement.update({ where: { id: requirement_id }, data });
    }

    async deleteIntention(intention_id:number):Promise<Intention>{
        return await this.db.intention.delete({
            where: {id: intention_id}
        });
    }

    async deleteAgentCharacter(character_id:number):Promise<AgentCharacter>{
        return await this.db.agentCharacter.delete({ where: { id: character_id } });
    }

    async deleteAIRequirement(requirement_id:number):Promise<AIRequirement>{
        return await this.db.aIRequirement.delete({ where: { id: requirement_id } });
    }

    async getAgentIntention(agent_id:number):Promise<AgentIntention[]>{
        return await this.db.agentIntention.findMany({
            where: {agent_id},
            include: {
                intention: true
            }
        });
    }

    async getCompanySchedule(company_id:number):Promise<CompanySchedule[]>{
        return await this.db.companySchedule.findMany({
            where: {company_id}
        });
    }
}