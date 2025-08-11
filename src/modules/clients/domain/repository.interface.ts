import { Client } from "@prisma/client";

export interface createClientInterface {
    names: string;
    surnames: string;
    document_type?: 'cc' | 'ti' | 'ce';
    document_num?: number;
    birthdate?: Date;
    email?: string;
    phone: string;
    city?: string;
    address?: string;
    neighborhood?: string;
    company_id:number
}

export interface getClientInterface{
    value:any;
    column:string;
    operator:'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'between' | 'not_between' | 'and' | 'or';
}

export interface ClientsRepositoryInterface{
    createClient(client_data:createClientInterface):Promise<Client>
    getClient(value?:any, column?:string):Promise<Client[]>
    updateClient(client_data:any):Promise<Client>
    deleteClient(client_id:number):Promise<Client>
}