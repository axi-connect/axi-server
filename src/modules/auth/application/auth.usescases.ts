import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { createUserInterface } from "../../identities/domain/repository.interface.js";
import { IdentitiesRepository } from "../../identities/infrastructure/identities.repository.js";
import { IdentitiesUsesCases } from "../../identities/application/identities.usescases.js";

export class AuthUsesCases{
    private identitiesUsesCases:IdentitiesUsesCases;
    private identitiesRepository:IdentitiesRepository;

    constructor(){
        this.identitiesRepository = new IdentitiesRepository();
        this.identitiesUsesCases = new IdentitiesUsesCases(this.identitiesRepository);
    }

    async login(data:any){
        const user = await this.identitiesRepository.getUser({value: data.email, column: 'email'});
        if(!user.length) throw new Error('No existe el usuario');

        const isValid = await compare(data.password, user[0].password);
        if(!isValid) throw new Error('Contraseña incorrecta');

        return isValid       
    }

    async signup(user_data:createUserInterface):Promise<User>{
        const user = await this.identitiesUsesCases.createUser(user_data);
        
        if (!process.env.JWT_SECRET_KEY) throw new Error('JWT_SECRET_KEY no está definido');
        const token = jwt.sign({id: user.id, email: user.email, company: user.company_id}, process.env.JWT_SECRET_KEY);
        const response = {...user, token};
        delete (response as any).password;

        return response;
    }
}