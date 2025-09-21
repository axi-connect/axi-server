import { Module, permission_type, Role } from "@prisma/client";
import { HttpError } from "../../../shared/errors/http.error.js";
import { generateCode } from "../../../shared/utils/utils.shared.js";
import { ModuleSearchInterface, OverviewDTO, OverviewSearchInterface, RoleSearchInterface, AuditSearchInterface, rbacRepositoryInterface, UpdateRoleInput, UpdateModuleInput } from "../domain/repository.interface.js";

interface createModuleInterface {
    name: string;
    path: string;
    icon: string;
    parent_id: number;
    is_public: boolean;
}

export class RbacUsesCases{
    constructor(private rbacRepository: rbacRepositoryInterface){}

    async createRol(role_data: any): Promise<Role>{
        const modules_id:number[] = [];
        const permissions:{module_id:number, permission:permission_type[]}[] = [];

        role_data.permissions.forEach(({module_id, permission}:any) => {
            modules_id.push(module_id);
            permissions.push({ module_id, permission });
        });

        const modules = await this.rbacRepository.getModule(modules_id);
        if(modules_id.length != modules.length) throw new Error(`Algunas de las relaciones del rol no existen`)

        const newRole = {
            permissions,
            name: role_data.name.toLowerCase(),
            code: generateCode(),
            description: role_data.description ?? null,
            hierarchy_level: typeof role_data.hierarchy_level === 'number' ? role_data.hierarchy_level : 0,
            state: (role_data.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
        }

        return await this.rbacRepository.createRole(newRole);
    }

    async createModule(module_data:createModuleInterface):Promise<Module>{
        let parent:Module[] | any = [];
        const module = await this.rbacRepository.getModule([module_data.path], 'path');
        if(module.length) throw new Error(`Ya existe esta ruta ${module_data.path}`);

        if(module_data.parent_id){
            parent = await this.rbacRepository.getModule([module_data.parent_id], 'id');
            if(!parent.length) throw new Error(`El padre no existe`);
        }

        const newModule = {
            code: generateCode(),
            icon: module_data.icon,
            path: module_data.path,
            parent_id: module_data.parent_id,
            is_public: module_data.is_public,
            name: module_data.name.toLocaleLowerCase(),
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

    async readModule():Promise<Module[]|{error:string}>{
        try{
            return await this.rbacRepository.getModule();
        }catch(error:any){
            return { error: error.message };
        }
    }

    /**
     * Listar roles con filtros, paginación y vista (summary/detail)
    */
    async searchRoles(search: RoleSearchInterface): Promise<{ roles: any[], total: number }>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if (mode === 'detail') return this.rbacRepository.findRolesDetail(search);
        return this.rbacRepository.findRolesSummary(search);
    }

    /**
     * Actualiza los datos del rol y sus permisos (reemplazo completo si se envían)
    */
    async updateRole(role_id:number, data: UpdateRoleInput): Promise<Role> {
        // Ensure role exists
        const exists = await this.rbacRepository.getRoleById(role_id);
        if (!exists) {
            throw new HttpError(404, 'Rol no encontrado');
        }
        // Validate hierarchy level range at usecase layer too
        if (typeof data.hierarchy_level === 'number' && (data.hierarchy_level < 0 || data.hierarchy_level > 3)){
            throw new Error('El hierarchy_level debe estar entre 0 y 3');
        }

        // If permissions passed, validate modules exist
        if (Array.isArray(data.permissions) && data.permissions.length > 0){
            const moduleIds = data.permissions.map(p=>p.module_id);
            const modules = await this.rbacRepository.getModule(moduleIds);
            if (modules.length !== moduleIds.length) throw new Error('Algunas de las relaciones del rol no existen');
        }

        return this.rbacRepository.updateRole(role_id, data);
    }

    /**
     * Elimina un rol por id
     */
    async deleteRole(role_id:number): Promise<boolean> {
        const exists = await this.rbacRepository.getRoleById(role_id);
        if (!exists) {
            throw new HttpError(404, 'Rol no encontrado');
        }
        return this.rbacRepository.deleteRole(role_id);
    }

    /**
     * Listar módulos con filtros, paginación y vista (summary/detail)
     */
    async searchModules(search: ModuleSearchInterface): Promise<{ modules: any[], total: number }>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if (mode === 'detail') return this.rbacRepository.findModulesDetail(search);
        return this.rbacRepository.findModulesSummary(search);
    }

    async updateModule(module_id:number, data: UpdateModuleInput): Promise<Module>{
        if (data.path){
            const exists = await this.rbacRepository.getModule([data.path], 'path');
            if (exists.length && exists[0].id !== module_id) throw new Error(`Ya existe esta ruta ${data.path}`);
        }
        if (data.parent_id){
            const parent = await this.rbacRepository.getModule([data.parent_id], 'id');
            if (!parent.length) throw new Error('El padre no existe');
        }
        if (data.name) data.name = data.name.toLowerCase();
        return this.rbacRepository.updateModule(module_id, data);
    }

    async deleteModule(module_id:number): Promise<boolean>{
        return this.rbacRepository.deleteModule(module_id);
    }

    /**
     * Overview snapshot of RBAC
    */
    async getOverview(search: OverviewSearchInterface): Promise<OverviewDTO>{
        return this.rbacRepository.getOverview(search);
    }

    /**
     * Audit logs
    */
    async getAuditLogs(search: AuditSearchInterface){
        return this.rbacRepository.findAuditLogs(search);
    }

    async getAuditLogsByRole(roleId:number, search: AuditSearchInterface){
        return this.rbacRepository.findAuditLogsByRole(roleId, search);
    }

    async getAuditLogsByUser(userId:number, search: AuditSearchInterface){
        return this.rbacRepository.findAuditLogsByUser(userId, search);
    }
}