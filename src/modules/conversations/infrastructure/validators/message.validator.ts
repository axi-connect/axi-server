import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { MessageDirection, MessageStatus } from '@prisma/client';

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
  'string.guid': 'El campo {#label} debe ser un UUID válido',
  'string.pattern.base': 'El campo {#label} tiene un formato inválido',
};

const createSchema = Joi.object({
  from: Joi.string().optional().label('remitente'),
  to: Joi.string().optional().label('destinatario'),
  message: Joi.string().min(1).required().label('mensaje'),
  payload: Joi.object().unknown(true).optional().label('payload'),
  metadata: Joi.object().unknown(true).optional().label('metadata'),
  direction: Joi.string().valid(...Object.values(MessageDirection)).required().label('dirección'),
  conversation_id: Joi.string().guid({ version: ['uuidv4'] }).required().label('ID de la conversación'),
  content_type: Joi.string().min(1).required().label('tipo de contenido'),
}).messages(baseMessages);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(MessageStatus)).required().label('estado'),
}).messages(baseMessages);

const searchSchema = Joi.object({
  direction: Joi.string().valid(...Object.values(MessageDirection)).optional().label('dirección'),
  status: Joi.string().valid(...Object.values(MessageStatus)).optional().label('estado'),
  content_type: Joi.string().optional().label('tipo de contenido'),
  from: Joi.string().optional().label('remitente'),
  to: Joi.string().optional().label('destinatario'),
  date_from: Joi.date().iso().optional().label('fecha desde'),
  date_to: Joi.date().iso().optional().label('fecha hasta'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('límite'),
  offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
  sortBy: Joi.string().valid('timestamp', 'created_at').default('timestamp').label('ordenar por'),
  sortDir: Joi.string().valid('asc', 'desc').default('asc').label('dirección de orden'),
}).messages(baseMessages);

export class MessageValidator {
  static validateCreate(req: Request, res: Response, next: NextFunction): void {
    const { error } = createSchema.validate(req.body, {
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

    next();
  }

  static validateUpdateStatus(req: Request, res: Response, next: NextFunction): void {
    const { error } = updateStatusSchema.validate(req.body, {
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

    next();
  }

  static validateSearchCriteria(req: Request, res: Response, next: NextFunction): void {
    const { value, error } = searchSchema.validate(req.query, {
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

    res.locals.searchCriteria = value;
    next();
  }
}