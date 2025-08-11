import { Module, PrismaClient, Role } from "@prisma/client";
import { createRoleInterface, rbacRepositoryInterface } from "../../rbac/domain/repository.interface.js"; 

export class RbacRepository implements rbacRepositoryInterface {
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
    }

    async getModule(value?:any[], by:'route'|'id'|'code' = 'id'):Promise<Module[]>{
        return await this.db.module.findMany({
            where: value ? {[by]: {in: value}} : undefined
        })
    }

    async createModule(module_data:{name:string, route:string, code: string}):Promise<Module>{
        return await this.db.module.create({data: module_data})
    }

    async createRole(role_data:createRoleInterface):Promise<Role>{
        const {name, permissions, code} = role_data;

        return await this.db.role.create({
            data: {
                name,
                code,
                role_module: {
                    create: permissions
                }
            },
            include: {
                role_module: true
            }
        })
    }

    async getRole(options?:{
        value?:any, 
        column?:string, 
        include?:Record<string, any>
    }): Promise<Role[]> {
        let value = options?.value;
        let include = options?.include;
        let column = options?.column ?? 'id';

        return await this.db.role.findMany({
            include,
            where: value ? {[column]: {in: [value]}} : undefined,
        });
    }
}