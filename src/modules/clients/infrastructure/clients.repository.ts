import { Client, PrismaClient } from "@prisma/client";
import { ClientsRepositoryInterface, createClientInterface } from "../domain/repository.interface.js";

export class ClientsRepository implements ClientsRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
    }

    async createClient(client_data:createClientInterface):Promise<Client>{
        return await this.db.client.create({data: client_data})
    }

    async getClient(value?:any, column:string = 'id'):Promise<Client[]>{
        return await this.db.client.findMany({
            where: value ? {[column]: value} : undefined,
        });
    }

    //tipar parametro, y revisar client_id
    async updateClient(client_data:any):Promise<Client>{
        return await this.db.client.update({
            where: {id: client_data.id},
            data: client_data
        })
    }

    async deleteClient(client_id:number):Promise<Client>{
        return await this.db.client.delete({
            where: {id: client_id}
        })
    }
}