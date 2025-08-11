import { Catalog, PrismaClient, Product } from "@prisma/client";
import { catalogDependency, createCatalogInterface, createProductInterface } from "../domain/catalog.interface.js";

export class CatalogRepository{
    private db:PrismaClient;
    
    constructor(){
        this.db = new PrismaClient();
    }

    async createProduct(product:createProductInterface):Promise<Product>{
        return this.db.product.create({data: product});
    }

    async getProduct(value?:any, column:string='id'):Promise<Product[]>{
        return this.db.product.findMany({
            where:{[column]:value}
        })
    }

    async createCatalog(catalog:createCatalogInterface):Promise<Catalog>{
        return this.db.catalog.create({data: catalog});
    }

    async getCatalog(where:{[key:string]:any}, select?:{[key:string]:any}):Promise<any[]>{
        return this.db.catalog.findMany({
            where,
            select: select ?? {
                id: true,
                name: true,
                description: true,
                company_id: true,
                code: true,
                products: true
            }
        });
    }
}