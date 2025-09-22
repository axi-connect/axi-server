import { HttpError } from "@/shared/errors/http.error.js";
import { CompaniesRepository } from "../infrastructure/companies.repository.js";
import { CreateCompanyInput, UpdateCompanyInput, CompanyWithSchedule, CompanySearchInterface } from "../domain/repository.interface.js";

export class CompaniesUseCases{
    constructor(private companiesRepository:CompaniesRepository){
    }

    /**
     * Lista compañías o una sola por id
     * @param company_id Id de la compañía (opcional)
     * @returns Lista de compañías con horario o un único registro
    */
    async list(company_id?:number):Promise<CompanyWithSchedule[]>{
        return await this.companiesRepository.getCompany(company_id);
    }

    /**
     * Busca compañías con filtros, paginación y vista (summary/detail)
     * @param search Filtros de búsqueda, paginación y vista
     * @returns Objeto con arreglo de compañías y total de registros
    */
    async search(search?:CompanySearchInterface):Promise<{companies:any[], total:number}>{
        const mode = search?.view === 'detail' ? 'detail' : 'summary';
        if(mode === 'detail') return await this.companiesRepository.findCompaniesDetail(search);
        return await this.companiesRepository.findCompaniesSummary(search);
    }

    /**
     * Crea una compañía (incluye company_schedule si se provee)
     * @param company_data Datos de la compañía
     * @returns Compañía creada
    */
    async create(company_data:CreateCompanyInput):Promise<CompanyWithSchedule>{
        const exists = await this.companiesRepository.getCompany(company_data.nit, 'nit');
        if(exists.length) throw new HttpError(409, 'El NIT de la empresa ya se encuentra registrado');
        return await this.companiesRepository.createCompany(company_data);
    }

    /**
     * Actualiza datos de la compañía
     * Soporta reemplazo completo de company_schedule si se envía arreglo
     * @param company_id Id de la compañía
     * @param company_data Campos a actualizar
     * @returns Compañía actualizada
    */
    async update(company_id:number, company_data:UpdateCompanyInput):Promise<CompanyWithSchedule>{
        const company = await this.companiesRepository.getCompany(company_id);
        if(!company.length) throw new HttpError(404, 'Empresa no encontrada');
        return await this.companiesRepository.updateCompany(company_id, company_data);
    }

    /**
     * Elimina una compañía por id
     * @param company_id Id de la compañía
     * @returns Booleano (true) eliminada, (false) error
    */
    async delete(company_id:number):Promise<boolean>{
        const company = await this.companiesRepository.getCompany(company_id);
        if(!company.length) throw new HttpError(404, 'Empresa no encontrada');

        const deleted = await this.companiesRepository.deleteCompany(company_id);
        if(!deleted) throw new HttpError(500, 'Error al eliminar la empresa');
        return true;
    }
}