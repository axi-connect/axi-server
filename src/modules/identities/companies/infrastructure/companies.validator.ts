import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";

const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const validDays = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];

// Esquemas atómicos reutilizables
const scheduleItemSchema = Joi.object({
    day: Joi.string().label('día').custom((value, helpers)=>{
        const normalized = normalizeStr(value);
        if (!validDays.includes(normalized)){
            return helpers.error('any.only', { label: 'día', valids: validDays.join(', ') });
        }
        return normalized;
    }).required(),
    time_range: Joi.string().required().label('rango de horario'),
});

// Forma base del documento (sin marcar requeridos)
const companyShape = {
    nit: Joi.string().label('NIT'),
    city: Joi.string().label('ciudad'),
    address: Joi.string().label('dirección'),
    industry: Joi.string().label('industria'),
    name: Joi.string().min(3).label('nombre'),
    activity_description: Joi.string().min(3).label('descripción de actividad'),
    company_schedule: Joi.array().min(1).items(scheduleItemSchema).label('horario de compañía')
};

// Crear: hereda la forma base y marca los campos requeridos
const companyCreateSchema = Joi.object(companyShape).fork([
    'nit','city','address','industry','name','activity_description','company_schedule'
], (schema) => schema.required()).messages({
    'any.required': 'El campo {#label} es obligatorio',
    'string.base': 'El campo {#label} debe ser un texto',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'number.base': 'El campo {#label} debe ser un número',
    'array.min': 'Debe proporcionar al menos {#limit} elemento(s) en {#label}',
    'object.base': 'El campo {#label} debe ser un objeto',
    'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}'
});

// Actualizar: hereda la forma base y vuelve todos los campos opcionales
const companyUpdateSchema = Joi.object(companyShape).fork(Object.keys(companyShape), (schema)=> schema.optional()).messages({
    'string.base': 'El campo {#label} debe ser un texto',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres'
});

/**
 * Validadores de Compañías (schemas y middlewares)
 * - Valida los cuerpos para crear y actualizar compañías
*/
export class CompaniesValidator{
    /**
     * Valida el cuerpo para crear una compañía
    */
    static validateCreate(req: Request, res: Response, next: NextFunction):void{
        const { value, error } = companyCreateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            // Aplicar normalizaciones del schema
            req.body = value;
            next();
        }
    }

    /**
     * Valida el cuerpo para actualizar una compañía
    */
    static validateUpdate(req: Request, res: Response, next: NextFunction):void{
        const { value, error } = companyUpdateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            // Aplicar normalizaciones del schema
            req.body = value;
            next();
        }
    }

    /**
     * Valida y normaliza parámetros de búsqueda para listar compañías
     * - Hereda forma base de filtros y aplica normalización a name/city/industry
     */
    static validateSearchCriteria(req: Request, res: Response, next: NextFunction):void{
        const searchShape = {
            nit: Joi.string().trim().label('NIT'),
            name: Joi.string().trim().custom((v)=> normalizeStr(v)).label('nombre'),
            city: Joi.string().trim().custom((v)=> normalizeStr(v)).label('ciudad'),
            industry: Joi.string().trim().custom((v)=> normalizeStr(v)).label('industria'),
            limit: Joi.number().integer().min(0).default(20).label('límite'),
            offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
            view: Joi.string().valid('summary', 'detail').default('summary').label('vista'),
            sortBy: Joi.string().valid('id','nit','name','city','industry').default('id').label('ordenar por'),
            sortDir: Joi.string().valid('asc','desc').default('desc').label('dirección de orden')
        } as const;

        const searchSchema = Joi.object(searchShape).messages({
            'string.base': 'El campo {#label} debe ser un texto',
            'number.base': 'El campo {#label} debe ser un número',
            'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
            'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}'
        });

        const { value, error } = searchSchema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            res.locals.search = value;
            next();
        }
    }
}