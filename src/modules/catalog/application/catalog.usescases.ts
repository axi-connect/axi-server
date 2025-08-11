import fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import { Catalog, Product } from "@prisma/client";
import { catalogDependency, createCatalogInterface, createProductInterface, ReadOptionsCatalog } from "../domain/catalog.interface.js";
import { CatalogRepository } from "../infrastructure/catalog.repository.js";
import { generateCode } from "../../../shared/utils/utils.shared.js";

export class CatalogUseCases{
    constructor(private catalogRepository:CatalogRepository){}

    async createProduct(product:createProductInterface):Promise<Product>{
        const product_data = {...product, price:Number(product.price), catalog_id:Number(product.catalog_id)};
        const catalog = await this.getCatalog(product_data.catalog_id)

        if(!catalog.length){
            if(product.image){
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                const imagePath = path.join(__dirname, '..', '/..', '/..', '/..', product.image);
                console.log(imagePath)
                // if(fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
            throw new Error('No se encontro el catalogo');
        }

        return this.catalogRepository.createProduct(product_data);
    }

    async getProduct(value?:any, column:string='id'):Promise<Product[]>{
        return this.catalogRepository.getProduct(value, column);
    }

    async createCatalog(catalog:createCatalogInterface):Promise<Catalog>{
        const code = generateCode();
        const catalog_data = {...catalog, code};
        return this.catalogRepository.createCatalog(catalog_data);
    }

    async getCatalog(value?:any, column:string='id'):Promise<catalogDependency[]>{
        return this.catalogRepository.getCatalog({[column]:value});
    }

    async getOptionsCatalog(company_id:string):Promise<ReadOptionsCatalog[]>{
        return this.catalogRepository.getCatalog({
            company_id: Number(company_id)
        },{
            id: true,
            name: true,
            code: true
        });
    }

    async getCatalogByCompanyId(id:string):Promise<catalogDependency[]>{
        const company_id = Number(id);
        return this.catalogRepository.getCatalog({company_id});
    }
}