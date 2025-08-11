import { identitiesRepositoryInterface } from "../../../identities/domain/repository.interface.js";
import { WhatsappRepository } from "../infrastructure/whatsapp.repository.js";

export class WhatsappUseCases{
    constructor(private identitiesRepository:identitiesRepositoryInterface){}
    private whatsappRepository:WhatsappRepository|null = null;

    async createClient(client_id:string):Promise<string>{
        const [agent] = await this.identitiesRepository.getAgent(client_id, 'client_id');
        if(!agent) throw new Error("El agente no existe");

        if(!agent.alive) throw new Error("El agente no esta disponible");

        this.whatsappRepository = new WhatsappRepository(agent);
        const qr = await this.whatsappRepository.initialize();

        if(!qr){
            await this.whatsappRepository.restoreReminders(agent.company_id);
            return 'authenticated';
        };
        
        return this.whatsappRepository.generateQrCode(qr as string);
    }
}
