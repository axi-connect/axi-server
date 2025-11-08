import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";

export class AIService{
    private openai:OpenAI;

    constructor(
        private model:string = 'deepseek-chat'
        // private model:string = 'deepseek-ai/DeepSeek-V3'
    ){
        this.openai = new OpenAI({
            baseURL: process.env.AI_BASE_URL,
            apiKey: process.env.AI_API_KEY
        });
    }

    createChat = async (
        messages: ChatCompletionMessageParam[],
        response_format?: { type: "json_object" }
    ):Promise<string|null>=>{
        try {
            const body:any = {model: this.model,messages, temperature: 0, stream: false}
            if(response_format) body.response_format = response_format;
            const completion = await this.openai.chat.completions.create(body);
            return completion.choices[0].message.content;
        } catch (error) {
            console.log(error)
            return null
        }
    }
}