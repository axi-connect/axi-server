import { paramsFlow } from "../../domain/flow.interface.js";
import { Conversation } from "../../infrastructure/conversation.repository.js";

export default async ({conversation, sendMessage}:paramsFlow):Promise<void> => {
    Conversation.saveContact(conversation.contact.id, {...conversation.contact, status:null});
    sendMessage(conversation.contact.id, '❗Acción cancelada');
}
