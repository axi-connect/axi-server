import { Company, CompanySchedule } from "@prisma/client";

export type CompaniesViewMode = 'summary' | 'detail';

export interface CompanyWithSchedule extends Company{
    company_schedule: CompanySchedule[]
}

export interface CreateCompanyInput{
    nit:string
    name:string
    city:string    
    address:string
    isotype?:string
    industry:string
    activity_description:string
    company_schedule?: CompanySchedule[]
}

export interface UpdateCompanyInput{
    name?:string,
    city?:string,    
    address?:string,
    isotype?:string,
    industry?:string,
    activity_description?: string,
    company_schedule?: CompanySchedule[]
}

export interface CompanySearchInterface{
    nit?: string;
    name?: string;
    city?: string;
    industry?: string;
    limit?: number;
    offset?: number;
    view?: CompaniesViewMode;
    sortBy?: 'id' | 'nit' | 'name' | 'city' | 'industry';
    sortDir?: 'asc' | 'desc';
}

export interface CompanySummaryDTO{
    id:number;
    nit:string;
    name:string;
    city:string;
    industry:string;
}

export interface CompanyDetailDTO extends CompanySummaryDTO{
    address:string;
    isotype: string | null;
    activity_description: string;
    company_schedule: CompanySchedule[];
}