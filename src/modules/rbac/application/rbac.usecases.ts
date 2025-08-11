import { Module, permission_type, Role } from "@prisma/client";
import { generateCode } from "../../../shared/utils/utils.shared.js";
import { rbacRepositoryInterface } from "../domain/repository.interface.js";

export class RbacUsesCases{
    constructor(private rbacRepository: rbacRepositoryInterface){}

    async createRol(role_data: any): Promise<Role>{
        const modules_id:number[] = [];
        const permissions:{module_id:number, permission:permission_type}[] = [];

        role_data.permissions.forEach(({module_id, permission}:any) => {
            modules_id.push(module_id);
            permissions.push(...permission.map((permission_item:permission_type) => ({module_id, permission: permission_item})))
        });

        const modules = await this.rbacRepository.getModule(modules_id);
        if(modules_id.length != modules.length) throw new Error(`Algunas de las relaciones del rol no existen`)

        const newRole = {
            permissions,
            name: role_data.name.toLowerCase(),
            code: generateCode()
        }

        return await this.rbacRepository.createRole(newRole);
    }

    async createModule(module_data:{name:string, route:string}):Promise<Module>{
        const module = await this.rbacRepository.getModule([module_data.route], 'route');
        if(module.length) throw new Error(`Ya existe esta ruta ${module_data.route}`);

        const newModule = {
            name: module_data.name.toLocaleLowerCase(),
            route: module_data.route,
            code: generateCode()
        }

        return this.rbacRepository.createModule(newModule)
    }

    async readRole():Promise<Role[]|{error:string}>{
        try {
            return await this.rbacRepository.getRole();
        } catch (error:any) {
            return {
                error: error.message
            }
        }
    }
}