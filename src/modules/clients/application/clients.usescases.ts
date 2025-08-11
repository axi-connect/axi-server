import { Client } from "@prisma/client";
import { ClientsRepositoryInterface, createClientInterface } from "../domain/repository.interface.js";

export class ClientsUsesCases{
    constructor(private clientsRepository: ClientsRepositoryInterface){}

    async createClient(client_data:createClientInterface):Promise<Client>{
        const client = await this.clientsRepository.getClient(client_data.document_num, 'document_num');
        if(!client.length) throw new Error('Este cliente ya existe');

        return await this.clientsRepository.createClient(client_data);
    }
}