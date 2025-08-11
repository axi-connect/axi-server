import { Request, Response } from "express";
import { RbacUsesCases } from "../application/rbac.usecases.js";

export class RbacController{
    constructor(private rbacUsesCases: RbacUsesCases){}

    createRole = async (req: Request, res: Response):Promise<void> =>{
        try {
            const role = await this.rbacUsesCases.createRol(req.body);
            res.status(200).json({
                successful: true,
                message: "Rol creado correctamente",
                data: role
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error: error
            })
        }
    }

    readRole = async (req: Request, res:Response):Promise<void> => {
        try {
            const roles = await this.rbacUsesCases.readRole();
            res.status(200).json({
                successful: true,
                message: "Lista de roles generada correctamente",
                data: roles
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error: error
            })
        }
    }

    createModule = async (req: Request, res: Response):Promise<void> =>{
        try {
            const module = await this.rbacUsesCases.createModule(req.body);
            res.status(200).json({
                successful: true,
                message: "Módulo creado correctamente",
                data: module
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error: error
            })
        }
    }
}