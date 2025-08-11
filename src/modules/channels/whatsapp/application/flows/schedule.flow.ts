import adviseFlow from './advise.flow.js';
import productLayer from '../layers/product.layer.js';
import { redisDB } from '../../../../../database/redis.js';
import { paramsFlow } from "../../domain/flow.interface.js";
import { AiService } from "../../../../../services/ai/index.js";
import { GoogleSheetsRepository } from "../../../../../services/google/sheets.repository.js";
import { ReminderRepository } from '../../../../reminder/infrastructure/reminder.repository.js';

const getSummary = async (date:string, storage:paramsFlow['storage']):Promise<string>=>{
    let summary:string = 'Agenda disponible en el horario de atencion';
    
    if(storage?.sheet){
        const googleSheets = new GoogleSheetsRepository();
        const sheet = `AGENDA-${date}`;
        const spreadsheet = await googleSheets.getSpreadsheet();
        const sheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

        if(sheets.includes(sheet)){
            const dataSpreadsheet = await googleSheets.getDataSpreadsheet(sheet);
            const valueSpreadsheet = dataSpreadsheet?.values;
            if (!valueSpreadsheet) return 'ERROR';

            for (let i = 1; i < valueSpreadsheet.length; i++) {
                const [nombres, apellidos, telefono, hora] = valueSpreadsheet[i];
                summary += `Espacio reservado (no disponible) hora:${hora}\n`;
            }
        }
    }else{
        const startDate = new Date(date);
        const endDate = new Date(date);
        const reminderRepository = new ReminderRepository();
        const reminders = await reminderRepository.getAgenda({date:{gte: startDate,lt: endDate}});

        if(!reminders.length) return 'No hay agenda programadas';
        for (const reminder of reminders) {
            summary += `Espacio reservado (no disponible) hora:${reminder.hour}\n`;
        }
    }

    return summary;
}

export default async ({sendMessage, conversation, history, instructions, storage, catalog_object, company, schedule}:paramsFlow):Promise<void> =>{
    try {
        console.log('schedule');
        
        let product_redis = await redisDB.get(`product-user:${conversation.contact.id}`);
        if(!product_redis){
            const product = await productLayer(conversation, history, catalog_object);
            if(!product){
                adviseFlow({
                    sendMessage,
                    conversation,
                    history,
                    instructions: "- Respuestas cortas para enviar por WhatsApp con emojis.\n- Si el usuario desea ordenar o agendar una cita debes confirmar el producto a solicitar.",
                    storage,
                    catalog_object,
                    company
                });
                return;
            }
            redisDB.set(`product-user:${conversation.contact.id}`, JSON.stringify(product));
        }

        const current_day = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric'});
        const current_time = new Date().toLocaleString('en-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    
        const aiService = new AiService();
        const response = await aiService.createChat([
            {
                role: 'system', 
                content: `Tu objetivo es analizar la conversación y extraer la fecha de la cita en formato json.
                La fecha debe ser en formato yyyy-mm-dd.
                Ejemplo de formato:
                {
                    "date": "2025-02-05",
                }

                INSTRUCCIONES:
                - La fecha debe ser en formato yyyy-mm-dd.
                - Calcula la fecha con base a la fecha actual: ${current_day}
                - Si no hay una fecha especifica, devuelve null.
                `
            }, {role: 'user',content: history}
        ], { type: "json_object" });

        const {date} = JSON.parse(response || '{}');

        if(!date){
            sendMessage(conversation.contact.id, '📅 ¿Para que día quieres agendar la cita?');
            return;
        }

        // if(date_string < current_day) throw new Error('La fecha no puede ser menor a la fecha actual');
        sendMessage(conversation.contact.id, 'dame un momento para consultar la agenda...');
        const summary = await getSummary(date, storage);
        const dayNumber = new Date(date).getUTCDay();
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const current_schedule = schedule?.find((s) => s.day === days[dayNumber]);
        const schedule_string = current_schedule ? current_schedule.time_range : "NO HAY SERVICIO";

        const content = `Como agente virtual experto en programación de reuniones, su objetivo es analizar la conversación, consultar la agenda disponible y responderle al usuario al determinar la fecha y hora.
        HORA ACTUAL: ${current_time}
        HORARIO DE ATENCIÓN: ${schedule_string}

        AGENDA
        ${summary}

        INSTRUCCIONES:
        - Si el usuario solicita una hora ya ocupada en la AGENDA, proponga un horario diferente.
        - No agendar una hora que esté fuera del HORARIO DE ATENCIÓN y si no hay servicio comunicarle al usuario que no hay disponibilidad ese día.
        - No agendar una hora anterior a la HORA ACTUAL.
        - Respuestas cortas en primera persona para enviar por WhatsApp con emojis.
        - Si hay disponibilidad deberá indicarle al usuario que confirme
        ${instructions}`;

        const adviseTime = await aiService.createChat([
            {role: 'system', content}, 
            {role: 'user', content: `HISTORIAL DE CONVERSACIONES\n${history}`}
        ]);

        if(!adviseTime) return;
        const chunks = adviseTime.split(/(?<!\d)\.\s+/g);
        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            sendMessage(conversation.contact.id, chunk.trim());
        }
    } catch (error:any) {
        console.error('Error en schedule.flow:', error.status);
        sendMessage(conversation.contact.id, `❗Ocurrió un error, por favor intente nuevamente\nmsg: ${error.message}`);
    }
}