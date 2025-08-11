import { NextFunction, Request, Response } from "express";
import { ParametersUsesCases } from "../application/parameters.usescases.js";

export class ParametersController{
    constructor(private parametersUsesCases: ParametersUsesCases){}

    createIntention = async(req: Request, res: Response, next: NextFunction):Promise<void>=>{
        try {
            const newIntention = await this.parametersUsesCases.createIntention(req.body);
            res.status(200).json({
                successful: true,
                message: "Intención creada correctamente",
                data: newIntention
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                data: error
            });
        }
    }

    deleteIntention = async(req: Request, res: Response, next: NextFunction):Promise<void>=>{
        try {
            const newIntention = await this.parametersUsesCases.deleteIntention(req.body.id);
            res.status(200).json({
                successful: true,
                message: "Intención eliminada correctamente",
                data: newIntention
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                data: error
            });
        }
    }

    createAIRequirements = async(req: Request, res: Response, next: NextFunction):Promise<void>=>{
        try {
            const newAIRequirements = await this.parametersUsesCases.createAIRequirements(req.body);
            res.status(200).json({
                successful: true,
                message: "AI requerimientos creados correctamente",
                data: newAIRequirements
            });


        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                data: error
            });
        }
    }

    createForm = async(req: Request, res: Response, next: NextFunction):Promise<void>=>{
        try {
            const newForm = await this.parametersUsesCases.createForm(req.body);
            res.status(200).json({
                successful: true,
                message: "Formulario creado correctamente",
                data: newForm
            });
        } catch (error:any) {
            res.status(500).json({
                successful: false,
                message: error?.message,
                data: error
            });
        }
    }
}