import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";

const userCreateSchema = Joi.object({
    name: Joi.string().required().label('nombre'),
    phone: Joi.string().min(10).required().label('teléfono'),
    email: Joi.string().email().required().label('correo electrónico'),
    password: Joi.string().min(6).required().label('contraseña'),
    company_id: Joi.number().required().label('empresa'),
    avatar: Joi.string().label('avatar'),
    role_id: Joi.number().required().label('rol'),
}).messages({
    'any.required': 'El campo {#label} es obligatorio',
    'string.base': 'El campo {#label} debe ser un texto',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'string.email': 'El campo {#label} debe ser un correo válido',
    'number.base': 'El campo {#label} debe ser un número'
});

const userUpdateSchema = Joi.object({
    name: Joi.string().label('nombre'),
    phone: Joi.string().label('teléfono'),
    email: Joi.string().email().label('correo electrónico'),
    password: Joi.string().min(6).label('contraseña'),
    company_id: Joi.number().label('empresa'),
    avatar: Joi.string().label('avatar'),
    role_id: Joi.number().label('rol'),
}).messages({
    'string.base': 'El campo {#label} debe ser un texto',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'string.email': 'El campo {#label} debe ser un correo válido',
    'number.base': 'El campo {#label} debe ser un número'
});

export class UsersValidator{
    /**
     * Valida el cuerpo para crear un usuario
     * Retorna 400 con ResponseDto si la entrada es inválida
     */
    static validateCreate(req: Request, res: Response, next: NextFunction):void{
        const { error } = userCreateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }

    /**
     * Valida el cuerpo para actualizar un usuario
     * Retorna 400 con ResponseDto si la entrada es inválida
     */
    static validateUpdate(req: Request, res: Response, next: NextFunction):void{
        const { error } = userUpdateSchema.validate(req.body, { abortEarly: false, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }
}

export class UsersSearchValidator{
    static validate(req: Request, res: Response, next: NextFunction): void {
        const schema = Joi.object({
            name: Joi.string().trim().label('nombre'),
            email: Joi.string().email().label('correo electrónico'),
            phone: Joi.string().trim().label('teléfono'),
            company_id: Joi.number().integer().min(1).label('empresa'),
            role_id: Joi.number().integer().min(1).label('rol'),
            limit: Joi.number().integer().min(0).default(20).label('límite'),
            offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
            view: Joi.string().valid('summary','detail').default('summary').label('vista'),
            sortBy: Joi.string().valid('id','name','email','phone','company_id','role_id').default('id').label('ordenar por'),
            sortDir: Joi.string().valid('asc','desc').default('desc').label('dirección de orden')
        }).messages({
            'string.base': 'El campo {#label} debe ser un texto',
            'number.base': 'El campo {#label} debe ser un número',
            'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
            'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}',
            'string.email': 'El campo {#label} debe ser un correo válido'
        });

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
            return;
        }
        if (value.phone) {
            value.phone = String(value.phone).replace(/\D/g, '');
        }
        res.locals.search = value;
        next();
    }
}

