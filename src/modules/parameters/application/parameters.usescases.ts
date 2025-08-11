import * as flows from '../../channels/whatsapp/application/flows/index.js';
import { ParametersRepository } from "../infrastructure/parameters.repository.js";
import { AIRequirement, CompanySchedule, Intention } from "@prisma/client";
import { createAIRequirement, createIntentionInterface, formDependency } from "../domain/parameters.interface.js";
import { generateCode } from '../../../shared/utils/utils.shared.js';

export class ParametersUsesCases{
    constructor(private parametersRepository:ParametersRepository){}

    async getCompanySchedule(company_id:number):Promise<CompanySchedule[]>{
        return await this.parametersRepository.getCompanySchedule(company_id);
    }

    async createIntention(intention_data:createIntentionInterface):Promise<Intention>{
        const availableFlows = Object.keys(flows);
        if (!availableFlows.includes(intention_data.flow_name)) throw new Error(`El flujo "${intention_data.flow_name}" no existe.`);

        const ai_requirement = await this.parametersRepository.getAIRequirement(intention_data.agentIntention.create.ai_requirement_id);
        if(!ai_requirement.length) throw new Error(`El AI requerimiento asignado no existe`);

        return await this.parametersRepository.createIntention(intention_data)
    }

    async deleteIntention(intention_id:number):Promise<Intention>{
        return await this.parametersRepository.deleteIntention(intention_id);
    }

    async createAIRequirements(ai_requirement_data:createAIRequirement):Promise<AIRequirement>{
        return await this.parametersRepository.createAIRequirement(ai_requirement_data);
    }

    async createForm(form_data:any):Promise<formDependency>{
        const code = generateCode();
        form_data.code = code;
        return await this.parametersRepository.createForm(form_data);
    }

    async getForm(form_id:number):Promise<formDependency[]>{
        return await this.parametersRepository.getForm({id: form_id});
    }
}