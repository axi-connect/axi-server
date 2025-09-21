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
            const criteria = (res.locals as any).roleSearch;
            const result = await this.rbacUsesCases.searchRoles(criteria);
            const response = new ResponseDto(true, 'Lista de roles generada correctamente', result as any, 200);
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

    readModule = async (req: Request, res: Response):Promise<void> =>{
        try {
            const criteria = res.locals.moduleSearch;
            const result = await this.rbacUsesCases.searchModules(criteria as any);
            const response = new ResponseDto(true, 'Lista de módulos generada correctamente', result as any, 200);
            res.status(200).json(response);
        } catch (error:any) {
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    overview = async (req: Request, res: Response):Promise<void> =>{
        try{
            const criteria = res.locals.overviewSearch;
            const overview = await this.rbacUsesCases.getOverview(criteria);
            const response = new ResponseDto(true, 'Visión general generada correctamente', overview as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    auditLogs = async (req: Request, res: Response):Promise<void> =>{
        try{
            const criteria = (res.locals as any).auditSearch;
            const result = await this.rbacUsesCases.getAuditLogs(criteria as any);
            const response = new ResponseDto(true, 'Logs obtenidos correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    auditLogsByRole = async (req: Request, res: Response):Promise<void> =>{
        try{
            const criteria = (res.locals as any).auditSearch;
            const roleId = Number(req.params.id);
            const result = await this.rbacUsesCases.getAuditLogsByRole(roleId, criteria as any);
            const response = new ResponseDto(true, 'Logs por rol obtenidos correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    auditLogsByUser = async (req: Request, res: Response):Promise<void> =>{
        try{
            const criteria = (res.locals as any).auditSearch;
            const userId = Number(req.params.id);
            const result = await this.rbacUsesCases.getAuditLogsByUser(userId, criteria as any);
            const response = new ResponseDto(true, 'Logs por usuario obtenidos correctamente', result as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    updateRole = async (req: Request, res: Response):Promise<void> =>{
        try{
            const roleId = Number(req.params.id);
            const role = await this.rbacUsesCases.updateRole(roleId, req.body);
            const response = new ResponseDto(true, 'Rol actualizado correctamente', role as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    deleteRole = async (req: Request, res: Response):Promise<void> =>{
        try{
            const roleId = Number(req.params.id);
            const ok = await this.rbacUsesCases.deleteRole(roleId);
            const response = new ResponseDto(ok, ok ? 'Rol eliminado correctamente' : 'No se pudo eliminar el rol', ok, ok ? 200 : 404);
            res.status(ok ? 200 : 404).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    updateModule = async (req: Request, res: Response):Promise<void> =>{
        try{
            const moduleId = Number(req.params.id);
            const module = await this.rbacUsesCases.updateModule(moduleId, req.body);
            const response = new ResponseDto(true, 'Módulo actualizado correctamente', module as any, 200);
            res.status(200).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }

    deleteModule = async (req: Request, res: Response):Promise<void> =>{
        try{
            const moduleId = Number(req.params.id);
            const ok = await this.rbacUsesCases.deleteModule(moduleId);
            const response = new ResponseDto(ok, ok ? 'Módulo eliminado correctamente' : 'No se pudo eliminar el módulo', ok, ok ? 200 : 404);
            res.status(ok ? 200 : 404).json(response);
        }catch(error:any){
            const response = new ResponseDto(false, error?.message ?? 'Error', null, 500);
            res.status(500).json(response);
        }
    }
}