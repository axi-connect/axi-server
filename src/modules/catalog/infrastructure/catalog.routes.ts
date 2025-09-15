import { Router } from "express";
import { CatalogValidator } from "./catolog.validator.js";
import { CatalogRepository } from "./catalog.repository.js";
import { CatalogController } from "./catalog.controller.js";
import { upload } from "../../../middlewares/upload.middleware.js"; 
import { CatalogUseCases } from "../application/catalog.usescases.js";

export const CatalogRouter = Router();
const catalogRepository = new CatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepository);
const catalogController = new CatalogController(catalogUseCases);

CatalogRouter.post('/create',catalogController.createCatalog);

CatalogRouter.post('/product/create', 
    async (req, res, next) => {
        req.folder = "products"; 
        const catalog = await catalogUseCases.getCatalog(req.body.catalog_id);
        if(!catalog.length) throw new Error("Catalogo no encontrado");
        req.company_id = catalog[0].company_id;
        next();
    },
    upload.single("image"),CatalogValidator.validateProductCreation, catalogController.createProduct
);

CatalogRouter.get('/:id', catalogController.getCatalog);
CatalogRouter.get('/options/:id', catalogController.getOptionsCatalog);
