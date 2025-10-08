import * as flows from '../../channels/whatsapp/application/flows/index.js';
import { ParametersRepository } from "../infrastructure/parameters.repository.js";
import { AIRequirement, AgentCharacter, CompanySchedule, Intention } from "@prisma/client";
import { AgentCharacterCreateInput, createAIRequirement, createIntentionInterface } from "../domain/parameters.interface.js";
export class ParametersUsesCases{
    constructor(private parametersRepository:ParametersRepository){}

    async createIntention(intention_data:createIntentionInterface):Promise<Intention>{
        const availableFlows = Object.keys(flows);
        if (!availableFlows.includes(intention_data.flow_name)) throw new Error(`El flujo "${intention_data.flow_name}" no existe.`);
        return await this.parametersRepository.createIntention(intention_data);
    }

    async overviewIntentions():Promise<any>{
        return await this.parametersRepository.overviewIntentions();
    }

    async createAgentCharacter(data: AgentCharacterCreateInput):Promise<AgentCharacter>{
        return await this.parametersRepository.createAgentCharacter(data);
    }

    async createAIRequirements(ai_requirement_data:createAIRequirement):Promise<AIRequirement>{
        return await this.parametersRepository.createAIRequirement(ai_requirement_data);
    }

    async searchIntentions(search:any):Promise<{intentions: Intention[], total:number}>{
        return await this.parametersRepository.findIntentions(search);
    }

    async searchAgentCharacters(search:any):Promise<{characters: AgentCharacter[], total:number}>{
        return await this.parametersRepository.findAgentCharacters(search);
    }

    async searchAIRequirements(search:any):Promise<{requirements: AIRequirement[], total:number}>{
        return await this.parametersRepository.findAIRequirements(search);
    }

    async updateIntention(intention_id:number, data: Partial<createIntentionInterface>):Promise<Intention>{
        // validar existencia
        const exists = await this.parametersRepository.getIntention([intention_id]);
        if(!exists.length) throw new Error('Intención no encontrada');

        const availableFlows = Object.keys(flows);
        if (!availableFlows.includes(data.flow_name ?? "")) throw new Error(`El flujo "${data.flow_name ?? ""}" no existe.`);

        return await this.parametersRepository.updateIntention(intention_id, data);
    }

    async updateAgentCharacter(character_id:number, data: any):Promise<AgentCharacter>{
        const found = await this.parametersRepository.findAgentCharacters({ id: character_id, limit: 1, offset: 0 });
        if(!found.characters.length) throw new Error('Personaje no encontrado');
        return await this.parametersRepository.updateAgentCharacter(character_id, data);
    }

    async updateAIRequirement(requirement_id:number, data: any):Promise<AIRequirement>{
        const found = await this.parametersRepository.findAIRequirements({ id: requirement_id, limit: 1, offset: 0 });
        if(!found.requirements.length) throw new Error('Requisito de IA no encontrado');
        return await this.parametersRepository.updateAIRequirement(requirement_id, data);
    }

    async deleteIntention(intention_id:number):Promise<boolean>{
        const exists = await this.parametersRepository.getIntention([intention_id]);
        if(!exists.length) throw new Error('Intención no encontrada');
        await this.parametersRepository.deleteIntention(intention_id);
        return true;
    }

    async deleteAgentCharacter(character_id:number):Promise<boolean>{
        const found = await this.parametersRepository.findAgentCharacters({ id: character_id, limit: 1, offset: 0 });
        if(!found.characters.length) throw new Error('Personaje no encontrado');
        await this.parametersRepository.deleteAgentCharacter(character_id);
        return true;
    }

    async deleteAIRequirement(requirement_id:number):Promise<boolean>{
        const found = await this.parametersRepository.findAIRequirements({ id: requirement_id, limit: 1, offset: 0 });
        if(!found.requirements.length) throw new Error('Requisito de IA no encontrado');
        await this.parametersRepository.deleteAIRequirement(requirement_id);
        return true;
    }

    async getCompanySchedule(company_id:number):Promise<CompanySchedule[]>{
        return await this.parametersRepository.getCompanySchedule(company_id);
    }
}