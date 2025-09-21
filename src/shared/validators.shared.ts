import Joi from "joi";
import { ResponseDto } from "./dto/response.dto.js";
import { Request, Response, NextFunction } from "express";

// Centraliza la definición del esquema de ID del sistema.
// Actualmente: ID numérico positivo. Si migramos a UUID, cambiamos aquí.
export const systemIdSchema = Joi.number().positive().required().messages({
  'number.base': 'ID inválido',
  'number.positive': 'ID inválido',
  'any.required': 'ID requerido'
});

type IdFormat = 'number' | 'uuid' | 'both';

// UUID schema (default v4). Adjust versions if needed in the future
const uuidSchema = Joi.string().guid({ version: ['uuidv4'] }).required().messages({
  'string.guid': 'ID inválido',
  'any.required': 'ID requerido'
});

// Factory to obtain the system ID schema depending on the desired format
export function getSystemIdSchema(format: IdFormat = 'number'){
  if (format === 'uuid') return uuidSchema;
  if (format === 'both') return Joi.alternatives().try(systemIdSchema, uuidSchema).required().messages({
    'alternatives.match': 'ID inválido',
    'any.required': 'ID requerido'
  });
  return systemIdSchema;
}

/**
 * Middleware genérico para validar un parámetro de ruta como ID del sistema.
*/
export function validateIdParam(paramName: string = 'id', format: IdFormat = 'number') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawId = req.params[paramName];
    const schema = getSystemIdSchema(format);

    // For numeric IDs, parse prior to validation to ensure type correctness
    if (format === 'number'){
      // Reject strings that aren't strictly digits to avoid parseInt partials like '189ADF' -> 189
      if (typeof rawId !== 'string' || !/^\d+$/.test(rawId)){
        const response = new ResponseDto(false, 'ID inválido', null, 400);
        res.status(400).json(response);
        return;
      }
    }

    const valueToValidate = format === 'number'
      ? (rawId != null ? parseInt(rawId, 10) : undefined)
      : rawId;

    const { error } = schema.validate(valueToValidate, { convert: true });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  };
}

/**
 * Generic ID validator for params, query or body.
 * Centralizes ID validation to easily switch to UUIDs in the future.
 */
export function validateId(source: 'params'|'query'|'body' = 'params', paramName: string = 'id', format: IdFormat = 'number'){
  return (req: Request, res: Response, next: NextFunction): void => {
    const container:any = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
    const rawId = container ? container[paramName] : undefined;
    const schema = getSystemIdSchema(format);

    if (format === 'number'){
      const rawStr = rawId != null ? String(rawId) : undefined;
      if (typeof rawStr !== 'string' || !/^\d+$/.test(rawStr)){
        const response = new ResponseDto(false, 'ID inválido', null, 400);
        res.status(400).json(response);
        return;
      }
    }

    const valueToValidate = format === 'number'
      ? (rawId != null ? parseInt(String(rawId), 10) : undefined)
      : rawId;

    const { error } = schema.validate(valueToValidate, { convert: true });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }
}