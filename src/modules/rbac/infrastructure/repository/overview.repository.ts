import { PrismaClient } from "@prisma/client";

export class OverviewRepository {
    constructor(private db: PrismaClient) {}

    async getOverview(search: any): Promise<any>{
        const view = search?.view === 'detail' ? 'detail' : 'summary';

        const [rolesCount, modulesCount, usersCount] = await this.db.$transaction([
            this.db.role.count(),
            this.db.module.count(),
            this.db.user.count()
        ]);

        const roleWhere: any = {};
        if (search.roleName) roleWhere.name = { contains: search.roleName.toLowerCase(), mode: 'insensitive' };
        if (search.roleId != null){
            const ids = Array.isArray(search.roleId) ? search.roleId : [search.roleId];
            roleWhere.id = { in: ids };
        }
        if (search.permission || search.moduleId){
            roleWhere.role_module = { some: {} };
            const some: any = roleWhere.role_module.some;
            if (search.permission){
                const perms = Array.isArray(search.permission) ? search.permission : [search.permission];
                some.permission = { hasSome: perms };
            }
            if (search.moduleId){
                const ids = Array.isArray(search.moduleId) ? search.moduleId : [search.moduleId];
                some.module_id = { in: ids };
            }
        }

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        if (view === 'summary'){
            const roles = await this.db.role.findMany({
                where: roleWhere,
                select: { id: true, name: true, description: true, code: true, hierarchy_level: true, state: true } as any,
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            });
            const mapped = (roles as any[]).map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                code: r.code,
                hierarchy_level: r.hierarchy_level,
                status: r.state
            }));
            return {
                summary: { roles_count: rolesCount, modules_count: modulesCount, users_count: usersCount },
                roles: mapped
            };
        }

        const roles = await this.db.role.findMany({
            where: roleWhere,
            include: {
                role_module: {
                    select: {
                        permission: true,
                        module: {
                            select: {
                                id: true, name: true, code: true, path: true, icon: true, is_public: true,
                                parent_id: true,
                                children: { select: { id: true, name: true, code: true, path: true, icon: true } },
                            }
                        }
                    }
                },
                users: { select: { id: true, name: true, email: true } }
            },
            skip: search.offset ?? 0,
            take: search.limit ?? 20,
            orderBy: { [sortBy]: sortDir }
        });

        const mapped = (roles as any[]).map((r: any) => {
            const byModuleId = new Map<number, { id:number; name:string; code:string; path:string; icon?:string|null; is_public:boolean; permissions: any; parent_id: number|null; children:any[] }>();
            for(const rm of r.role_module){
                const m = rm.module;
                if(!byModuleId.has(m.id)){
                    byModuleId.set(m.id, { id: m.id, name: m.name, code: m.code, path: m.path, icon: m.icon ?? null, is_public: m.is_public, permissions: new Set(), parent_id: m.parent_id ?? null, children: m.children ?? [] });
                }
                const entry = byModuleId.get(m.id)!;
                rm.permission.forEach((p: any) => entry.permissions.add(p));
            }

            const modules: any[] = [];
            const allModules = Array.from(byModuleId.values());
            for(const mod of allModules){
                const permissions = Array.from(mod.permissions);
                const submodules = (mod.children || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    code: c.code,
                    path: c.path,
                    icon: c.icon ?? null,
                    permissions
                }));
                if (mod.parent_id == null){
                    modules.push({ id: mod.id, name: mod.name, code: mod.code, path: mod.path, icon: mod.icon, is_public: mod.is_public, permissions, submodules });
                }
            }

            return {
                id: r.id,
                name: r.name,
                description: r.description ?? null,
                code: r.code,
                hierarchy_level: r.hierarchy_level,
                status: r.state,
                modules,
                users: (r.users ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
            };
        });

        await new Promise((r) => setTimeout(r, 5000));

        return {
            summary: { roles_count: rolesCount, modules_count: modulesCount, users_count: usersCount },
            roles: mapped
        };
    }
}