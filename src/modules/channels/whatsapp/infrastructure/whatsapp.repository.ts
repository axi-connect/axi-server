import fs from 'fs';
import path from 'path';
import qr from 'qr-image';
import pkg from 'whatsapp-web.js';
import { Conversation } from './conversation.repository.js';
import mainLayer from '../application/layers/main.layer.js';
import { agentDependency } from '../../../identities/domain/repository.interface.js';
import { ReminderRepository } from '../../../reminder/infrastructure/reminder.repository.js';
const { Client, LocalAuth} = pkg;

export class WhatsappRepository{
    private client:InstanceType<typeof Client>;
    private messageTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(private readonly agent:agentDependency){
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: agent.client_id,
                // dataPath: path.join(__dirname, '..', '..', '..', '..', 'data', 'whatsapp'),
            }),
            puppeteer: {
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            },
        });

        this.client.once("ready", async () => {
            const number_admin = "573224970950";
            const number_id = await this.client.getNumberId(number_admin);

            this.client.sendMessage(number_id?._serialized || "", `Whatsapp client is ready: ${this.agent.client_id}`);

            this.listenMainStream();
        });

        this.client.once("auth_failure", ()=>{
            console.log("error Whatsapp")
        });
    }

    generateQrCode(qr_string:string):string{
        const qr_image = qr.image(qr_string, {type: 'svg'});
        const file_name = `qr-${Date.now()}.svg`;
        const file_path =  path.join(process.cwd(), 'src', 'public', 'qr-images', file_name);
        qr_image.pipe(fs.createWriteStream(file_path));

        console.log(`QR generado en la carpeta: ${file_path}`);
        return file_path;
    }

    listenMainStream():void{
        this.client.on("message", async (message)=>{
            const {id, name, number, pushname, isGroup} = await message.getContact();
            // Filtros de informacion
            if (message.isStatus || isGroup) return 

            const contactRedisDB = await Conversation.getContact(id._serialized);
            const contact = contactRedisDB ? contactRedisDB : {id: id._serialized, name: name ?? pushname, number, status: null, company_id: this.agent.company_id};;

            await Conversation.saveMessage(contact.id, {role: 'customer', content: message.body});
            if (this.messageTimers.has(contact.id)) clearTimeout(this.messageTimers.get(contact.id)!);
            
            const timer = setTimeout( async () => {
                this.messageTimers.delete(contact.id);
                const items = await Conversation.getMessages(contact.id);
                
                mainLayer({
                    contact, 
                    current_message: message,
                    messages: items.map(item => JSON.parse(item))
                }, this.agent, this.sendMessageClient);
            }, 0); //IMPORTANTE TEMPORIZADOR

            this.messageTimers.set(contact.id, timer);
        });
    }

    sendMessageClient = (
        contact_id:string, 
        message:string,
    ):void =>{
        Conversation.saveMessage(contact_id, {role: 'agent', content: message})
        this.client.sendMessage(contact_id, message)
    }

    async restoreReminders(company_id:number){
        const reminderRepository = new ReminderRepository();
        await reminderRepository.restoreReminders(company_id,this.sendMessageClient);
    }

    initialize():Promise<string|null>{
        this.client.initialize();
        return new Promise((resolve, reject)=>{
            this.client.on('qr', (qr:string)=>{
                resolve(qr);
            });

            this.client.on('authenticated', ()=>{
                resolve(null);
            });
        })
    }
}