import { hash } from 'bcrypt';
import { User } from "@prisma/client";
import { UsersRepository } from "../infrastructure/users.repository.js";
import { RbacRepository } from "@/modules/rbac/infrastructure/rbac.repository.js";
import { CreateUserInput, UpdateUserInput, UserSearchInterface } from "../domain/repository.interface.js";
import { CompaniesRepository } from "@/modules/identities/companies/infrastructure/companies.repository.js";

export class UsersUseCases{
    private companiesRepository: CompaniesRepository;
    private rbacRepository: RbacRepository;

    constructor(private usersRepository:UsersRepository){
        this.companiesRepository = new CompaniesRepository();
        this.rbacRepository = new RbacRepository();
    }

    async list(user_id?:number):Promise<User[]>{
        return await this.usersRepository.getUser({value: user_id});
    }

    async search(search?:UserSearchInterface):Promise<{users:any[], total:number}>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if(mode === 'detail') return await (this.usersRepository as any).findUsersDetail(search);
        return await (this.usersRepository as any).findUsersSummary(search);
    }

    async create(user_data:CreateUserInput):Promise<User>{
        const company = await this.companiesRepository.getCompany(user_data.company_id);
        if(!company.length) throw new Error('La empresa no existe');

        const role = await this.rbacRepository.getRole({value: user_data.role_id});
        if(!role.length) throw new Error('El rol no existe');

        const user = await this.usersRepository.getUser({value: user_data.email, column: 'email'});
        if(user.length) throw new Error('Ya está registrado el correo electrónico');

        user_data.phone = `+57${user_data.phone}`;
        user_data.password = await hash(user_data.password, 10);
        return await this.usersRepository.createUser(user_data);
    }

    async update(user_id:number, user_data:UpdateUserInput):Promise<User>{
        if(user_data.role_id){
            const role = await this.rbacRepository.getRole({value: user_data.role_id});
            if(!role.length) throw new Error('El rol no existe');
        }
        if(user_data.company_id){
            const company = await this.companiesRepository.getCompany(user_data.company_id);
            if(!company.length) throw new Error('La empresa no existe');
        }
        if(user_data.password){
            user_data.password = await hash(user_data.password, 10);
        }
        return await this.usersRepository.updateUser(user_id, user_data);
    }

    async delete(user_id:number):Promise<User>{
        return await this.usersRepository.deleteUser(user_id);
    }
}

