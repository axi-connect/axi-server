import { Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";
import { ParametersUsesCases } from "../application/parameters.usescases.js";

export class ParametersController{
    constructor(private parametersUsesCases: ParametersUsesCases){}

    createIntention = async(req: Request, res: Response):Promise<void>=>{
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

    createAgentCharacter = async(req: Request, res: Response):Promise<void>=>{
        try{
            const character = await this.parametersUsesCases.createAgentCharacter(req.body);
            const response = new ResponseDto(true, 'Personaje creado correctamente', character as any, 201);
            res.status(201).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al crear personaje', null, 500);
            res.status(500).json(response);
        }
    }

    createAIRequirements = async(req: Request, res: Response):Promise<void>=>{
        try {
            const newAIRequirements = await this.parametersUsesCases.createAIRequirements(req.body);
            const response = new ResponseDto(true, "AI requerimientos creados correctamente", newAIRequirements as any, 201);
            res.status(201).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message || 'Error al crear AI requerimientos', null, 500);
            res.status(500).json(response);
        }
    }

    listIntentions = async(req: Request, res: Response):Promise<void>=>{
        try{
            const search = (res.locals as any).intentionSearch || req.query;
            const result = await this.parametersUsesCases.searchIntentions(search);
            const response = new ResponseDto(true, 'Intenciones obtenidas correctamente', result, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al listar intenciones', null, 500);
            res.status(500).json(response);
        }
    }

    overviewIntentions = async(req: Request, res: Response):Promise<void>=>{
        try{
            const result = await this.parametersUsesCases.overviewIntentions();
            const response = new ResponseDto(true, 'Visión general de intenciones obtenida correctamente', result, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al obtener visión general de intenciones', null, 500);
            res.status(500).json(response);
        }
    }

    listCharacters = async(req: Request, res: Response):Promise<void>=>{
        try{
            const search = (res.locals as any).characterSearch || req.query;
            const result = await this.parametersUsesCases.searchAgentCharacters(search);
            const response = new ResponseDto(true, 'Personajes obtenidos correctamente', result, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al listar personajes', null, 500);
            res.status(500).json(response);
        }
    }

    listAIRequirements = async(req: Request, res: Response):Promise<void>=>{
        try{
            const search = (res.locals as any).aiRequirementSearch || req.query;
            const result = await this.parametersUsesCases.searchAIRequirements(search);
            const response = new ResponseDto(true, 'Requisitos de IA obtenidos correctamente', result, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al listar requisitos de IA', null, 500);
            res.status(500).json(response);
        }
    }

    updateIntention = async(req: Request, res: Response):Promise<void>=>{
        try{
            const id = Number(req.params.id);
            const updated = await this.parametersUsesCases.updateIntention(id, req.body);
            const response = new ResponseDto(true, 'Intención actualizada correctamente', updated as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al actualizar intención', null, 500);
            res.status(500).json(response);
        }
    }

    updateAgentCharacter = async(req: Request, res: Response):Promise<void>=>{
        try{
            const id = Number(req.params.id);
            const updated = await this.parametersUsesCases.updateAgentCharacter(id, req.body);
            const response = new ResponseDto(true, 'Personaje actualizado correctamente', updated as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al actualizar personaje', null, 500);
            res.status(500).json(response);
        }
    }

    updateAIRequirement = async(req: Request, res: Response):Promise<void>=>{
        try{
            const id = Number(req.params.id);
            const updated = await this.parametersUsesCases.updateAIRequirement(id, req.body);
            const response = new ResponseDto(true, 'Requisito de IA actualizado correctamente', updated as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al actualizar requisito de IA', null, 500);
            res.status(500).json(response);
        }
    }

    deleteIntention = async(req: Request, res: Response):Promise<void>=>{
        try {
            const id = Number(req.params.id ?? req.body.id);
            const ok = await this.parametersUsesCases.deleteIntention(id);
            const response = new ResponseDto(true, 'Intención eliminada correctamente', ok, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message || 'Error al eliminar intención', null, 500);
            res.status(500).json(response);
        }
    }

    deleteAgentCharacter = async(req: Request, res: Response):Promise<void>=>{
        try{
            const id = Number(req.params.id);
            const ok = await this.parametersUsesCases.deleteAgentCharacter(id);
            const response = new ResponseDto(true, 'Personaje eliminado correctamente', ok, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al eliminar personaje', null, 500);
            res.status(500).json(response);
        }
    }

    deleteAIRequirement = async(req: Request, res: Response):Promise<void>=>{
        try{
            const id = Number(req.params.id);
            const ok = await this.parametersUsesCases.deleteAIRequirement(id);
            const response = new ResponseDto(true, 'Requisito de IA eliminado correctamente', ok, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al eliminar requisito de IA', null, 500);
            res.status(500).json(response);
        }
    }
}