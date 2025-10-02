import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { TokenService } from './token.service.js';
import { UsersRepository } from "@/modules/identities/users/infrastructure/users.repository.js";

export class AuthUsesCases{
    private tokenService: TokenService;
    private usersRepository:UsersRepository;

    constructor(){
        this.tokenService = new TokenService();
        this.usersRepository = new UsersRepository();
    }

    async login(data:any){
        const users = await this.usersRepository.getUserWithPassword({value: data.email, column: 'email'});
        if(!users.length) throw new Error('No existe el usuario');

        const user = users[0];
        const isValid = await compare(data.password, user.password);
        if(!isValid) throw new Error('Contraseña incorrecta');

        const accessToken = this.tokenService.signAccessToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });
        const refreshToken = this.tokenService.signRefreshToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            company_id: user.company_id,
        });

        const response: any = {
            id: user.id,
            name: user.name,
            email: user.email,
            tokens: {
                accessToken,
                refreshToken,
            }
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

    async me(user_id:number):Promise<Omit<User, 'password'>>{ 
        const user = await this.usersRepository.getUser({value: user_id});
        return user[0];
    }
}