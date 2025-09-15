import { Message } from "whatsapp-web.js";
import { AiService } from "../../../../../services/ai/index.js";
import { ClientsRepositoryInterface } from "../../../../clients/domain/repository.interface.js";
import { ParametersRepository } from "../../../../parameters/infrastructure/parameters.repository.js";
import { conversation, sendMessageClient } from "../../domain/conversation.interface.js";
import { Conversation } from "../../infrastructure/conversation.repository.js";
import { Client } from '@prisma/client';

type ValidateFieldKeys = keyof typeof validateFieldValues;

interface validateFieldResponse{
    status: boolean;
    data: any|null;
    message: string;
}

var client_redis:any|null = null;

const nextAsk = (ask_number:number, conversation:conversation, flow_code:string)=>{
    Conversation.saveContact(conversation.contact.id, {...conversation.contact, status:{name: flow_code, ask: ask_number}});
}

const saveClient = async (contact_id:string, client_data:any)=>{
    if(client_redis){
        const client = {...client_redis, ...client_data}
        await Conversation.saveClient(contact_id, client)
        return client;
    }else{
        await Conversation.saveClient(contact_id, client_data)
        return client_data;
    }
}

const validateFieldValues = {
    document_type: async (value:string, options:string[]):Promise<validateFieldResponse>=>{
        const response:validateFieldResponse = {status: false, data: null, message: ''};

        let message = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const askDocumentTypeAI = options.map(option => `ID= ${option}`).join('\n');

        const prompt = `Tu objetivo es extraer el tipo de documento segun la sigueinte lista.
        Lista de documentos:
        ${askDocumentTypeAI.toLowerCase()}

        Retorna la respuesta en formato json. Ejemplo de formato:
        {
            "document_type": "cc"
        }

        INSTRUCCIONES:
        - Devuelve unicamente el resultado en formato json.
        `;

        const aiService = new AiService();
        const document_type = await aiService.createChat([
            {role: 'system',content: prompt},
            {role: 'user',content: message}
        ], { type: "json_object" });

        if(!document_type){
            response.message = 'No se pudo obtener el tipo de documento';
            return response;
        }

        const document_type_data = JSON.parse(document_type);

        if(document_type_data.document_type){
            response.status = true;
            response.data = document_type_data.document_type;
            response.message = 'Documento validado correctamente';
        } else {
            const optionsType = options.map((option, index) => `${index + 1}. ${option}`).join('\n');
            response.message = `Asegurate de elegir una de las siguientes opciones:\n${optionsType}`;
        }

        return response
    },
    birthdate: async (value:string, options:string[]|null):Promise<validateFieldResponse>=>{
        const response:validateFieldResponse = {status: false, data:null, message: ''};

        const prompt = `Tu objetivo es extraer la fecha de nacimiento en el siguiente formato: yyyy-mm-dd.
        Retorna la respuesta en formato json. Ejemplo de formato:
        {"birthdate": "2000-01-10"}
        `;

        const aiService = new AiService();
        const birthdate = await aiService.createChat([{
            role: 'system',
            content: prompt
        },{
            role: 'user',
            content: value
        }], { type: "json_object" });


        if(!birthdate){
            response.message = 'No se pudo obtener la fecha de nacimiento';
            return response;
        }

        const birthdate_data = JSON.parse(birthdate);

        if(birthdate_data.birthdate){
            response.status = true;
            response.data = birthdate_data.birthdate.trim();
            response.message = 'Fecha de nacimiento validada correctamente';
        } else {
            response.message = 'Asegurate de ingresar una fecha de nacimiento en el formato dd/mm/yyyy';
        }

        return response;
    },
    email: async (value:string):Promise<validateFieldResponse>=>{
        const response:validateFieldResponse = {status: false, data:null, message: ''};
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

        if(!emailRegex.test(value)){
            response.message = 'Asegurate de ingresar un correo electrónico válido';
            return response;
        }

        response.status = true;
        response.data = value.toLowerCase();
        response.message = 'Correo electrónico validado correctamente';
        return response;
    }, 
    address: async (value:string, options:string[]|null, message:Message):Promise<validateFieldResponse>=>{
        const response:validateFieldResponse = {status: false, data:null, message: ''};
        if (message.type === 'location') {
            const {latitude, longitude} = message.location;
            response.status = true;
            response.data = JSON.stringify({latitude, longitude});
        }else{
            response.message = 'Asegurate de enviar una ubicación';
        }

        return response;
    }
}

