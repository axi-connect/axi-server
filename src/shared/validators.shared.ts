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

/**
 * Middleware genérico para validar un parámetro de ruta como ID del sistema.
*/
export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawId = req.params[paramName];
    const parsedId = rawId != null ? parseInt(rawId, 10) : undefined;

    const { error } = systemIdSchema.validate(parsedId);
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  };
}