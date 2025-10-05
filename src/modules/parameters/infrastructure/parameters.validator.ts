import Joi from "joi"
import { NextFunction, Request, Response} from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";

const baseMessages = {
    'any.required': 'El campo {#label} es obligatorio',
    'string.base': 'El campo {#label} debe ser un texto',
    'array.base': 'El campo {#label} debe ser una lista',
    'object.base': 'El campo {#label} debe ser un objeto',
    'number.base': 'El campo {#label} debe ser un número',
    'boolean.base': 'El campo {#label} debe ser verdadero o falso',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'array.min': 'El campo {#label} debe incluir al menos {#limit} elemento(s)',
    'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}'
}

export const scheduleSchema = Joi.object({
    day: Joi.string().min(3).required(),
    time_range: Joi.string().min(3).required()
});

const intentionBaseSchema = {
    type: Joi.string().valid('sales','support','technical','onboarding','follow_up').label('tipo'),
    priority: Joi.string().valid('low','medium','high','urgent').label('prioridad'),
    code: Joi.string().min(3).label('código'),
    flow_name: Joi.string().label('flujo'),
    description: Joi.string().min(3).label('descripción'),
    ai_instructions: Joi.string().min(3).label('instrucciones de IA'),
}

const agentCharacterBaseSchema = {
    avatar_url: Joi.string().uri().label('avatar_url'),
    style: Joi.alternatives().try(Joi.object(), Joi.valid(null)).label('style'),
    voice: Joi.alternatives().try(Joi.object(), Joi.valid(null)).label('voice'),
    resources: Joi.alternatives().try(Joi.object(), Joi.valid(null)).label('resources')
}

const aiRequirementBaseSchema = {
    instructions: Joi.array().items(Joi.object()).min(1).label('instrucciones')
}

const intentionSchema = Joi.object(intentionBaseSchema).messages(baseMessages);
const intentionUpdateSchema = Joi.object(intentionBaseSchema).min(1).messages(baseMessages);

const agentCharacterSchema = Joi.object(agentCharacterBaseSchema).messages(baseMessages);
const agentCharacterUpdateSchema = Joi.object(agentCharacterBaseSchema).min(1).messages(baseMessages);

const aiRequirementSchema = Joi.object(aiRequirementBaseSchema).messages(baseMessages);
const aiRequirementUpdateSchema = Joi.object(aiRequirementBaseSchema).min(1).messages(baseMessages);

export const agentIntentionSchema = Joi.object({
    agent_id: Joi.number(),
    intention_id: Joi.number().required(),
    ai_requirement_id: Joi.number().required(),
    require_catalog: Joi.boolean().required(),
    require_schedule: Joi.boolean().required(),
    require_sheet: Joi.boolean().required(),
    require_db: Joi.boolean().required()
});

export class ParametersValidator{
    static validateIntentionCreation(req: Request, res: Response, next: NextFunction){
        const {value, error} = intentionSchema.validate(req.body, { abortEarly: false, convert: true });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateAgentCharacterCreation(req: Request, res: Response, next: NextFunction){
        const {value, error} = agentCharacterSchema.validate(req.body, { abortEarly: false, convert: true });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateAIRequirementsCreation(req: Request, res: Response, next: NextFunction){
        const {value, error} = aiRequirementSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }

    static validateIntentionSearch(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            type: Joi.string().valid('sales','support','technical','onboarding','follow_up'),
            priority: Joi.string().valid('low','medium','high','urgent'),
            code: Joi.string().trim(),
            flow_name: Joi.string().trim(),
            description: Joi.string().trim(),
            ai_instructions: Joi.string().trim(),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id','code','flow_name','type','priority').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc'),
            view: Joi.string().valid('summary','detail').default('summary')
        }).messages(baseMessages);

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else { (res.locals as any).intentionSearch = value; next(); }
    }

    static validateCharacterSearch(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            avatar_url: Joi.string().trim(),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id','avatar_url').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc'),
            view: Joi.string().valid('summary','detail').default('summary')
        }).messages(baseMessages);

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else { (res.locals as any).characterSearch = value; next(); }
    }

    static validateAIRequirementSearch(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            id: Joi.number().integer().min(1),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc'),
            view: Joi.string().valid('summary','detail').default('summary')
        }).messages(baseMessages);

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else { (res.locals as any).aiRequirementSearch = value; next(); }
    }

    static validateIntentionUpdate(req: Request, res: Response, next: NextFunction):void{
        const { error } = intentionUpdateSchema.validate(req.body, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateAgentCharacterUpdate(req: Request, res: Response, next: NextFunction):void{
        const { error } = agentCharacterUpdateSchema.validate(req.body, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateAIRequirementUpdate(req: Request, res: Response, next: NextFunction):void{
        const { error } = aiRequirementUpdateSchema.validate(req.body, { abortEarly: false, convert: true });
        if(error){
            const response = new ResponseDto(false, error.details.map(d=>d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    // static validateFormCreation(req: Request, res: Response, next: NextFunction){
    //     const {value, error} = formSchema.validate(req.body);
    //     if(error) res.status(400).json({error});
    //     else next();
    // }
}