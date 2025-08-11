import { NextFunction, Request, Response } from "express";
import { WhatsappUseCases } from "../application/whatsapp.usescases.js";

export class WhatsappController{
    constructor(private whatsappUsesCases:WhatsappUseCases){}

    createClient = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
        try {
            if(req.query.client_id == undefined) throw new Error("No hay ID de cliente");
            const client_id:string = req.query.client_id.toString();
            const route_session = await this.whatsappUsesCases.createClient(client_id);
            
            res.status(200).json({
                successful: true,
                message: "Inicia sesion en la siguiente ruta",
                data: route_session
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }
}