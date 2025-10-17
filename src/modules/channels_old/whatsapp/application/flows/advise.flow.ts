import { AiService } from "../../../../../services/ai/index.js";
import { paramsFlow } from "../../domain/flow.interface.js";

const PROMPT_SKETCH = `Como agente virtual experto en atencion al cliente de {COMPANY_ACTIVITY} en la empresa {COMPANY_NAME}, tu objetivo es ayudar al cliente a encontrar el producto que necesita.
HISTORIAL DE CONVERSACIONES:
{HISTORY}

CATALOGO:
{CATALOG}

INSTRUCCIONES:
{INSTRUCTIONS}
`;

export default async ({history, conversation, sendMessage, catalog, instructions, company}: paramsFlow):Promise<void> =>{    
    console.log('advise');
    const content = PROMPT_SKETCH
    .replace('{HISTORY}', history)
    .replace('{COMPANY_NAME}', company?.name || '')
    .replace('{CATALOG}', catalog || 'No hay catalogo disponible')
    .replace('{COMPANY_ACTIVITY}', company?.activity_description || '')
    .replace('{INSTRUCTIONS}', instructions || 'No hay instrucciones disponibles');

    const aiService = new AiService();

    const advise = await aiService.createChat([{
        role: 'system', content
    }]);

    if(!advise) return;
    const chunks = advise.split(/(?<!\d)\.\s+/g);
    for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        sendMessage(conversation.contact.id, chunk.trim());
    }
}