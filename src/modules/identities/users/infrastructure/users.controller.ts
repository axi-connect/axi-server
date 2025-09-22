import { Request, Response } from "express";
import { UsersUseCases } from "../application/users.usescases.js";
import { ResponseDto } from "../../../shared/dto/response.dto.js";

export class UsersController{
    constructor(private usersUseCases:UsersUseCases){}

    /** List users or get by id; supports search, pagination and view modes */
    list = async (req: Request, res: Response):Promise<void> =>{
        try{
            if(req.params.id){
                const id = Number(req.params.id);
                const users = await this.usersUseCases.list(id);
                const response = new ResponseDto(true, 'Usuario obtenido correctamente', (users[0] ?? null) as any, 200);
                res.status(200).json(response);
                return;
            }
            const {name, email, phone, company_id, role_id, limit, offset, view, sortBy, sortDir} = (res.locals.search ?? req.query) as any;
            const result = await this.usersUseCases.search({
                name, email, phone,
                company_id: company_id ? Number(company_id) : undefined,
                role_id: role_id ? Number(role_id) : undefined,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                view: view === 'detail' ? 'detail' : 'summary',
                sortBy,
                sortDir
            });
            const response = new ResponseDto(true, 'Usuarios obtenidos correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al obtener usuarios', null, 500);
            res.status(500).json(response);
        }
    }

    /** Create user */
    create = async (req: Request, res: Response):Promise<void> =>{
        try{
            const user = await this.usersUseCases.create(req.body);
            const response = new ResponseDto(true, 'Usuario creado correctamente', user as any, 201);
            res.status(201).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al crear usuario', null, 500);
            res.status(500).json(response);
        }
    }

    /** Update user */
    update = async (req: Request, res: Response):Promise<void> =>{
        try{
            const id = Number(req.params.id);
            const user = await this.usersUseCases.update(id, req.body);
            const response = new ResponseDto(true, 'Usuario actualizado correctamente', user as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al actualizar usuario', null, 500);
            res.status(500).json(response);
        }
    }

    /** Delete user */
    delete = async (req: Request, res: Response):Promise<void> =>{
        try{
            const id = Number(req.params.id);
            const user = await this.usersUseCases.delete(id);
            const response = new ResponseDto(true, 'Usuario eliminado correctamente', user as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message || 'Error al eliminar usuario', null, 500);
            res.status(500).json(response);
        }
    }
}

