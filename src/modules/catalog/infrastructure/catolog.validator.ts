import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export const productSchema = Joi.object({
    price: Joi.number().required(),
    catalog_id: Joi.number().required(),
    name: Joi.string().min(3).required(),
    description: Joi.string().min(3).required(),
    image: Joi.object({
        path: Joi.string().required(),
        originalname: Joi.string().required(),
        mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
        size: Joi.number().max(5 * 1024 * 1024).required()
    }).optional(),
});

const catalogSchema = Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().min(3).required(),
    company_id: Joi.number().required()
});

export class CatalogValidator{
    static validateProductCreation(req:Request, res:Response, next:NextFunction):void{

        const {value, error} = productSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }
    
    static validateCatalogCreation(req:Request, res:Response, next:NextFunction):void{
        const {value, error} = catalogSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }
}
