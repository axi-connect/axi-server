import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { agentIntentionSchema, intentionSchema, scheduleSchema } from "../../parameters/infrastructure/parameters.validator.js";

const userSchema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.number().min(10).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    company_id: Joi.number(),
    avatar: Joi.string()
});

const agentCreateIntentionSchema = Joi.array().min(1).items(agentIntentionSchema).required();

const agentSchema = Joi.object({
    name: Joi.string().min(3).required(),
    phone: Joi.string().min(3).required(),
    company_id: Joi.number(),
    agentIntention: {create: agentCreateIntentionSchema.required()}
});

const companySchema = Joi.object({
    nit: Joi.string().required(),
    city: Joi.string().required(),
    address: Joi.string().required(),
    industry: Joi.string().required(),
    name: Joi.string().min(3).required(),
    activity_description: Joi.string().min(3).required(),
    user: {create: userSchema.required()},
    agent:{create: agentSchema.required()},
    company_schedule: {create: Joi.array().min(1).items(scheduleSchema)}
});

const updateCompanySchema = Joi.object({
    id: Joi.number().required(),
    city: Joi.string().required(),
    address: Joi.string().required(),
    industry: Joi.string().required(),
    name: Joi.string().min(3).required(),
});

const updateUserSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string(),
    phone: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string().min(6),
    role_id: Joi.number(),
    company_id: Joi.number(),
    avatar: Joi.string()
});

export class IdentitiesValidator{
    static validateCompanyCreation(req: Request, res: Response, next: NextFunction):void{
        const {value, error} = companySchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }

    static validateCompanyUpdate(req: Request, res: Response, next: NextFunction):void{
        const {value, error} = updateCompanySchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }

    static validateUserCreation(req: Request, res: Response, next: NextFunction):void {
        const { value, error } = userSchema.validate(req.body);
        if (error) res.status(400).json({ error });
        else next();
    }

    static validateUserUpdate(req: Request, res: Response, next: NextFunction):void {
        const { value, error } = updateUserSchema.validate(req.body);
        if (error) res.status(400).json({ error });
        else next();
    }

    static validateAgentCreation(req: Request, res: Response, next: NextFunction):void{
        const {value, error} = agentSchema.validate(req.body);
        if (error) res.status(400).json({ error });
        else next();
    }
}