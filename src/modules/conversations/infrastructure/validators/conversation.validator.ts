import Joi from "joi";
import { ParticipantType } from '@prisma/client';
import { NextFunction, Request, Response } from "express";
import { ResponseDto } from "@/shared/dto/response.dto.js";

const baseMessages = {
  'any.required': 'El campo {#label} es obligatorio',
  'string.base': 'El campo {#label} debe ser un texto',
  'object.base': 'El campo {#label} debe ser un objeto',
  'number.base': 'El campo {#label} debe ser un número',
  'string.guid': 'El campo {#label} debe ser un UUID válido',
  'any.only': 'El campo {#label} debe ser uno de: {#valids}',
  'boolean.base': 'El campo {#label} debe ser verdadero o falso',
  'number.min': 'El campo {#label} debe ser mayor o igual a {#limit}',
  'string.pattern.base': 'El campo {#label} tiene un formato inválido',
  'string.max': 'El campo {#label} debe tener máximo {#limit} caracteres',
  'string.min': 'El campo {#label} debe tener al menos {#limit} caracteres',
};

const createSchema = Joi.object({
  channel_id: Joi.string().uuid().required().label('canal'),
  external_id: Joi.string().min(1).required().label('id externo'),
  participant_id: Joi.string().optional().label('id participante'),
  company_id: Joi.number().integer().min(1).required().label('empresa'),
  assigned_agent_id: Joi.number().integer().min(1).optional().label('agente asignado'),
  participant_meta: Joi.object().unknown(true).optional().label('metadata participante'),
  participant_type: Joi.string().valid(...Object.values(ParticipantType)).required().label('tipo de participante'),
}).messages(baseMessages);

const searchSchema = Joi.object({
  status: Joi.string().trim().optional().label('estado'),
  channel_id: Joi.string().uuid().optional().label('canal'),
  assigned_agent_id: Joi.number().integer().min(1).optional().label('agente asignado'),
  participant_id: Joi.string().optional().label('id participante'),
  participant_type: Joi.string().valid(...Object.values(ParticipantType)).optional().label('tipo de participante'),
  date_from: Joi.date().iso().optional().label('fecha desde'),
  date_to: Joi.date().iso().optional().label('fecha hasta'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('límite'),
  offset: Joi.number().integer().min(0).default(0).label('desplazamiento'),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'last_message_at').default('updated_at').label('ordenar por'),
  sortDir: Joi.string().valid('asc', 'desc').default('desc').label('dirección de orden'),
}).messages(baseMessages);

export class ConversationValidator {
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