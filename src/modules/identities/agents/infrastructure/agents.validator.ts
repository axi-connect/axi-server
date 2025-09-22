import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";

const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const agentIntentionSchema = Joi.array().min(1).items(Joi.object({
    intention_id: Joi.number().required().label('intención'),
    require_catalog: Joi.boolean().required().label('requiere catálogo'),
    require_schedule: Joi.boolean().required().label('requiere agenda'),
    require_db: Joi.boolean().required().label('requiere base de datos'),
    require_sheet: Joi.boolean().required().label('requiere hoja de cálculo'),
    require_reminder: Joi.boolean().required().label('requiere recordatorio'),
    ai_requirement_id: Joi.number().required().label('requisito de IA'),
})).required().messages({
    'any.required': 'El campo {#label} es obligatorio',
    'number.base': 'El campo {#label} debe ser un número',
    'boolean.base': 'El campo {#label} debe ser verdadero o falso',
    'array.min': 'Debe proporcionar al menos {#limit} elemento(s) en {#label}'
});

const agentCreateSchema = Joi.object({
    name: Joi.string().min(3).required().label('nombre'),
    phone: Joi.string().min(3).required().label('teléfono'),
    company_id: Joi.number().required().label('empresa'),
    agentIntention: Joi.object({ create: agentIntentionSchema }).required().label('intenciones del agente'),
    skills: Joi.array().items(Joi.string().trim()).min(1).required().label('habilidades')
}).messages({
    'any.required': 'El campo {#label} es obligatorio',
    'string.base': 'El campo {#label} debe ser un texto',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'number.base': 'El campo {#label} debe ser un número',
    'array.base': 'El campo {#label} debe ser una lista',
    'array.min': 'El campo {#label} debe incluir al menos {#limit} elemento(s)',
    'object.base': 'El campo {#label} debe ser un objeto'
});

const agentUpdateSchema = Joi.object({
    name: Joi.string().label('nombre'),
    phone: Joi.string().label('teléfono'),
    alive: Joi.boolean().label('disponible'),
}).messages({
    'string.base': 'El campo {#label} debe ser un texto',
    'boolean.base': 'El campo {#label} debe ser verdadero o falso'
});

export class AgentsValidator{
    /**
     * Valida el cuerpo para crear un agente
     * Retorna 400 con ResponseDto si la entrada es inválida
    */
    static validateCreate(req: Request, res: Response, next: NextFunction):void{
        const {error} = agentCreateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }

    /**
     * Valida el cuerpo para actualizar un agente
     * Retorna 400 con ResponseDto si la entrada es inválida
    */
    static validateUpdate(req: Request, res: Response, next: NextFunction):void{
        const {error} = agentUpdateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }

    /**
     * Valida y normaliza criterios de búsqueda de agentes
     * Soporta: name, phone, company_id, alive, limit, offset, view
    */
    static validateSearchCriteria(req: Request, res: Response, next: NextFunction):void{
        const searchSchema = Joi.object({
            name: Joi.string().trim().custom((v)=> normalizeStr(v)).label('nombre'),
            phone: Joi.string().trim().label('teléfono'),
            company_id: Joi.number().integer().min(1).label('empresa'),
            alive: Joi.boolean().label('disponible'),
            limit: Joi.number().integer().min(0).default(20).label('límite'),
            offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
            view: Joi.string().valid('summary','detail').default('summary').label('vista'),
            sortBy: Joi.string().valid('id','name','phone','company_id','alive').default('id').label('ordenar por'),
            sortDir: Joi.string().valid('asc','desc').default('desc').label('dirección de orden')
        }).messages({
            'string.base': 'El campo {#label} debe ser un texto',
            'number.base': 'El campo {#label} debe ser un número',
            'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
            'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}',
            'boolean.base': 'El campo {#label} debe ser verdadero o falso'
        });

        const { value, error } = searchSchema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
            return;
        }
        // Normalizar phone a dígitos si viene
        if(value.phone){
            value.phone = String(value.phone).replace(/\D/g,'');
        }
        res.locals.search = value;
        next();
    }
}