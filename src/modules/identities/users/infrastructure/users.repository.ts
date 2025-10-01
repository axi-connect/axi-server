import { PrismaClient, User } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { UsersRepositoryInterface, CreateUserInput, UpdateUserInput, UserSearchInterface, UserSummaryDTO, UserDetailDTO } from "../domain/repository.interface.js";

export class UsersRepository implements UsersRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
    }

    async getUser(options?:{value?:any, column?:string}):Promise<Omit<User, 'password'>[]>{
        const value = options?.value;
        const column = options?.column ?? 'id';
        return await this.db.user.findMany({
            select: {
                id: true, name: true, email: true, phone: true, role_id: true, company_id: true, avatar: true,
                role: { select: { name: true, id: true, description: true, code: true, hierarchy_level: true, state: true } },
                company: { select: { name: true, id: true, activity_description: true, nit: true, address: true, city: true, industry: true, isotype: true} }
            },
            where: value ? {[column]: value} : undefined,
        });
    }

    async getUserWithPassword(options?:{value?:any, column?:string}):Promise<User[]>{
        const value = options?.value;
        const column = options?.column ?? 'id';
        return await this.db.user.findMany({
            where: value ? {[column]: value} : undefined,
        });
    }

    async createUser(user_data:CreateUserInput):Promise<Omit<User, 'password'>>{
        return await this.db.user.create({
            data: user_data,
            select: { id: true, name: true, email: true, phone: true, role_id: true, company_id: true, avatar: true }
        });
    }

    async updateUser(user_id:number, user_data:UpdateUserInput):Promise<Omit<User, 'password'>>{
        return await this.db.user.update({ 
            data: user_data,
            where: {id: user_id}, 
            select: { id: true, name: true, email: true, phone: true, role_id: true, company_id: true, avatar: true } 
        });
    }

    async deleteUser(user_id:number):Promise<User>{
        return await this.db.user.delete({ where: {id: user_id} });
    }

    /**
     * Verifica existencia por email o teléfono. Si excludeId está presente, excluye ese usuario.
    */
    async existsByEmailOrPhone(email?:string, phone?:string, excludeId?:number):Promise<boolean>{
        const orFilters:any[] = [];
        if (email) orFilters.push({ email: email.toLowerCase() });
        if (phone) orFilters.push({ phone });
        if (orFilters.length === 0) return false;

        const andFilters:any[] = [{ OR: orFilters }];
        if (typeof excludeId === 'number') andFilters.push({ NOT: { id: excludeId } });

        const count = await this.db.user.count({ where: { AND: andFilters } });
        return count > 0;
    }

    async findUsersSummary(search:UserSearchInterface = {}):Promise<{users: UserSummaryDTO[], total:number}>{
        const where:any = {};
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.email) where.email = { contains: search.email.toLowerCase(), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(search.role_id) where.role_id = search.role_id;

        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [users, total] = await this.db.$transaction([
            this.db.user.findMany({
                where,
                select: { 
                    id:true, name:true, email:true, phone:true, role_id:true, company_id:true, avatar:true,
                    company: { select: { name: true } },
                    role: { select: { name: true } }
                },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.user.count({ where })
        ]);
        const mapped = (users as any[]).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role_id: u.role_id,
            company_id: u.company_id,
            company_name: u.company?.name ?? null,
            role_name: u.role?.name ?? null,
            avatar: u.avatar
        })) as unknown as UserSummaryDTO[];
        return {users: mapped, total};
    }

    async findUsersDetail(search:UserSearchInterface = {}):Promise<{users: UserDetailDTO[], total:number}>{
        const where:any = {};
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.email) where.email = { contains: search.email.toLowerCase(), mode: 'insensitive' };
        if(search.phone) where.phone = { contains: search.phone.replace(/\D/g,'') };
        if(search.company_id) where.company_id = search.company_id;
        if(search.role_id) where.role_id = search.role_id;

        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [users, total] = await this.db.$transaction([
            this.db.user.findMany({
                where,
                include: { company: { select: { id:true, name:true } } },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.user.count({ where })
        ]);
        const detail = users.map((u:any)=>({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role_id: u.role_id,
            company_id: u.company_id,
            avatar: u.avatar,
            company: u.company ? {id: u.company.id, name: u.company.name} : null
        })) as UserDetailDTO[];
        return {users: detail, total};
    }
}