export default async ({
    flow_code, 
    conversation, 
    sendMessage, 
    identitiesRepository
}:{
    flow_code:string, 
    conversation:conversation, 
    sendMessage:sendMessageClient, 
    identitiesRepository: ClientsRepositoryInterface,
}):Promise<{data:null|Client|string, success:boolean}> => {
    client_redis = await Conversation.getClient(conversation.contact.id);
    const contact = await Conversation.getContact(conversation.contact.id);
    const response:{data:null|Client|string, success:boolean} = {data: null, success: false};

    const parametersRepository = new ParametersRepository();
    const [form] = await parametersRepository.getForm({
        company_id: conversation.contact.company_id,
        table_name: 'client'
    });

    if(!form) throw new Error('No se encontró el formulario');

    if(!client_redis && !contact?.status){
        sendMessage(conversation.contact.id, 'Ok, voy a pedirte unos datos para agendar');
        await new Promise(resolve => setTimeout(resolve, 2000));
        sendMessage(conversation.contact.id, form.fields[0].placeholder);
        nextAsk(0, conversation, flow_code);
        return response;
    }

    if(conversation.contact?.status?.ask === undefined) throw new Error('No existe la propiedad: conversation.contact?.status?.ask')
    // IMPORTANTE: FALTAN MUCHAS VALIDACIONES DE INFORMACION
    for (let i = 0; i < form.fields.length; i++) {
        if (conversation.contact?.status?.ask === i) {
            const field = form.fields[i];
            let client_redis_data:any;

            if(field.key === 'phone'){
                nextAsk(i + 1, conversation, flow_code);
                break;
            }

            if(validateFieldValues[field.key as ValidateFieldKeys]){
                const validateField = await validateFieldValues[field.key as ValidateFieldKeys](conversation.current_message.body, field.options, conversation.current_message);
                if(!validateField.status){
                    sendMessage(conversation.contact.id, validateField.message);
                    break;
                }else{
                    client_redis_data = await saveClient(conversation.contact.id, {
                        [field.key]: validateField.data
                    });
                }
            }else{
                client_redis_data = await saveClient(conversation.contact.id, {
                    [field.key]: conversation.current_message.body.toUpperCase()
                });
            }

            if(i + 1 <= form.fields.length - 1){
                const next_field = form.fields[i + 1];
                sendMessage(conversation.contact.id, next_field.placeholder);
                nextAsk(i + 1, conversation, flow_code);
            }else{
                sendMessage(conversation.contact.id, 'Muchas gracias por completar la información');
                try{
                    const client_data = {
                        ...client_redis_data,
                        phone: conversation.contact.number,
                        company_id: conversation.contact.company_id,
                    };

                    if(client_redis_data.document_num){
                        client_data.document_num = Number(client_redis_data.document_num);
                    }

                    if(client_redis_data.birthdate){
                        client_data.birthdate = new Date(client_redis_data.birthdate);
                    }

                    const client_db = await identitiesRepository.createClient(client_data as any);
                    Conversation.deleteClient(conversation.contact.id);
                    response.success = true; response.data = client_db;
                }catch(error){
                    console.log(error);
                    response.success = false; response.data = 'Error al crear el cliente';
                }
            }

            break;
            // if(next_field.options){
            //     await new Promise(resolve => setTimeout(resolve, 1000));
            //     const optionsType = next_field.options.map((option, index) => `${index + 1}. ${option}`).join('\n');
            //     sendMessage(conversation.contact.id, optionsType);   
            // }
        }
    }

    return response;
}
