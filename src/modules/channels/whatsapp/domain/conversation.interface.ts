import { Message } from "whatsapp-web.js"

export interface message{
    role: 'customer'|'agent',
    content: string
}

export interface contact{
    id:string,
    name:string,
    number:string,
    company_id:number,
    status:{

        name: string,
        ask: number
    }|null
}

export interface conversation{
    contact: contact,
    messages: message[],
    current_message: Message,
}

export interface sendMessageClient{
    (contact_id:string, message:string):void
}