import { Module, permission_type, Role } from "@prisma/client";

export interface createRoleInterface{
    code: string,
    name: string,
    permissions: {module_id:number, permission:permission_type}[],
}

export interface rbacRepositoryInterface {
    getRole(options?:{value?:any,column?:string,include?:Record<string, any>}|undefined):Promise<Role[]>
    getModule(value?:any, column?:'id'|'route'|'code'):Promise<Module[]>
    createModule(module_data: {name:string, route:string, code:string}): Promise<Module>
    createRole(role_data:createRoleInterface): Promise<Role>
}