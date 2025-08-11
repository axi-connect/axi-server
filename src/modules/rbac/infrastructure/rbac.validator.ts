import { NextFunction, Request, Response } from "express";
import Joi from "joi";

const createRoleSchema = Joi.object({
    name: Joi.string().min(3).required(),
    permissions: Joi.array().min(1).items(
        Joi.object({
            module_id: Joi.number().not(0),
            permission: Joi.array().min(1).items(
                Joi.string().valid("read", "create", "update", "delete")
            )
        })
    ).required()
});

const createModuleSchema = Joi.object({
    name: Joi.string().min(3).required(),
    route: Joi.string().required()
})

export class RbacValidator{
    static validateRoleCreation(req: Request, res: Response, next: NextFunction):void{
        const {value, error} = createRoleSchema.validate(req.body);
        if(error) res.status(400).json({error})
        else next();
    }

    static validateModuleCreation(req: Request, res: Response, next: NextFunction):void{
        const {value, error} = createModuleSchema.validate(req.body);
        if(error) res.status(400).json({error})
        else next();
    }
}