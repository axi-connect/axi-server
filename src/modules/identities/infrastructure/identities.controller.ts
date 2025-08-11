import { Request, Response } from "express";
import { IdentitiesUsesCases } from "../application/identities.usescases.js";

export class IdentitiesController{
    constructor(private identitiesUsesCases: IdentitiesUsesCases){}

    createCompany = async (req: Request, res: Response):Promise<void> => {
        try {
            const company = await this.identitiesUsesCases.createCompany(req.body);
            res.status(200).json({
                successful: true,
                message: "Empresa creada correctamente",
                data: company
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            });
        }
    }

    updateCompany = async (req: Request, res: Response):Promise<void> => {
        try {
            const {id, name, industry, address, city} = req.body;
            const company = await this.identitiesUsesCases.updateCompany(id, {name, industry, address, city});

            res.status(200).json({
                successful: true,
                message: "Empresa actualizada correctamente",
                data: company
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            });
        }
    }

    deleteCompany = async (req: Request, res: Response):Promise<void> => {
        try {
            const company = await this.identitiesUsesCases.deleteCompany(req.body.id);
            res.status(200).json({
                successful: true,
                message: "Empresa eliminada correctamente",
                data: company
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }

    readCompany = async (req: Request, res: Response):Promise<void>=>{
        try {
            const {id} = req.query;
            const company = await this.identitiesUsesCases.readCompany(Number(id));
            
            res.status(200).json({
                successful: true,
                message: "Lista de empresas generada correctamente",
                data: company
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }

    createUser = async (req: Request, res: Response):Promise<void>=>{
        try {
            const user = await this.identitiesUsesCases.createUser(req.body);
            res.status(200).json({
                successful: true,
                message: "Usuario creado correctamente",
                data: user
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            });
        }
    }

    updateUser = async (req: Request, res: Response):Promise<void> => {
        try {
            const {id, name, email, password, company_id, role_id} = req.body;
            const user = await this.identitiesUsesCases.updateUser(id, {name, email, password, company_id, role_id});

            res.status(200).json({
                successful: true,
                message: "Usuario actualizado correctamente",
                data: user
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            });
        }
    }

    deleteUser = async (req: Request, res: Response):Promise<void> => {
        try {
            const user = await this.identitiesUsesCases.deleteUser(req.body.id);
            res.status(200).json({
                successful: true,
                message: "Usuario eliminado correctamente",
                data: user
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }
    
    readUser = async (req: Request, res: Response):Promise<void> => {
        try {
            const {id} = req.query;
            const user = await this.identitiesUsesCases.readUser(Number(id));
            
            res.status(200).json({
                successful: true,
                message: "Lista de usuarios generada correctamente",
                data: user
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }

    createAgent = async (req: Request, res: Response):Promise<void> => {
        try {
            const agent = await this.identitiesUsesCases.createAgent(req.body);
            res.status(200).json({
                successful: true,
                message: "Agente creado correctamente",
                data: agent
            })
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                error
            })
        }
    }
}