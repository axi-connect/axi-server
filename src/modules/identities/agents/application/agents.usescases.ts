import { randomUUID } from 'crypto';
import { Agent } from "@prisma/client";
import { HttpError } from "@/shared/errors/http.error.js";
import { AgentsRepository } from "../infrastructure/agents.repository.js";
import { ParametersRepository } from "@/modules/parameters/infrastructure/parameters.repository.js";
import { CreateAgentInput, UpdateAgentInput, AgentSearchInterface, CreateAgentPayload } from "../domain/repository.interface.js";
import { CompaniesRepository } from "@/modules/identities/companies/infrastructure/companies.repository.js";

export class AgentsUseCases{
    private companiesRepository: CompaniesRepository;
    private parametersRepository: ParametersRepository;

    constructor(private agentsRepository:AgentsRepository){
        this.companiesRepository = new CompaniesRepository();
        this.parametersRepository = new ParametersRepository();
    }

    async list(agent_id?:number):Promise<Agent[]>{
        return await this.agentsRepository.getAgent(agent_id);
    }

    async search(search?:AgentSearchInterface):Promise<{agents:any[], total:number}>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if(mode === 'detail') return await (this.agentsRepository as any).findAgentsDetail(search);
        return await (this.agentsRepository as any).findAgentsSummary(search);
    }

    async getByClientId(client_id:string):Promise<Agent[]>{
        return await this.agentsRepository.getAgent(client_id, 'client_id');
    }

    async create(payload:CreateAgentPayload):Promise<Agent>{
        // Validaciones de relaciones
        const company = await this.companiesRepository.getCompany(payload.company_id);
        if(!company.length) throw new Error('La empresa no existe');

        // Validar intenciones si llegan
        const intentions = payload.intentions ?? [];
        if (intentions.length){
            const intentionIDs = intentions.map(item => item.intention_id);
            const intentionDB = await this.parametersRepository.getIntention(intentionIDs);
            if(intentionDB.length != intentionIDs.length) throw new Error("Las funciones asignadas del agente no existen");
        }

        // Validate Unique Constraints Phone
        const duplicate = await this.agentsRepository.getAgent(payload.phone, 'phone');
        if(duplicate.length) throw new Error('El teléfono ya existe');

        // Mapear payload a CreateAgentInput para repositorio
        const createInput:CreateAgentInput = {
            name: payload.name,
            phone: payload.phone,
            status: payload.status,
            channel: payload.channel,
            company_id: payload.company_id,
            character_id: payload.character_id,
            skills: payload.skills,
            client_id: randomUUID(),
            agentIntention: {
                create: intentions.map(i => ({
                    intention_id: i.intention_id,
                    requirements: i.requirements,
                    ai_requirement_id: i.ai_requirement_id ?? null as any,
                })) as any
            }
        };

        return await this.agentsRepository.createAgent(createInput);
    }

    async update(agent_id:number, agent_data:UpdateAgentInput):Promise<Agent>{
        const exists = await this.agentsRepository.getAgent(agent_id);
        if(!exists.length) throw new HttpError(404, 'Agente no encontrado');

        if(typeof (agent_data as any).company_id === 'number'){
            const company = await this.companiesRepository.getCompany((agent_data as any).company_id);
            if(!company.length) throw new HttpError(404, 'La empresa no existe');
        }

        return await this.agentsRepository.updateAgent(agent_id, agent_data);
    }

    async delete(agent_id:number):Promise<Agent>{
        return await this.agentsRepository.deleteAgent(agent_id);
    }
}