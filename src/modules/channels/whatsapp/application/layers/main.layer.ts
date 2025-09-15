import * as flows from '../flows/index.js';
import intentionLayer from "./intention.layer.js";
import { paramsFlow } from "../../domain/flow.interface.js";
import { CatalogUseCases } from '../../../../catalog/application/catalog.usescases.js';
import { conversation, sendMessageClient } from "../../domain/conversation.interface.js";
import { CatalogRepository } from '../../../../catalog/infrastructure/catalog.repository.js';
import { ParametersUsesCases } from '../../../../parameters/application/parameters.usescases.js';
import { ParametersRepository } from '../../../../parameters/infrastructure/parameters.repository.js';
import { AgentWithRelations as agentDependency, AgentIntentionDependency as agentIntentionDependency } from "../../../../agents/domain/repository.interface.js";
import { Company } from '@prisma/client';

const getArgumentFlow = async(
    intention:agentIntentionDependency,
    argumentFlowInit:{history:string, conversation:conversation, sendMessage:sendMessageClient, company:Company, instructions:null}
):Promise<paramsFlow>=>{
    const argumentFlow:paramsFlow = argumentFlowInit;
    const {ai_requirement, require_reminder, require_catalog, require_schedule, require_db, require_sheet} = intention;

    if (Array.isArray(ai_requirement.instructions)){
        const instructions_string = (ai_requirement.instructions as string[]).reduce((acumulador: string, instruction: string) => acumulador + `- ${instruction}\n`, '');
        argumentFlow.instructions = instructions_string;
    }

    if(require_catalog){
        const catalogRepository = new CatalogRepository();
        const catalogUseCases = new CatalogUseCases(catalogRepository);
        const catalog = await catalogUseCases.getCatalog(argumentFlowInit.company.id, 'company_id');
    
        const catalog_string = catalog?.map((item, index) => {
            const product_string = item?.products?.map(product => `- ${product.name}:${product.description} PRECIO: $${product.price} COP\n`).join('\n');
            return `${index + 1}. ${item.name}:\n${product_string}`;
        }).join('\n') || 'No hay catalogo disponible';

        argumentFlow.catalog_object = catalog;
        argumentFlow.catalog = catalog_string;
    }

    if(require_schedule) {
        const parametersRepository = new ParametersRepository();
        const parametersUseCases = new ParametersUsesCases(parametersRepository);
        argumentFlow.schedule = await parametersUseCases.getCompanySchedule(argumentFlowInit.company.id);
    }
    
    argumentFlow.require_reminder = require_reminder;
    argumentFlow.storage = {sheet: require_sheet, db:require_db};
    return argumentFlow
}

export default async (
    conversation:conversation, 
    agent:agentDependency,
    sendMessage:sendMessageClient
)=>{
    console.log('Main Layer');
    const intentions:agentIntentionDependency[] = agent.agentIntention;
    const history = conversation.messages.reduce((acumulador:string, message:any) => acumulador + `${message.role}: ${message.content}\n`, '');
    const intentions_string = intentions.reduce((acumulador:string, {intention}, currentIndex:number) =>  acumulador + `${currentIndex + 1}. ${intention.code}: ${intention.ai_instructions}\n`, '');

    if(conversation.contact?.status?.name == 'confirm-schedule'){
        const intention = intentions.find(({intention}) => intention.code == 'CONFIRMAR-CITA')
        if(!intention) return
        const argumentFlow = await getArgumentFlow(intention, {history, conversation, sendMessage, company:agent.company, instructions:null})
        flows.confirmScheduleFlow(argumentFlow);
        return
    }

    const intention_code:string = await intentionLayer(history, intentions_string);
    // const intention_code = 'CONFIRMAR-CITA';

    if(intention_code == 'ERROR'){
        sendMessage(conversation.contact.id, '❌📡 Servicio temporalmente no disponible, intentalo mas tarde');
        return;
    }

    const flowMap: Record<string, Function> = flows as any;
    for (const agentIntention of intentions) {
        const {intention} = agentIntention;
        if (intention_code.includes(intention.code)){
            const argumentFlow = await getArgumentFlow(agentIntention, {history, conversation, sendMessage, company:agent.company, instructions:null})
            flowMap[intention.flow_name](argumentFlow);
            break;
        }
    }
}