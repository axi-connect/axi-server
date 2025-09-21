import { Module, PrismaClient } from "@prisma/client";
import { normalizeTextValue } from "../../../../shared/utils/utils.shared.js";
import { createModuleInterface, ModuleDetailDTO, ModuleSearchInterface, ModuleSummaryDTO, UpdateModuleInput } from "../../domain/repository.interface.js";

export class ModuleRepository {
    constructor(private db: PrismaClient) {}

    async getModule(value?: any[], by: 'path' | 'id' | 'code' = 'id'): Promise<Module[]>{
        return await this.db.module.findMany({
            where: value ? { [by]: { in: value } } : undefined
        });
    }

    async createModule(module_data: createModuleInterface): Promise<Module> {
        return await this.db.module.create({ data: module_data as any });
    }

    async updateModule(module_id:number, data: UpdateModuleInput): Promise<Module> {
        const payload:any = { ...data };
        // Avoid null assignment for optional fields in Prisma update
        if (payload.parent_id === null) payload.parent_id = undefined;
        return this.db.module.update({ where: { id: module_id }, data: payload });
    }

    async deleteModule(module_id:number): Promise<boolean> {
        try{
            await this.db.module.delete({ where: { id: module_id } });
            return true;
        }catch(e:any){
            if (e?.code === 'P2003'){
                throw new Error('No se puede eliminar el módulo porque tiene relaciones asociadas. Retire las dependencias antes de eliminar.');
            }
            throw e;
        }
    }

    async findModulesSummary(search: ModuleSearchInterface): Promise<{ modules: ModuleSummaryDTO[], total: number }>{
        const where: any = {};
        if (search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if (search.code) where.code = { contains: search.code, mode: 'insensitive' };
        if (search.path) where.path = { contains: search.path, mode: 'insensitive' };
        if (search.is_public != null) where.is_public = search.is_public;
        if (search.parent_id !== undefined) where.parent_id = search.parent_id;
        if (search.roleId != null) {
            const ids = Array.isArray(search.roleId) ? search.roleId : [search.roleId];
            where.role_module = { some: { role_id: { in: ids } } };
        }
        if (search.type) {
            where.parent_id = search.type === 'module' ? null : { not: null };
        }

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [modules, total] = await this.db.$transaction([
            this.db.module.findMany({
                where,
                select: { id: true, name: true, code: true, path: true, is_public: true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.module.count({ where })
        ]);

        return { modules: modules as ModuleSummaryDTO[], total };
    }

    async findModulesDetail(search: ModuleSearchInterface): Promise<{ modules: ModuleDetailDTO[], total: number }>{
        const where: any = {};
        if (search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if (search.code) where.code = { contains: search.code, mode: 'insensitive' };
        if (search.path) where.path = { contains: search.path, mode: 'insensitive' };
        if (search.is_public != null) where.is_public = search.is_public;
        if (search.parent_id !== undefined) where.parent_id = search.parent_id;
        if (search.roleId != null) {
            const ids = Array.isArray(search.roleId) ? search.roleId : [search.roleId];
            where.role_module = { some: { role_id: { in: ids } } };
        }

        const sortBy = search.sortBy ?? 'id';
        const sortDir = search.sortDir ?? 'desc';

        const [modules, total] = await this.db.$transaction([
            this.db.module.findMany({
                where,
                include: {
                    parent: { select: { id: true, name: true, code: true, path: true } },
                    children: { select: { id: true, name: true, code: true, path: true } },
                    role_module: { select: { role: { select: { id: true, name: true, code: true } } } }
                },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.module.count({ where })
        ]);

        const detail = (modules as any[]).map((m: any) => ({
            id: m.id,
            name: m.name,
            code: m.code,
            path: m.path,
            is_public: m.is_public,
            parent_id: m.parent_id ?? null,
            parent: m.parent ? { id: m.parent.id, name: m.parent.name, code: m.parent.code, path: m.parent.path } : null,
            children: (m.children ?? []).map((c: any) => ({ id: c.id, name: c.name, code: c.code, path: c.path })),
            roles: (m.role_module ?? []).map((rm: any) => rm.role)
        })) as ModuleDetailDTO[];

        return { modules: detail, total };
    }
}