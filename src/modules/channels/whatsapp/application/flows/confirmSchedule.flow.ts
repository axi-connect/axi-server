import { Client, periodicity } from "@prisma/client";
import clientLayer from "../layers/client.layer.js";
import { redisDB } from '../../../../../database/redis.js';
import { paramsFlow } from "../../domain/flow.interface.js";
import { AiService } from "../../../../../services/ai/index.js";
import { Conversation } from "../../infrastructure/conversation.repository.js";
import { IdentitiesRepository } from "../../../../identities/infrastructure/identities.repository.js";
import { ReminderRepository } from "../../../../reminder/infrastructure/reminder.repository.js";
import { GoogleSheetsRepository } from "../../../../../services/google/sheets.repository.js";

export default async ({history,conversation, sendMessage, storage, require_reminder}:paramsFlow):Promise<void>=>{
    try {
        console.log('confirmSchedule');

        let schedule_hystory = await redisDB.get(`schedule-hystory:${conversation.contact.id}`);
        if(!schedule_hystory){
            redisDB.set(`schedule-hystory:${conversation.contact.id}`, history);
            schedule_hystory = history
        }

        const identitiesRepository = new IdentitiesRepository();
        let [client]:Client[]|null[] = await identitiesRepository.getClient(conversation.contact.number, 'phone');

        if(!client){
            // Create Client
            const new_client = await clientLayer({conversation, sendMessage, flow_code: 'confirm-schedule', identitiesRepository});
            if(!new_client.success){
                sendMessage(conversation.contact.id, new_client.data as string)
                return;
            }
            if(new_client.data) client = new_client.data as Client;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        sendMessage(conversation.contact.id, '📅 agendando cita...');
        const prompt = `Tu objetivo es extraer la fecha y hora de la cita en formato json.
        Ejemplo de formato:
        {
            "date": "2025-02-05",
            "hour": "15:00"
        }
        
        INSTRUCCIONES:
        - La fecha debe ser en formato yyyy-mm-dd.
        - Si no encuentras la fecha y hora, devuelve null.
        - Calcula la fecha con base a la fecha actual: {CURRENT_DATE}
        `.replace('{CURRENT_DATE}', new Date().toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }));

        const aiService = new AiService();
        const response = await aiService.createChat([
            {role: 'system',content: prompt},
            {role: 'user',content: `HISTORIAL DE CONVERSACIONES\n${schedule_hystory}`}
        ], { type: "json_object" });

        if(!response) throw new Error('No se encontró la fecha y hora');
        const {date, hour} = JSON.parse(response);

        // Create Agenda
        const date_agenda = new Date(`${date}T${hour}:00-05:00`);
        const product = await redisDB.get(`product-user:${conversation.contact.id}`);
        if(!product) throw new Error('No se encontró el producto');

        const product_object = JSON.parse(product);
        const reminderRepository = new ReminderRepository();

        //Google Sheets Storage
        if(storage?.sheet){
            const googleSheets = new GoogleSheetsRepository();
            const sheet = `AGENDA-${date}`;
            const {data} = await googleSheets.getSpreadsheet();
            const sheets = data.sheets?.map(s => s.properties?.title) || [];
            if(!sheets.includes(sheet)){
                await googleSheets.createSpreadsheet(sheet, ["NOMBRES", "APELLIDOS", "TELEFONO", "HORA", "SERVICIO"]);
            }

            const result = await googleSheets.setDataSpreadsheet(sheet, [client.names, client.surnames, client.phone, hour, product_object.name]);
            if(result.status !== 200) throw new Error('Error al guardar en Google Sheets');
        }

        //Database Storage
        if(storage?.db){
            await reminderRepository.createAgenda({
                client_id: client.id,
                company_id: client.company_id,
                hour: hour,
                date: date_agenda,
                product_id: product_object.id
            });
        }

        // Reminder
        if(require_reminder){
            const today = new Date();
            const isToday = today.toDateString() === date_agenda.toDateString();

            const date_reminder = isToday
                ? new Date(date_agenda.getTime() - 30 * 60 * 1000) // 30 minutos antes
                : new Date(`${date}T18:00:00-05:00`);

            if (!isToday) date_reminder.setDate(date_reminder.getDate() - 1); // Un día antes

            const message = `Recuerda tu cita agendada\n\n 📅 ${date}\n 🕒 ${hour}\n 📦 ${product_object.name}`;
            await reminderRepository.createReminder({
                message,
                lead_id: null,
                channel: 'whatsapp',
                date: date_reminder,
                client_id: client.id,
                company_id: client.company_id,
                channel_id: conversation.contact.id,
                periodicity: 'once' as periodicity,
            }, ()=> sendMessage(conversation.contact.id, message));
        }

        await redisDB.del(`product-user:${conversation.contact.id}`);
        sendMessage(conversation.contact.id, `Cita agendada correctamente\n\n 📅 ${date}\n 🕒 ${hour}\n 📦 ${product_object.name}`);
        Conversation.saveContact(conversation.contact.id, {...conversation.contact, status:null});
    } catch (error:any) {
        Conversation.saveContact(conversation.contact.id, {...conversation.contact, status:null});
        sendMessage(conversation.contact.id, `❗Ocurrió un error, por favor intente nuevamente\nmsg: ${error.message}`);
    }
}