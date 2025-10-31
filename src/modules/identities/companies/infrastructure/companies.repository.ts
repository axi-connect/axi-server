import { PrismaClient } from "@prisma/client";
import { normalizeTextValue } from "@/shared/utils/utils.shared.js";
import { CompanyWithSchedule, CreateCompanyInput, UpdateCompanyInput, CompanySearchInterface, CompanyDetailDTO, CompanySummaryDTO } from "../domain/repository.interface.js";

/**
 * Repositorio de compañías
 * Encapsula el acceso a datos con Prisma y mapea estructuras del dominio
*/
export class CompaniesRepository{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient({
            // log: ['query'],
        });
    }

    /**
     * Obtiene compañías por valor/columna o todas
     * @param value Valor de búsqueda (opcional)
     * @param column Columna a comparar (por defecto 'id')
     * @returns Lista de compañías con su horario
    */
    async getCompany(value?:any, column:string = 'id'):Promise<CompanyWithSchedule[]>{
        return this.db.company.findMany({
            where: value ? {[column]: value} : undefined,
            include: { company_schedule: true }
        }) as unknown as CompanyWithSchedule[];
    }

    /**
     * Crea una compañía
     * - Mapea company_schedule[] recibido a create[] de Prisma
     * @param company_data Datos de la compañía (incluye horarios opcionales)
     * @returns Compañía creada
    */
    async createCompany(company_data:CreateCompanyInput):Promise<CompanyWithSchedule>{
        const { company_schedule, ...rest } = company_data;
        const data:any = { ...rest };
        if (data.city) data.city = normalizeTextValue(data.city) ?? data.city;
        if (data.industry) data.industry = normalizeTextValue(data.industry) ?? data.industry;
        if (Array.isArray(company_schedule) && company_schedule.length > 0){
            data.company_schedule = {
                create: company_schedule.map((item:any)=>({
                    day: String(item.day).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                    time_range: item.time_range,
                }))
            }
        }

        return await this.db.company.create({ data, include: { company_schedule: true } }) as unknown as CompanyWithSchedule;
    }

    /**
     * Actualiza datos de la compañía
     * - Si se envía company_schedule[], reemplaza los horarios actuales
     * @param company_id Id de la compañía
     * @param company_data Campos a actualizar
     * @returns Compañía actualizada
    */
    async updateCompany(company_id:number, company_data:UpdateCompanyInput):Promise<CompanyWithSchedule>{
        const { company_schedule, ...rest } = company_data as any;
        const data:any = { ...rest };
        if (data.city) data.city = normalizeTextValue(data.city) ?? data.city;
        if (data.industry) data.industry = normalizeTextValue(data.industry) ?? data.industry;

        // Si llega company_schedule como array, reemplazamos el set de horarios
        if(Array.isArray(company_schedule)){
            data.company_schedule = {
                deleteMany: { company_id },
                create: company_schedule.map((item:any)=>({
                    day: String(item.day).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                    time_range: item.time_range,
                }))
            }
        }

        return await this.db.company.update({ where: {id: company_id}, data, include: { company_schedule: true } }) as unknown as CompanyWithSchedule;
    }

    /**
     * Elimina una compañía por id
     * Retorna true si se eliminó, false si no existe o falló
    */
    async deleteCompany(company_id:number):Promise<boolean>{
        try{
            await this.db.company.delete({ where: { id: company_id } });
            return true;
        }catch(error:any){
            console.log('Error al eliminar la empresa', error);
            return false;
        }
    }

    /**
     * Búsqueda paginada (vista resumen)
     * @param search Filtros, paginación y modo de vista
     * @returns { companies, total }
    */
    async findCompaniesSummary(search:CompanySearchInterface = {}):Promise<{companies: CompanySummaryDTO[], total:number}>{
        const where:any = {};
        if(search.nit) where.nit = { contains: search.nit, mode: 'insensitive' };
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.city) where.city = { contains: normalizeTextValue(search.city), mode: 'insensitive' };
        if(search.industry) where.industry = { contains: normalizeTextValue(search.industry), mode: 'insensitive' };

        // Sanitizar sort
        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [companies, total] = await this.db.$transaction([
            this.db.company.findMany({
                where,
                select: { id:true, nit:true, name:true, city:true, industry:true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.company.count({ where })
        ]);

        return {companies: companies as CompanySummaryDTO[], total};
    }

    /**
     * Búsqueda paginada (vista detalle)
     * @param search Filtros, paginación y modo de vista
     * @returns { companies, total }
    */
    async findCompaniesDetail(search:CompanySearchInterface = {}):Promise<{companies: CompanyDetailDTO[], total:number}>{
        const where:any = {};
        if(search.nit) where.nit = { contains: search.nit, mode: 'insensitive' };
        if(search.name) where.name = { contains: normalizeTextValue(search.name), mode: 'insensitive' };
        if(search.city) where.city = { contains: normalizeTextValue(search.city), mode: 'insensitive' };
        if(search.industry) where.industry = { contains: normalizeTextValue(search.industry), mode: 'insensitive' };

        // Sanitizar sort
        const sortBy = (search.sortBy ?? 'id');
        const sortDir = (search.sortDir ?? 'desc');

        const [companies, total] = await this.db.$transaction([
            this.db.company.findMany({
                where,
                include: { company_schedule: true },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.company.count({ where })
        ]);

        const detail = companies.map((c:any)=>({
            id: c.id,
            nit: c.nit,
            name: c.name,
            city: c.city,
            industry: c.industry,
            address: c.address,
            isotype: c.isotype,
            activity_description: c.activity_description,
            company_schedule: c.company_schedule
        })) as CompanyDetailDTO[];

        return {companies: detail, total};
    }

    /**
     * Verifica si existe una compañía por id
    */
    async existsById(company_id:number):Promise<boolean>{
        try{
            const company = await this.db.company.findUnique({ where: { id: company_id }, select: { id: true } });
            return company != null;
        }catch{
            return false;
        }
    }
}