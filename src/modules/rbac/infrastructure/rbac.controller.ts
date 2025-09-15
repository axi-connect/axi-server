import { Request, Response } from "express";
import { RbacUsesCases } from "../application/rbac.usecases.js";
import { ResponseDto } from "../../../shared/dto/response.dto.js";

export class RbacController{
    constructor(private rbacUsesCases: RbacUsesCases){}

    createRole = async (req: Request, res: Response):Promise<void> =>{
        try {
            const role = await this.rbacUsesCases.createRol(req.body);
            const response = new ResponseDto(true, 'Rol creado correctamente', role, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    readRole = async (req: Request, res:Response):Promise<void> => {
        try {
            const roles = await this.rbacUsesCases.readRole();
            const response = new ResponseDto(true, 'Lista de roles generada correctamente', roles as any, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    createModule = async (req: Request, res: Response):Promise<void> =>{
        try {
            const module = await this.rbacUsesCases.createModule(req.body);
            const response = new ResponseDto(true, 'Módulo creado correctamente', module, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }
}