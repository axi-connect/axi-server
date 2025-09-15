import { Router } from "express";
import { WhatsappUseCases } from "../application/whatsapp.usescases.js";
import { WhatsappController } from "./whatsapp.controller.js";
import { AgentsRepository } from "../../../agents/infrastructure/agents.repository.js";

export const WhatsappRoutes = Router();
const agentsRepository = new AgentsRepository();
const whatsappUsesCases = new WhatsappUseCases(agentsRepository);
const whatsappController = new WhatsappController(whatsappUsesCases);

WhatsappRoutes.get('/create/client', whatsappController.createClient);

const restoreWhatsappClients = async ()=> {
    const agents = await agentsRepository.getAgent();

    for (const agent of agents) {
        try {
            await whatsappUsesCases.createClient(agent.client_id);
        } catch (error:any) {
            console.log(`${agent.client_id}: ${error?.message}`);
        }
    }
}

// restoreWhatsappClients();