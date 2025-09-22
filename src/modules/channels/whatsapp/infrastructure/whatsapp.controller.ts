import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";
import { WhatsappUseCases } from "../application/whatsapp.usescases.js";

export class WhatsappController{
    constructor(private whatsappUsesCases:WhatsappUseCases){}

    createClient = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
        try {
            if(req.query.client_id == undefined) throw new Error("No hay ID de cliente");
            const client_id:string = req.query.client_id.toString();
            const route_session = await this.whatsappUsesCases.createClient(client_id);
            const response = new ResponseDto(true, "Inicia sesión en la siguiente ruta", route_session, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message || 'Error al crear cliente de WhatsApp', null, 500);
            res.status(500).json(response);
        }
    }
}