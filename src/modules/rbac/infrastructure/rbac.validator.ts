import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "../../../shared/dto/response.dto.js";

const createRoleSchema = Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().trim().min(3).optional(),
    hierarchy_level: Joi.number().integer().valid(0,1,2,3).default(0),
    status: Joi.string().valid('active','inactive').default('active'),
    permissions: Joi.array().min(1).items(
        Joi.object({
            module_id: Joi.number().integer().min(1).required(),
            permission: Joi.array().min(1).items(
                Joi.string().valid("read", "create", "update", "delete")
            ).required()
        })
    ).required()
});

const createModuleSchema = Joi.object({
    name: Joi.string().min(3).required(),
    path: Joi.string().required(),
    icon: Joi.string().trim().optional(),
    is_public: Joi.boolean().default(false),
    parent_id: Joi.number().integer().min(1).allow(null).optional()
})

export class RbacValidator{
    static validateRoleCreation(req: Request, res: Response, next: NextFunction):void{
        const {error} = createRoleSchema.validate(req.body);
        if(error) {
            const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateModuleCreation(req: Request, res: Response, next: NextFunction):void{
        const {error} = createModuleSchema.validate(req.body);
        if(error) {
            const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    static validateModuleUpdate(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            name: Joi.string().min(3),
            path: Joi.string(),
            icon: Joi.string().trim().allow(null),
            is_public: Joi.boolean(),
            parent_id: Joi.number().integer().min(1).allow(null)
        }).min(1);

        const { error } = schema.validate(req.body, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    /**
     * Validar actualización de rol (parcial)
     */
    static validateRoleUpdate(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            name: Joi.string().min(3),
            description: Joi.string().trim().min(3).allow(null),
            hierarchy_level: Joi.number().integer().valid(0,1,2,3),
            status: Joi.string().valid('active','inactive'),
            permissions: Joi.array().min(1).items(
                Joi.object({
                    module_id: Joi.number().integer().min(1).required(),
                    permission: Joi.array().min(1).items(
                        Joi.string().valid('read','create','update','delete')
                    ).required()
                })
            )
        }).min(1);

        const { error } = schema.validate(req.body, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
            res.status(400).json(response);
        } else next();
    }

    /**
     * Valida y normaliza parámetros de búsqueda para listar roles
     */
    static validateRoleSearch(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            name: Joi.string().trim(),
            code: Joi.string().trim(),
            hierarchyMin: Joi.number().integer().min(0),
            hierarchyMax: Joi.number().integer().min(0),
            moduleId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.array().items(Joi.number().integer().min(1))).optional(),
            permission: Joi.alternatives().try(
                Joi.string().valid('read','create','update','delete'),
                Joi.array().min(1).items(Joi.string().valid('read','create','update','delete'))
            ).optional(),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id','name','code','hierarchy_level').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc'),
            view: Joi.string().valid('summary','detail').default('summary')
        }).messages({
            'string.base': 'El campo {#label} debe ser un texto',
            'number.base': 'El campo {#label} debe ser un número',
            'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
            'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}'
        });

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            (res.locals as any).roleSearch = value;
            next();
        }
    }

    /**
     * Valida y normaliza parámetros de búsqueda para listar módulos
    */
    static validateModuleSearch(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            name: Joi.string().trim(),
            code: Joi.string().trim(),
            path: Joi.string().trim(),
            is_public: Joi.boolean(),
            type: Joi.string().valid('module','submodule').optional(),
            parent_id: Joi.alternatives().try(Joi.number().integer().min(1), Joi.valid(null)).optional(),
            roleId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.array().items(Joi.number().integer().min(1))).optional(),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id','name','code','path','is_public').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc'),
            view: Joi.string().valid('summary','detail').default('summary')
        }).messages({
            'string.valid': 'El campo {#label} no es válido. Valores permitidos: {#valids}',
            'string.base': 'El campo {#label} debe ser un texto',
            'number.base': 'El campo {#label} debe ser un número',
            'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
            'any.only': 'El campo {#label} no es válido. Valores permitidos: {#valids}'
        });

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            (res.locals as any).moduleSearch = value;
            next();
        }
    }

    /**
     * Validaciones para auditoría y logs
    */
    static validateAuditSearch(req: Request, res: Response, next: NextFunction):void{
        const maxLimit = 100;
        const schema = Joi.object({
            user_id: Joi.number().integer().min(1),
            role_id: Joi.number().integer().min(1),
            action: Joi.string().valid('role_created','role_updated','permission_granted','permission_revoked','login','logout'),
            date_from: Joi.date().iso(),
            date_to: Joi.date().iso(),
            limit: Joi.number().integer().min(0).max(maxLimit).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('timestamp','user_id','action').default('timestamp'),
            sortDir: Joi.string().valid('asc','desc').default('desc')
        });

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
            return;
        }

        if(value.date_from && value.date_to){
            const from = new Date(value.date_from);
            const to = new Date(value.date_to);
            const diffDays = (to.getTime() - from.getTime()) / (1000*60*60*24);
            if(diffDays > 90){
                const response = new ResponseDto(false, 'El rango máximo permitido es de 90 días', null, 400);
                res.status(400).json(response);
                return;
            }
        }

        (res.locals as any).auditSearch = value;
        next();
    }

    /**
     * Validaciones para overview: permite view summary/detail y filtros opcionales simples
    */
    static validateOverview(req: Request, res: Response, next: NextFunction):void{
        const schema = Joi.object({
            view: Joi.string().valid('summary','detail').default('summary'),
            roleName: Joi.string().trim(),
            permission: Joi.alternatives().try(
                Joi.string().valid('read','create','update','delete'),
                Joi.array().min(1).items(Joi.string().valid('read','create','update','delete'))
            ).optional(),
            moduleId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.array().items(Joi.number().integer().min(1))).optional(),
            roleId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.array().items(Joi.number().integer().min(1))).optional(),
            is_public: Joi.boolean(),
            limit: Joi.number().integer().min(0).default(20),
            offset: Joi.number().integer().min(0).default(0),
            sortBy: Joi.string().valid('id','name','code','hierarchy_level').default('id'),
            sortDir: Joi.string().valid('asc','desc').default('desc')
        });

        const { value, error } = schema.validate(req.query, { abortEarly: false, convert: true, errors: { wrap: { label: '' } } });
        if(error){
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else next();
    }
}