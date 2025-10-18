import Joi from "joi";
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";
import { ChannelType, ChannelProvider } from '@prisma/client';

const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const baseMessages = {
    'any.required': 'El campo {#label} es obligatorio',
    'string.base': 'El campo {#label} debe ser un texto',
    'object.base': 'El campo {#label} debe ser un objeto',
    'number.base': 'El campo {#label} debe ser un número',
    'boolean.base': 'El campo {#label} debe ser verdadero o falso',
    'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
    'string.max': 'El campo {#label} debe tener máximo {#limit} caracteres',
    'any.only': 'El campo {#label} debe ser uno de: {#valids}',
    'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
    'string.pattern.base': 'El campo {#label} tiene un formato inválido',
}

// Esquema para credenciales basado en el provider
const credentialsSchema = Joi.alternatives().try(
    // Meta/WhatsApp credentials
    Joi.object({
        accessToken: Joi.string().required().label('access token'),
        phoneNumberId: Joi.string().required().label('phone number ID'),
        appId: Joi.string().optional().label('app ID'),
        appSecret: Joi.string().optional().label('app secret'),
        webhookVerifyToken: Joi.string().optional().label('webhook verify token')
    }).label('credenciales Meta'),

    // Twilio credentials
    Joi.object({
        accountSid: Joi.string().required().label('account SID'),
        authToken: Joi.string().required().label('auth token'),
        phoneNumber: Joi.string().optional().label('phone number')
    }).label('credenciales Twilio'),

    // Custom provider credentials
    Joi.object().pattern(Joi.string(), Joi.any()).label('credenciales personalizadas')
).label('credenciales');

// Esquema para configuración del canal
const configSchema = Joi.object({
    webhookUrl: Joi.string().uri().optional().label('webhook URL'),
    phoneNumberId: Joi.string().optional().label('phone number ID'),
    accountSid: Joi.string().optional().label('account SID'),
    apiKey: Joi.string().optional().label('API key'),
    apiSecret: Joi.string().optional().label('API secret'),
    timeout: Joi.number().min(1000).max(30000).optional().label('timeout'),
    retries: Joi.number().min(0).max(10).optional().label('reintentos'),
    rateLimit: Joi.object({
        requests: Joi.number().min(1).optional().label('requests'),
        period: Joi.number().min(1).optional().label('period')
    }).optional().label('rate limit')
}).unknown(true).label('configuración');

// Esquema base para canales
const channelBaseSchema = {
    config: configSchema,
    credentials: credentialsSchema,
    is_active: Joi.boolean().label('activo'),
    name: Joi.string().min(1).max(255).trim().label('nombre'),
    company_id: Joi.number().integer().min(1).label('empresa'),
    expires_at: Joi.date().iso().optional().label('fecha de expiración'),
    type: Joi.string().valid(...Object.values(ChannelType)).label('tipo'),
    provider: Joi.string().valid(...Object.values(ChannelProvider)).label('proveedor'),
    provider_account: Joi.string().min(1).max(255).trim().label('cuenta del proveedor'),
    default_agent_id: Joi.alternatives().try(Joi.number().integer().min(1), Joi.valid(null)).label('agente por defecto')
};

// Esquemas específicos para cada operación (solo para referencia, ya no se usan estáticamente)

const channelUpdateSchema = Joi.object(channelBaseSchema).min(1).messages(baseMessages);

const channelSearchSchema = Joi.object({
    name: Joi.string().trim().custom((v) => normalizeStr(v)).label('nombre'),
    type: Joi.string().valid(...Object.values(ChannelType)).label('tipo'),
    provider: Joi.string().valid(...Object.values(ChannelProvider)).label('proveedor'),
    provider_account: Joi.string().trim().label('cuenta del proveedor'),
    is_active: Joi.boolean().label('activo'),
    company_id: Joi.number().integer().min(1).label('empresa'),
    limit: Joi.number().integer().min(1).max(100).default(20).label('límite'),
    offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
    sortBy: Joi.string().valid('created_at', 'updated_at', 'name').default('created_at').label('ordenar por'),
    sortDir: Joi.string().valid('asc', 'desc').default('desc').label('dirección de orden'),
    view: Joi.string().valid('summary', 'detail').default('summary').label('vista')
}).messages(baseMessages);

const channelIdSchema = Joi.object({
    id: Joi.string().uuid().required().label('ID del canal')
}).messages(baseMessages);

