import { Catalog, Product } from "@prisma/client";

export interface catalogDependency extends Catalog{
    id: number;
    name: string;
    code: string;
    description: string;
    company_id: number;
    products?: Product[]
}

export interface ReadOptionsCatalog{
    id: number;
    name: string;
    code: string;
}

export interface createProductInterface{
    name:string;
    description:string;
    price:number;
    image:string;
    catalog_id:number;
}

export interface createCatalogInterface{
    name:string;
    code:string;
    description:string;
    company_id:number;
}
