
import pkg from 'whatsapp-web.js';
import { Conversation } from './conversation.repository.js';
import { ReminderRepository } from '@/modules/reminder/infrastructure/reminder.repository.js';

const { Client, LocalAuth} = pkg;

export class WhatsappRepository{
    private client:InstanceType<typeof Client>;
    private messageTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(){
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp',
            }),
        });
    }

    listenMainStream():void{
        this.client.on("message", async (message)=>{
            const {id, name, number, pushname, isGroup} = await message.getContact();
            // Filtros de informacion
            if (message.isStatus || isGroup) return 

            const contactRedisDB = await Conversation.getContact(id._serialized);
            const contact = contactRedisDB ? contactRedisDB : {id: id._serialized, name: name ?? pushname, number, status: null, company_id: null};;

            await Conversation.saveMessage(contact.id, {role: 'customer', content: message.body});
            if (this.messageTimers.has(contact.id)) clearTimeout(this.messageTimers.get(contact.id)!);
            
            const timer = setTimeout( async () => {
                this.messageTimers.delete(contact.id);
                const items = await Conversation.getMessages(contact.id);
                
                // mainLayer({
                //     contact, 
                //     current_message: message,
                //     messages: items.map(item => JSON.parse(item))
                // }, this.agent, this.sendMessageClient);
            }, 0); //IMPORTANTE TEMPORIZADOR

            this.messageTimers.set(contact.id, timer);
        });
    }

    async restoreReminders(company_id:number){
        const reminderRepository = new ReminderRepository();
        // await reminderRepository.restoreReminders(company_id,this.sendMessageClient);
    }
}