export class ChannelValidator {
    /**
     * Valida el cuerpo para crear un canal
     * Las credenciales son requeridas para proveedores OAuth (Meta, Twilio)
     * pero opcionales para proveedores con login manual (Custom)
     */
    static validateCreate(req: Request, res: Response, next: NextFunction): void {
        const { provider } = req.body;
        const requiresAuth = provider && [ChannelProvider.META, ChannelProvider.TWILIO].includes(provider);

        // Crear esquema dinámico basado en el proveedor
        const dynamicSchema = Joi.object({
            ...channelBaseSchema,
            // Campos requeridos para crear
            name: channelBaseSchema.name.required(),
            type: channelBaseSchema.type.required(),
            provider: channelBaseSchema.provider.required(),
            provider_account: channelBaseSchema.provider_account.required(),
            company_id: channelBaseSchema.company_id.required(),
            // Credenciales: requeridas para OAuth, opcionales para QR
            credentials: requiresAuth ? channelBaseSchema.credentials.required() : channelBaseSchema.credentials.optional(),
            // Campos opcionales
            config: channelBaseSchema.config.optional(),
            default_agent_id: channelBaseSchema.default_agent_id.optional(),
            expires_at: channelBaseSchema.expires_at.optional()
        }).messages(baseMessages);

        const { error } = dynamicSchema.validate(req.body, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            next();
        }
    }

    /**
     * Valida el cuerpo para actualizar un canal
     * Retorna 400 con ResponseDto si la entrada es inválida
     */
    static validateUpdate(req: Request, res: Response, next: NextFunction): void {
        const { error } = channelUpdateSchema.validate(req.body, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            next();
        }
    }

    /**
     * Valida parámetros de ruta para operaciones con ID
     * Retorna 400 con ResponseDto si el ID es inválido
     */
    static validateIdParam(req: Request, res: Response, next: NextFunction): void {
        const { error } = channelIdSchema.validate(req.params, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            next();
        }
    }

    /**
     * Valida y normaliza criterios de búsqueda de canales
     * Soporta: name, type, provider, provider_account, is_active, company_id, limit, offset, sortBy, sortDir, view
     */
    static validateSearchCriteria(req: Request, res: Response, next: NextFunction): void {
        const { value, error } = channelSearchSchema.validate(req.query, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
            return;
        }

        // Normalizar provider_account si viene
        if (value.provider_account) {
            value.provider_account = String(value.provider_account).trim();
        }

        res.locals.searchCriteria = value;
        next();
    }

    /**
     * Valida credenciales específicas por proveedor
     * Puede ser usado adicionalmente a validateCreate para validaciones más específicas
     */
    static validateProviderCredentials(req: Request, res: Response, next: NextFunction): void {
        const { provider, credentials } = req.body;

        let specificSchema;

        switch (provider) {
            case ChannelProvider.META:
                specificSchema = Joi.object({
                    accessToken: Joi.string().required().min(10).label('access token'),
                    phoneNumberId: Joi.string().required().pattern(/^\d+$/).label('phone number ID'),
                    appId: Joi.string().optional().pattern(/^\d+$/).label('app ID'),
                    appSecret: Joi.string().optional().min(10).label('app secret'),
                    webhookVerifyToken: Joi.string().optional().min(5).label('webhook verify token')
                });
                break;

            case ChannelProvider.TWILIO:
                specificSchema = Joi.object({
                    accountSid: Joi.string().required().pattern(/^AC[a-f0-9]{32}$/).label('account SID'),
                    authToken: Joi.string().required().min(10).label('auth token'),
                    phoneNumber: Joi.string().optional().pattern(/^\+?[1-9]\d{1,14}$/).label('phone number')
                });
                break;

            case ChannelProvider.CUSTOM:
                specificSchema = Joi.object().min(1).label('credenciales personalizadas');
                break;

            default:
                specificSchema = Joi.object().min(1);
        }

        const { error } = specificSchema.validate(credentials, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = `Credenciales inválidas para ${provider}: ${error.details.map(d => d.message).join(', ')}`;
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            next();
        }
    }

    /**
     * Valida el cuerpo para completar autenticación
    */
    static validateCompleteAuth(req: Request, res: Response, next: NextFunction): void {
        const completeAuthSchema = Joi.object({
            sessionId: Joi.string().uuid().required().label('ID de sesión'),
            metadata: Joi.object().optional().label('metadata adicional')
        }).messages(baseMessages);

        const { error } = completeAuthSchema.validate(req.body, {
            abortEarly: false,
            convert: true,
            errors: { wrap: { label: '' } }
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            const response = new ResponseDto(false, message, null, 400);
            res.status(400).json(response);
        } else {
            next();
        }
    }
}
