import { Module, permission_type, Role } from "@prisma/client";

export interface createRoleInterface {
    code: string,
    name: string,
    permissions: { module_id: number, permission: permission_type[] }[],
    description?: string | null,
    hierarchy_level?: number,
    state?: 'active'|'inactive'
}

export interface UpdateRoleInput {
    name?: string;
    description?: string | null;
    hierarchy_level?: number;
    state?: 'active'|'inactive';
    permissions?: { module_id: number, permission: permission_type[] }[];
}

/**
 * RBAC Roles - Search interface and DTOs
*/
export interface RoleSearchInterface {
    name?: string;
    code?: string;
    hierarchyMin?: number;
    hierarchyMax?: number;
    moduleId?: number | number[];
    permission?: permission_type | permission_type[];
    limit?: number;
    offset?: number;
    sortBy?: 'id' | 'name' | 'code' | 'hierarchy_level';
    sortDir?: 'asc' | 'desc';
    view?: 'summary' | 'detail';
}

export interface RoleSummaryDTO {
    id: number;
    name: string;
    code: string;
    hierarchy_level: number;
}

export interface RoleDetailDTO extends RoleSummaryDTO {
    description?: string | null;
    permissions: {
        id: number;
        module_id: number;
        permission: permission_type[];
        module: {
            id: number;
            code: string;
            name: string;
            path: string;
        };
    }[];
}

export interface createModuleInterface {
    name: string;
    path: string;
    icon?: string | null;
    is_public?: boolean;
    parent_id?: number | null;
}

export interface UpdateModuleInput{
    name?: string;
    path?: string;
    icon?: string | null;
    is_public?: boolean;
    parent_id?: number | null;
}

/**
 * RBAC Modules - Search interface and DTOs
*/
export interface ModuleSearchInterface {
    name?: string;
    code?: string;
    path?: string;
    is_public?: boolean;
    parent_id?: number | null;
    type?: 'module' | 'submodule';
    roleId?: number | number[];
    limit?: number;
    offset?: number;
    sortBy?: 'id' | 'name' | 'code' | 'path' | 'is_public';
    sortDir?: 'asc' | 'desc';
    view?: 'summary' | 'detail';
}

export interface ModuleSummaryDTO {
    id: number;
    name: string;
    code: string;
    path: string;
    is_public: boolean;
}

export interface ModuleDetailDTO extends ModuleSummaryDTO {
    parent_id: number | null;
    parent?: { id: number; name: string; code: string; path: string } | null;
    children: { id: number; name: string; code: string; path: string }[];
    roles: { id: number; name: string; code: string }[];
}

export interface rbacRepositoryInterface {
    getRole(options?: { value?: any, column?: string, include?: Record<string, any> } | undefined): Promise<Role[]>
    getRoleById(id: number): Promise<Role | null>
    getModule(value?: any, column?: 'id' | 'path' | 'code'): Promise<Module[]>
    createModule(module_data: createModuleInterface): Promise<Module>
    updateModule(module_id: number, data: UpdateModuleInput): Promise<Module>
    deleteModule(module_id: number): Promise<boolean>
    createRole(role_data: createRoleInterface): Promise<Role>
    updateRole(role_id: number, role_data: UpdateRoleInput): Promise<Role>
    deleteRole(role_id: number): Promise<boolean>

    findRolesSummary(search: RoleSearchInterface): Promise<{ roles: RoleSummaryDTO[], total: number }>
    findRolesDetail(search: RoleSearchInterface): Promise<{ roles: RoleDetailDTO[], total: number }>
    findModulesSummary(search: ModuleSearchInterface): Promise<{ modules: ModuleSummaryDTO[], total: number }>
    findModulesDetail(search: ModuleSearchInterface): Promise<{ modules: ModuleDetailDTO[], total: number }>

    getOverview(search: OverviewSearchInterface): Promise<OverviewDTO>
    findAuditLogs(search: AuditSearchInterface): Promise<{ logs: AuditLogDTO[], total: number }>
    findAuditLogsByRole(roleId: number, search: AuditSearchInterface): Promise<{ logs: AuditLogDTO[], total: number }>
    findAuditLogsByUser(userId: number, search: AuditSearchInterface): Promise<{ logs: AuditLogDTO[], total: number }>
}

/** Overview DTOs **/
export interface OverviewSearchInterface{
    view?: 'summary'|'detail';
    roleName?: string;
    permission?: permission_type | permission_type[];
    moduleId?: number | number[];
    roleId?: number | number[];
    is_public?: boolean;
    limit?: number; // pagination for roles list
    offset?: number;
    sortBy?: 'id'|'name'|'code'|'hierarchy_level';
    sortDir?: 'asc'|'desc';
}
export interface OverviewDTO{
    summary: { roles_count: number; modules_count: number; users_count: number };
    roles: OverviewRoleDTO[];
}
export interface OverviewRoleDTO{
    id: number;
    name: string;
    description?: string | null;
    code: string;
    hierarchy_level: number;
    status: 'active' | 'inactive';
    modules?: OverviewModuleDTO[]; // only in detail
    users?: { id: number; name: string; email: string }[]; // only in detail
}
export interface OverviewModuleDTO{
    id: number;
    name: string;
    code: string;
    path: string;
    icon?: string | null;
    is_public: boolean;
    permissions?: permission_type[]; // permissions for this role on this module
    submodules?: Omit<OverviewModuleDTO,'submodules'>[]; // nested one level
}
/** Audit DTOs **/
export interface AuditSearchInterface{
    user_id?: number;
    role_id?: number; // used only in byRole endpoint
    action?: string;
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp'|'user_id'|'action';
    sortDir?: 'asc'|'desc';
}
export interface AuditLogDTO{
    id: number;
    timestamp: Date;
    user: { id: number; name: string; email: string };
    action: string;
}