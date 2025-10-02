import { Request, Response } from "express";
import { AuthUsesCases } from "../application/auth.usescases.js";
import { ResponseDto } from "../../../shared/dto/response.dto.js";

export class AuthController{
    constructor(private authUsesCases:AuthUsesCases){}

    login = async(req: Request, res: Response)=>{
        try {
            const data = await this.authUsesCases.login(req.body)
            const response = new ResponseDto(true, 'Bienvenido', data, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const status = error?.message?.includes('usuario') || error?.message?.includes('Contraseña') ? 401 : 500;
            const response = new ResponseDto(false, error.message, null, status);
            res.status(status).json(response);
        }
    }

    refresh = async (req: Request, res: Response) => {
        try {
            const { refresh_token } = req.body as { refresh_token: string };
            const data = await this.authUsesCases.refresh(refresh_token);
            const response = new ResponseDto(true, 'Token renovado', data, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message ?? 'Error al renovar token', null, 401);
            res.status(401).json(response);
        }
    }

    logout = async (_req: Request, res: Response) => {
        const req = _req as Request & { user_id: number };
        if(!req.user_id){
            const response = new ResponseDto(false, 'No autorizado', null, 401);
            res.status(401).json(response);
            return;
        }
        await this.authUsesCases.logout(req.user_id);
        const response = new ResponseDto(true, 'Sesión cerrada', null, 200);
        res.status(200).json(response);
    }

    me = async(req: Request, res: Response) => {
        try {
            const userId = req.user_id;
            if(!userId){
                const response = new ResponseDto(false, 'No autorizado', null, 401);
                res.status(401).json(response);
                return;
            }
            const data = await this.authUsesCases.me(Number(userId));
            const response = new ResponseDto(true, 'Usuario', data, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 500);
            res.status(500).json(response);
        }
    }
}