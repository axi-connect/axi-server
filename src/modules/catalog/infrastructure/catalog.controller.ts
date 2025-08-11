import { NextFunction, Request, Response } from "express";
import { CatalogUseCases } from "../application/catalog.usescases.js";

export class CatalogController{
    constructor(private catalogUseCases:CatalogUseCases){}

    createProduct = async(req:Request, res:Response):Promise<void>=>{
        try {
            if(req.file?.path){
                const image_url = `/uploads/company_${req.company_id}/${req.folder}/${req?.file?.filename}`;
                req.body.image = image_url;
            }
            
            const product = await this.catalogUseCases.createProduct(req.body);
            res.status(200).json({
                successful: true,
                message: "Producto creado correctamente",
                data: product
            });
        } catch (error:any) {
            res.status(500).json({
                successful:false,
                message:error.message
            });
        }
    }

    createCatalog = async(req:Request, res:Response):Promise<void>=>{   
        try {
            const catalog = await this.catalogUseCases.createCatalog(req.body);
            res.status(200).json({
                successful: true,
                message: "Catalogo creado correctamente",
                data: catalog
            });
        } catch (error:any) {
            res.status(500).json({
                successful:false,
                message:error.message
            });
        }

    }

    getCatalog = async(req:Request, res:Response):Promise<void>=>{
        try {
            const {id} = req.params;
            const catalog = await this.catalogUseCases.getCatalogByCompanyId(id);
            res.status(200).json({
                successful: true,
                message: "Catalogo obtenido correctamente",
                data: catalog
            });

        } catch (error:any) {
            res.status(500).json({
                successful:false,
                message:error.message
            });
        }
    }

    getOptionsCatalog = async(req:Request, res:Response):Promise<void>=>{
        try {
            const {id} = req.params;
            const catalog = await this.catalogUseCases.getOptionsCatalog(id);
            res.status(200).json({
                successful: true,
                message: "Catalogo obtenido correctamente",
                data: catalog
            });

        } catch (error:any) {
            res.status(500).json({
                successful:false,
                message:error.message
            });
        }
    }
}


