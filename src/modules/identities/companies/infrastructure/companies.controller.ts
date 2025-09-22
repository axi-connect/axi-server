import { Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";
import { CompaniesUseCases } from "../application/companies.usescases.js";

export class CompaniesController{
    constructor(private companiesUseCases:CompaniesUseCases){}

    /**
     * Lista compañías o devuelve una sola por id
     * Query params soportados (para lista):
     * - nit, name, city, industry
     * - limit, offset (paginación)
     * - view: 'summary' | 'detail'
     * Respuesta estandarizada con ResponseDto
    */
    list = async (req: Request, res: Response):Promise<void> =>{
        try{
            if(req.params.id){
                const id = Number(req.params.id);
                const companies = await this.companiesUseCases.list(id);
                const company = companies[0] ?? null;
                if(!company){
                    const response = new ResponseDto(false, 'Empresa no encontrada', null, 404);
                    res.status(404).json(response);
                    return;
                }
                const response = new ResponseDto(true, 'Empresa obtenida correctamente', company, 200);
                res.status(200).json(response);
                return;
            }
            const {nit, name, city, industry, limit, offset, view = 'summary', sortBy, sortDir} = (res.locals.search ?? req.query);
            const result = await this.companiesUseCases.search({
                nit, name, city, industry, view, sortBy, sortDir,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
            });
            const response = new ResponseDto(true, 'Empresas obtenidas correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al obtener empresas', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Crea una compañía
     * Body soporta campos de la compañía y company_schedule (array de {day, time_range})
     * Respuesta estandarizada con ResponseDto
    */
    create = async (req: Request, res: Response):Promise<void> =>{
        try{
            const company = await this.companiesUseCases.create(req.body);
            const response = new ResponseDto(true, 'Empresa creada correctamente', company as any, 201);
            res.status(201).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al crear empresa', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Actualiza datos de la compañía por id
     * Si se envía company_schedule, reemplaza los horarios actuales
     * Respuesta estandarizada con ResponseDto
    */
    update = async (req: Request, res: Response):Promise<void> =>{
        try{
            const id = Number(req.params.id);
            const company = await this.companiesUseCases.update(id, req.body);
            const response = new ResponseDto(true, 'Empresa actualizada correctamente', company as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al actualizar empresa', null, status);
            res.status(status).json(response);
        }
    }

    /**
     * Elimina una compañía por id
     * Respuesta estandarizada con ResponseDto
    */
    delete = async (req: Request, res: Response):Promise<void> =>{
        try{
            const id = Number(req.params.id);
            const deleted = await this.companiesUseCases.delete(id);
            const response = new ResponseDto(deleted, deleted ? 'Empresa eliminada correctamente' : 'No se pudo eliminar la empresa', deleted, deleted ? 200 : 404);
            res.status(200).json(response);
        }catch(error:any){
            const status = error?.statusCode ?? 500;
            const response = new ResponseDto(false, error?.message || 'Error al eliminar empresa', null, status);
            res.status(status).json(response);
        }
    }
}