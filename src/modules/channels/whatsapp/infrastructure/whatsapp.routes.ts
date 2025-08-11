import { Router } from "express";
import { WhatsappUseCases } from "../application/whatsapp.usescases.js";
import { WhatsappController } from "./whatsapp.controller.js";
import { IdentitiesRepository } from "../../../identities/infrastructure/identities.repository.js";

export const WhatsappRoutes = Router();
const identitiesRepository = new IdentitiesRepository();
const whatsappUsesCases = new WhatsappUseCases(identitiesRepository);
const whatsappController = new WhatsappController(whatsappUsesCases);

WhatsappRoutes.get('/create/client', whatsappController.createClient);

const restoreWhatsappClients = async ()=> {
    const agents = await identitiesRepository.getAgent();

    for (const agent of agents) {
        try {
            await whatsappUsesCases.createClient(agent.client_id);
        } catch (error:any) {
            console.log(`${agent.client_id}: ${error?.message}`);
        }
    }
}

// restoreWhatsappClients();