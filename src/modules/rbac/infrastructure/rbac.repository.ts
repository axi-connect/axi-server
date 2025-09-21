import { PrismaClient, Module, Role } from "@prisma/client";
import { RoleRepository } from "./repository/role.repository.js";
import { AuditRepository } from "./repository/audit.repository.js";
import { ModuleRepository } from "./repository/module.repository.js";
import { OverviewRepository } from "./repository/overview.repository.js";
import { createRoleInterface, rbacRepositoryInterface, ModuleDetailDTO, ModuleSearchInterface, ModuleSummaryDTO, RoleDetailDTO, RoleSearchInterface, RoleSummaryDTO, UpdateRoleInput } from "../../rbac/domain/repository.interface.js"; 

export class RbacRepository implements rbacRepositoryInterface {
    private db: PrismaClient;
    private roleRepo: RoleRepository;
    private auditRepo: AuditRepository;
    private moduleRepo: ModuleRepository;
    private overviewRepo: OverviewRepository;

    constructor(){
        this.db = new PrismaClient;
        this.roleRepo = new RoleRepository(this.db);
        this.auditRepo = new AuditRepository(this.db);
        this.moduleRepo = new ModuleRepository(this.db);
        this.overviewRepo = new OverviewRepository(this.db);
    }

    // Module
    async getModule(value?: any[], by: 'path'|'id'|'code' = 'id'): Promise<Module[]>{
        return this.moduleRepo.getModule(value, by);
    }

    async createModule(module_data: any): Promise<Module>{
        return this.moduleRepo.createModule(module_data);
    }

    async updateModule(module_id:number, data:any): Promise<Module>{
        return this.moduleRepo.updateModule(module_id, data);
    }

    async deleteModule(module_id:number): Promise<boolean>{
        return this.moduleRepo.deleteModule(module_id);
    }

    // Role
    async createRole(role_data: createRoleInterface): Promise<Role>{
        return this.roleRepo.createRole(role_data);
    }

    async updateRole(role_id: number, role_data: UpdateRoleInput): Promise<Role>{
        return this.roleRepo.updateRole(role_id, role_data);
    }

    async deleteRole(role_id: number): Promise<boolean>{
        return this.roleRepo.deleteRole(role_id);
    }

    async getRole(options?: { value?: any, column?: string, include?: Record<string, any> }): Promise<Role[]>{
        return this.roleRepo.getRole(options);
    }

    async getRoleById(id: number): Promise<Role | null>{
        return this.roleRepo.getRoleById(id);
    }

    async findRolesSummary(search: RoleSearchInterface): Promise<{ roles: RoleSummaryDTO[], total: number }>{
        return this.roleRepo.findRolesSummary(search);
    }

    async findRolesDetail(search: RoleSearchInterface): Promise<{ roles: RoleDetailDTO[], total: number }>{
        return this.roleRepo.findRolesDetail(search);
    }

    // Modules search
    async findModulesSummary(search: ModuleSearchInterface): Promise<{ modules: ModuleSummaryDTO[], total: number }>{
        return this.moduleRepo.findModulesSummary(search);
    }

    async findModulesDetail(search: ModuleSearchInterface): Promise<{ modules: ModuleDetailDTO[], total: number }>{
        return this.moduleRepo.findModulesDetail(search);
    }

    // Overview
    async getOverview(search: any): Promise<any>{
        return this.overviewRepo.getOverview(search);
    }

    // Audit
    async findAuditLogs(search: any): Promise<{ logs:any[], total:number }>{
        return this.auditRepo.findAuditLogs(search);
    }

    async findAuditLogsByRole(roleId: number, search: any){
        return this.auditRepo.findAuditLogsByRole(roleId, search);
    }

    async findAuditLogsByUser(userId: number, search: any){
        return this.auditRepo.findAuditLogsByUser(userId, search);
    }
}