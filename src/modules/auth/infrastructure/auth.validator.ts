import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { ResponseDto } from '../../../shared/dto/response.dto.js';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const logoutSchema = Joi.object({
  refresh_token: Joi.string().optional(),
});

export class AuthValidator {
  static validateLogin(req: Request, res: Response, next: NextFunction): void {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
      res.status(400).json(response);
      return;
    }
    next();
  }

  static validateRefresh(req: Request, res: Response, next: NextFunction): void {
    const { error } = refreshSchema.validate(req.body);
    if (error) {
      const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
      res.status(400).json(response);
      return;
    }
    next();
  }

  static validateLogout(req: Request, res: Response, next: NextFunction): void {
    const { error } = logoutSchema.validate(req.body ?? {});
    if (error) {
      const response = new ResponseDto(false, error.details.map(d => d.message).join(', '), null, 400);
      res.status(400).json(response);
      return;
    }
    next();
  }
}