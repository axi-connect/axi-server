import { WhatsappRepository } from "../infrastructure/whatsapp.repository.js";

export class WhatsappUsesCases {
    constructor(private whatsappRepository: WhatsappRepository) {}
}