import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { TokenService } from './token.service.js';
import { UsersUseCases } from "@/modules/identities/users/application/users.usescases.js";
import { CreateUserInput } from "@/modules/identities/users/domain/repository.interface.js";
import { UsersRepository } from "@/modules/identities/users/infrastructure/users.repository.js";

export class AuthUsesCases{
    private usersUseCases:UsersUseCases;
    private usersRepository:UsersRepository;
    private tokenService: TokenService;

    constructor(){
        this.usersRepository = new UsersRepository();
        this.usersUseCases = new UsersUseCases(this.usersRepository);
        this.tokenService = new TokenService();
    }

    async login(data:any){
        const users = await this.usersRepository.getUser({value: data.email, column: 'email'});
        if(!users.length) throw new Error('No existe el usuario');

        const user = users[0];
        const isValid = await compare(data.password, user.password);
        if(!isValid) throw new Error('Contraseña incorrecta');

        const access_token = this.tokenService.signAccessToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });
        const refresh_token = this.tokenService.signRefreshToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });

        const response: any = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role_id: user.role_id,
            company_id: user.company_id,
            access_token,
            refresh_token,
        };
        return response;      
    }

    async signup(user_data:CreateUserInput):Promise<User>{
        const user = await this.usersUseCases.create(user_data);
        const access_token = this.tokenService.signAccessToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });
        const refresh_token = this.tokenService.signRefreshToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });
        const response: any = {
            id: (user as any).id,
            name: (user as any).name,
            email: (user as any).email,
            phone: (user as any).phone,
            role_id: (user as any).role_id,
            company_id: (user as any).company_id,
            access_token,
            refresh_token,
        };
        return response;
    }

    async refresh(refresh_token: string){
        const payload = this.tokenService.verifyToken<any>(refresh_token);
        if (payload.token_type !== 'refresh') throw new Error('Refresh token inválido');

        const access_token = this.tokenService.signAccessToken({
            id: payload.id,
            email: payload.email,
            role_id: payload.role_id,
            company_id: payload.company_id,
        });
        return { access_token };
    }
}