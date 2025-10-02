import { PrismaClient, Role, permission_type } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { RoleDetailDTO, RoleSearchInterface, RoleSummaryDTO } from "../../domain/repository.interface.js";

export class RoleRepository {
    constructor(private db: PrismaClient) {}

    async createRole(role_data: { name: string, permissions: { module_id: number, permission: permission_type[] }[], code: string, description?: string | null, hierarchy_level?: number, state?: 'active'|'inactive' }): Promise<Role> {
        const { name, permissions, code, description, hierarchy_level, state } = role_data;

        return await this.db.role.create({
            data: {
                name,
                code,
                description: description ?? undefined,
                hierarchy_level: typeof hierarchy_level === 'number' ? hierarchy_level : undefined,
                state: state ?? undefined,
                role_module: {
                    create: permissions
                }
            },
            include: {
                role_module: true
            }
        });
    }

    async updateRole(role_id: number, role_data: { name?: string; description?: string | null; hierarchy_level?: number; state?: 'active'|'inactive'; permissions?: { module_id: number, permission: permission_type[] }[]; }): Promise<Role> {
        const data: any = {};
        if (role_data.name) data.name = String(role_data.name).toLowerCase();
        if (role_data.description !== undefined) data.description = role_data.description;
        if (typeof role_data.hierarchy_level === 'number') data.hierarchy_level = role_data.hierarchy_level;
        if (role_data.state) data.state = role_data.state;

        if (Array.isArray(role_data.permissions)){
            data.role_module = {
                deleteMany: { role_id },
                create: role_data.permissions.map(p => ({ module_id: p.module_id, permission: p.permission }))
            };
        }

        return await this.db.role.update({ where: { id: role_id }, data, include: { role_module: true } });
    }

    async deleteRole(role_id: number): Promise<boolean> {
        try{
            await this.db.role.delete({ where: { id: role_id } });
            return true;
        }catch(e:any){
            if (e?.code === 'P2003'){
                // FK violation (e.g., users still referencing this role)
                throw new Error('No se puede eliminar el rol porque existen usuarios asociados. Retire o reasigne esos usuarios antes de eliminar.');
            }
            throw e;
        }
    }

    async getRole(options?: { value?: any, column?: string, include?: Record<string, any> }): Promise<Role[]> {
        const value = options?.value;
        const include = options?.include;
        const column = options?.column ?? 'id';

        return await this.db.role.findMany({
            include,
            where: value !== undefined && value !== null ? { [column]: value } : undefined,
        });
    }

    async getRoleById(id: number): Promise<Role | null> {
        return this.db.role.findUnique({ where: { id } });
    }

    async findRolesSummary(search: RoleSearchInterface): Promise<{ roles: RoleSummaryDTO[], total: number }>{
        const where: any = {};
        if (search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if (search.code) where.code = { contains: search.code, mode: 'insensitive' };
        if (search.hierarchyMin != null || search.hierarchyMax != null) {
            where.hierarchy_level = {};
            if (search.hierarchyMin != null) where.hierarchy_level.gte = search.hierarchyMin;
            if (search.hierarchyMax != null) where.hierarchy_level.lte = search.hierarchyMax;
        }
        if (search.moduleId != null) {
            const ids = Array.isArray(search.moduleId) ? search.moduleId : [search.moduleId];
            where.role_module = { some: { module_id: { in: ids } } };
        }
        if (search.permission != null) {
            const perms = Array.isArray(search.permission) ? search.permission : [search.permission];
            where.role_module = where.role_module || { some: {} };
            const currentSome = where.role_module.some ?? {};
            where.role_module.some = {
                ...currentSome,
                permission: { hasSome: perms as permission_type[] }
            };
        }

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [roles, total] = await this.db.$transaction([
            this.db.role.findMany({
                where,
                select: { id: true, name: true, code: true, hierarchy_level: true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.role.count({ where })
        ]);

        return { roles: roles as RoleSummaryDTO[], total };
    }

    async findRolesDetail(search: RoleSearchInterface): Promise<{ roles: RoleDetailDTO[], total: number }>{
        const where: any = {};
        if (search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if (search.code) where.code = { contains: search.code, mode: 'insensitive' };
        if (search.hierarchyMin != null || search.hierarchyMax != null) {
            where.hierarchy_level = {};
            if (search.hierarchyMin != null) where.hierarchy_level.gte = search.hierarchyMin;
            if (search.hierarchyMax != null) where.hierarchy_level.lte = search.hierarchyMax;
        }
        if (search.moduleId != null) {
            const ids = Array.isArray(search.moduleId) ? search.moduleId : [search.moduleId];
            where.role_module = { some: { module_id: { in: ids } } };
        }
        if (search.permission != null) {
            const perms = Array.isArray(search.permission) ? search.permission : [search.permission];
            where.role_module = where.role_module || { some: {} };
            const currentSome = where.role_module.some ?? {};
            where.role_module.some = {
                ...currentSome,
                permission: { hasSome: perms as permission_type[] }
            };
        }

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [roles, total] = await this.db.$transaction([
            this.db.role.findMany({
                where,
                include: {
                    role_module: {
                        select: {
                            id: true,
                            module_id: true,
                            permission: true,
                            module: { select: { id: true, code: true, name: true, path: true } }
                        }
                    }
                },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.role.count({ where })
        ]);

        const detail = (roles as any[]).map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            hierarchy_level: r.hierarchy_level,
            description: r.description ?? null,
            permissions: r.role_module
        })) as RoleDetailDTO[];

        return { roles: detail, total };
    }
}