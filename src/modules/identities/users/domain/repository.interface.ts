import { User } from "@prisma/client";

export interface CreateUserInput{
    name:string;
    phone: string;
    email: string;
    role_id: number;
    avatar?: string;
    password: string;
    company_id: number;
}

export interface UpdateUserInput{
    name?:string;
    phone?: string;
    email?: string;
    role_id?: number;
    avatar?: string;
    password?: string;
    company_id?: number;
}

export interface UsersRepositoryInterface{
    getUser(options?:{value?:any, column?:string}):Promise<User[]>
    createUser(user_data:CreateUserInput):Promise<User>
    updateUser(user_id:number, user_data:UpdateUserInput):Promise<User>
    deleteUser(user_id:number):Promise<User>
}

export type UsersViewMode = 'summary' | 'detail';

export interface UserSearchInterface{
    name?: string;
    email?: string;
    phone?: string;
    company_id?: number;
    role_id?: number;
    limit?: number;
    offset?: number;
    view?: UsersViewMode;
    sortBy?: 'id' | 'name' | 'email' | 'phone' | 'company_id' | 'role_id';
    sortDir?: 'asc' | 'desc';
}

export interface UserSummaryDTO{
    id:number;
    name:string;
    email:string;
    phone:string;
    role_id:number;
    company_id:number;
}

export interface UserDetailDTO extends UserSummaryDTO{
    avatar: string | null;
    company: {id:number, name:string} | null;
}