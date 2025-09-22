import { PrismaClient, User } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { UsersRepositoryInterface, CreateUserInput, UpdateUserInput, UserSearchInterface, UserSummaryDTO, UserDetailDTO } from "../domain/repository.interface.js";

export class UsersRepository implements UsersRepositoryInterface{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient;
    }

    async getUser(options?:{value?:any, column?:string}):Promise<User[]>{
        const value = options?.value;
        const column = options?.column ?? 'id';
        return await this.db.user.findMany({
            where: value ? {[column]: value} : undefined,
            include: { role: true, company: true }
        });
    }

    async createUser(user_data:CreateUserInput):Promise<User>{
        return await this.db.user.create({ data: user_data });
    }

    async updateUser(user_id:number, user_data:UpdateUserInput):Promise<User>{
        return await this.db.user.update({ where: {id: user_id}, data: user_data });
    }

    async deleteUser(user_id:number):Promise<User>{
        return await this.db.user.delete({ where: {id: user_id} });
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
                select: { id:true, name:true, email:true, phone:true, role_id:true, company_id:true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.user.count({ where })
        ]);
        return {users: users as UserSummaryDTO[], total};
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

