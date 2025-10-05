import { Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";
import { AgentsUseCases } from "../application/agents.usescases.js";

export class AgentsController{
    constructor(private agentsUseCases:AgentsUseCases){}

    /**
     * List agents or get by id; supports search, pagination and view modes
    */
    list = async (req: Request, res: Response):Promise<void> => {
        try{
            if(req.params.id){
                const id = Number(req.params.id);
                const agents = await this.agentsUseCases.list(id);
                const entity = agents[0] ?? null;
                if(!entity){
                    const response404 = new ResponseDto(false, 'Agente no encontrado', null, 404);
                    res.status(404).json(response404);
                    return;
                }
                const response = new ResponseDto(true, 'Agente obtenido correctamente', entity as any, 200);
                res.status(200).json(response);
                return;
            }
            const {name, phone, company_id, alive, limit, offset, view, sortBy, sortDir} = (res.locals.search ?? req.query);
            
            const result = await this.agentsUseCases.search({
                name, phone,
                company_id: company_id ? Number(company_id) : undefined,
                alive: typeof alive !== 'undefined' ? alive === 'true' : undefined,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                view: view === 'detail' ? 'detail' : 'summary',
                sortBy,
                sortDir
            });
            
            const response = new ResponseDto(true, 'Agentes obtenidos correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al obtener agentes', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Crea un agente con payload enriquecido (status, channel, skills, intentions, character)
    */
    create = async (req: Request, res: Response):Promise<void> => {
        try{
            const agent = await this.agentsUseCases.create(req.body);
            const response = new ResponseDto(true, 'Agente creado correctamente', agent as any, 201);
            res.status(201).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al crear agente', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Actualiza un agente (name, phone, alive)
    */
    update = async (req: Request, res: Response):Promise<void> => {
        try{
            const id = Number(req.params.id);
            const agent = await this.agentsUseCases.update(id, req.body);
            const response = new ResponseDto(true, 'Agente actualizado correctamente', agent, 200);
            res.status(200).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al actualizar agente', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Delete an agent
    */
    delete = async (req: Request, res: Response):Promise<void> => {
        try{
            const id = Number(req.params.id);
            const agent = await this.agentsUseCases.delete(id);
            const response = new ResponseDto(true, 'Agente eliminado correctamente', agent as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al eliminar agente', null, 500);
            res.status(500).json(response);
        }
    }
}