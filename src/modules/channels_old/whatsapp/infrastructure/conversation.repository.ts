
import { redisDB } from '@/database/redis.js';
import { contact, message } from '../domain/conversation.interface.js';

interface redis_client {
    names?:string,
    surnames?:string,
    document_type?:string,
    document_num?:string
}

export class Conversation{
    constructor(){}

    static saveMessage = async (contact_id:string, message:message):Promise<number> =>{
        return await redisDB.rPush(contact_id, JSON.stringify(message));
    }

    static getMessages = async (contact_id:string):Promise<string[]>=>{
        return await redisDB.lRange(contact_id, -6, -1);
    }

    static saveContact = async (contact_id:string, contact:contact):Promise<void>=>{
        await redisDB.set(`contact:${contact_id}`, JSON.stringify(contact))
    }

    static getContact = async (contact_id:string):Promise<contact|null> =>{
        const contact = await redisDB.get(`contact:${contact_id}`);
        return contact ? JSON.parse(contact) : null
    }

    static getClient = async (contact_id:string):Promise<redis_client|null> =>{
        const client = await redisDB.get(`client:${contact_id}`);
        return client ? JSON.parse(client) : null
    }
    
    static saveClient = async (contact_id:string, client:redis_client):Promise<void>=>{
        await redisDB.set(`client:${contact_id}`, JSON.stringify(client))
    }

    static deleteClient = async (contact_id:string):Promise<void>=>{
        await redisDB.del(`client:${contact_id}`)
    }
}