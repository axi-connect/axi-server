import { hash } from 'bcrypt';
import { User } from "@prisma/client";
import { HttpError } from "@/shared/errors/http.error.js";
import { UsersRepository } from "../infrastructure/users.repository.js";
import { CloudinaryRepository } from "@/services/cloudinary.repository.js";
import { RbacRepository } from "@/modules/rbac/infrastructure/rbac.repository.js";
import { CreateUserInput, UpdateUserInput, UserSearchInterface } from "../domain/repository.interface.js";
import { CompaniesRepository } from "@/modules/identities/companies/infrastructure/companies.repository.js";

export class UsersUseCases{
    private companiesRepository: CompaniesRepository;
    private rbacRepository: RbacRepository;
    private cloudinaryRepository: CloudinaryRepository;

    constructor(private usersRepository:UsersRepository){
        this.companiesRepository = new CompaniesRepository();
        this.rbacRepository = new RbacRepository();
        this.cloudinaryRepository = new CloudinaryRepository();
    }

    async list(user_id?:number):Promise<Omit<User, 'password'>[]>{
        return await this.usersRepository.getUser({value: user_id});
    }

    async search(search?:UserSearchInterface):Promise<{users:any[], total:number}>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if(mode === 'detail') return await this.usersRepository.findUsersDetail(search);
        return await this.usersRepository.findUsersSummary(search);
    }

    async create(user_data:CreateUserInput, file?: Express.Multer.File):Promise<Omit<User, 'password'>>{
        user_data = {
            ...user_data,
            role_id: Number(user_data.role_id),
            company_id: Number(user_data.company_id)
        }

        const company = await this.companiesRepository.getCompany(user_data.company_id);
        if(!company.length) throw new HttpError(404, 'La empresa no existe');

        const role = await this.rbacRepository.getRole({value: user_data.role_id});
        if(!role.length) throw new HttpError(404, 'El rol no existe');

        const exists = await this.usersRepository.existsByEmailOrPhone(user_data.email, user_data.phone);
        if(exists) throw new HttpError(409, 'Correo o teléfono ya registrados');

        if(file?.buffer){
            const { secure_url } = await this.cloudinaryRepository.uploadFromBuffer(file.buffer, { folder: 'avatars', overwrite: true });
            user_data.avatar = secure_url;
        } 

        user_data.password = await hash(user_data.password, 10);

        return await this.usersRepository.createUser(user_data);
    }

    async update(user_id:number, user_data:UpdateUserInput, file?: Express.Multer.File):Promise<Omit<User, 'password'>>{
        // Verificar existencia del usuario antes de actualizar
        const found = await this.usersRepository.getUser({ value: user_id });
        if(!found.length) throw new HttpError(404, 'Usuario no encontrado');

        user_data = {
            ...user_data,
            role_id: Number(user_data.role_id),
            company_id: Number(user_data.company_id)
        }
        if(user_data.role_id){
            const role = await this.rbacRepository.getRole({value: user_data.role_id});
            if(!role.length) throw new HttpError(404, 'El rol no existe');
        }
        if(user_data.company_id){
            const company = await this.companiesRepository.getCompany(user_data.company_id);
            if(!company.length) throw new HttpError(404, 'La empresa no existe');
        }
        if(file?.buffer){
            const { secure_url } = await this.cloudinaryRepository.uploadFromBuffer(file.buffer, { folder: 'avatars', overwrite: true });
            user_data.avatar = secure_url;
        }
        if(user_data.email || user_data.phone){
            const exists = await this.usersRepository.existsByEmailOrPhone(user_data.email, user_data.phone, user_id);
            if(exists) throw new HttpError(409, 'Correo o teléfono ya registrados');
        }

        console.log(user_data);

        return await this.usersRepository.updateUser(user_id, user_data);
    }

    async delete(user_id:number):Promise<User>{
        return await this.usersRepository.deleteUser(user_id);
    }
}