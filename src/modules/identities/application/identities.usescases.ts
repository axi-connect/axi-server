import {hash} from 'bcrypt';
import {randomUUID} from 'crypto';
import { Company, User, Agent } from "@prisma/client";
import { RbacRepository } from "../../rbac/infrastructure/rbac.repository.js";
import { IdentitiesRepository } from "../infrastructure/identities.repository.js";
import { companyDependency, createAgentInterface, createCompanyInterface, createUserInterface, updateCompanyInterface, updateUserInterface } from "../domain/repository.interface.js";
import { ParametersRepository } from '../../parameters/infrastructure/parameters.repository.js';

export class IdentitiesUsesCases {
    private rbacRepository: RbacRepository;
    private parametersRepository: ParametersRepository;

    constructor(
        private identitiesRepository: IdentitiesRepository, 
    ){
        this.rbacRepository = new RbacRepository();
        this.parametersRepository = new ParametersRepository();
    }

    async getCompany(company_id?:number):Promise<companyDependency[]>{
        return await this.identitiesRepository.getCompany(company_id);
    }

    async createCompany(company_data: createCompanyInterface):Promise<Company>{
        const company = await this.identitiesRepository.getCompany(company_data.nit, 'nit');

        if(company.length) throw new Error('El nit de la empresa ya se encuentra registrado');

        const role = await this.rbacRepository.getRole({value: company_data.user.create.role_id});
        if(!role.length) throw new Error('El rol asignado no existe');
        const intentionIDs = company_data.agent.create.agentIntention.create.map(item => item.intention_id);

        const intentionDB = await this.parametersRepository.getIntention(intentionIDs);
        if(intentionDB.length != intentionIDs.length) throw new Error("Las funciones asignadas del agente no existen")
        
        company_data.user.create.password = await hash(company_data.user.create.password, 10);
        company_data.agent.create.client_id = randomUUID();
        return await this.identitiesRepository.createCompany(company_data);
    }

    async updateCompany(company_id:number, company_data: updateCompanyInterface):Promise<Company>{
        const company = await this.identitiesRepository.getCompany(company_id);
        if(company.length == 0) throw new Error('Empresa no encontrada');

        return this.identitiesRepository.updateCompany(company_id, company_data);
    }

    async deleteCompany(company_id:number):Promise<Company>{
        return await this.identitiesRepository.deleteCompany(company_id);
    }

    async readCompany(company_id?:number):Promise<Company[]>{
        return await this.identitiesRepository.getCompany(company_id);
    }

    async readUser(user_id?:number):Promise<User[]>{
        return this.identitiesRepository.getUser({value: user_id});
    }

    async createUser(user_data:createUserInterface):Promise<User>{
        const company = await this.identitiesRepository.getCompany(user_data.company_id);
        if(!company.length) throw new Error('Las relaciones del usuario no existen');

        const user = await this.identitiesRepository.getUser({value: user_data.email, column: 'email'});
        if(user.length >= 1) throw new Error('Ya está registrado el correo electrónico');

        const role_admin = await this.rbacRepository.getRole({value: 'CGQ58', column: 'code'});
        user_data.role_id = role_admin[0].id;
        user_data.phone = `+57${user_data.phone}`;
        user_data.password = await hash(user_data.password, 10);
        return await this.identitiesRepository.createUser(user_data);
    }

    async updateUser(user_id:number, user_data:updateUserInterface):Promise<User>{
        let role = [], company = [];
        if(user_data.role_id) role = await this.rbacRepository.getRole({value: user_data.role_id});
        if(user_data.company_id) company = await this.identitiesRepository.getCompany(user_data.company_id);
        if(!role.length || !company.length) throw new Error('Las relaciones del usuario no existen');

        return this.identitiesRepository.updateUser(user_id, user_data);
    }

    async deleteUser(user_id:number):Promise<User>{
        return this.identitiesRepository.deleteUser(user_id);
    }

    async createAgent(agent_data:createAgentInterface):Promise<Agent>{
        const company = await this.identitiesRepository.getCompany(agent_data.company_id);
        if(!company.length) throw new Error('La empresa no existe');

        agent_data.client_id = randomUUID();
        return await this.identitiesRepository.createAgent(agent_data);
    }

    async readAgent(agent_id?: number): Promise<Agent[]> {
        return await this.identitiesRepository.getAgent(agent_id);
    }
}