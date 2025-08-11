import { AiService } from "../../../../../services/ai/index.js";

const PROMPT_SKETCH = `Tu tarea es analizar el contexto de una conversación y determinar la acción más adecuada en función de su descripción, retorna una sola palabra con una de las tres posibles opciones.
Historial de conversaciones (Cliente/Vendedor):
-------------------
{HISTORY}
-------------------
Posibles acciones a seleccionar:
{INTENTIONS}
Su tarea es comprender la intención del cliente y seleccionar la acción más adecuada en respuesta a su declaración. Recuerde, no puede seleccionar "CONFIRMAR" a menos que haya una conversación previa con el vendedor donde se acuerde una fecha y hora.
Respuesta ideal (PROGRAMAR|HABLAR|CONFIRMAR-CITA):`;

export default async (history:string, intentions:string):Promise<string> => {
    const PROMPT = PROMPT_SKETCH
    .replace('{HISTORY}', history)
    .replace('{INTENTIONS}', intentions);

    const aiService = new AiService();
    const intention = await aiService.createChat([{
        role: 'system',
        content: PROMPT
    }]);

    return intention ?? 'ERROR';
}