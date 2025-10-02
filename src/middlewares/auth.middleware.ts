import { Request, Response, NextFunction } from 'express';
import { ResponseDto } from '../shared/dto/response.dto.js';
import { TokenService, JwtPayload } from '../modules/auth/application/token.service.js';

declare global {
  namespace Express {
    interface Request {
      user_id?: number;
      company_id?: number;
      role_id?: number;
      user_email?: string;
    }
  }
}

const tokenService = new TokenService();

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = new ResponseDto(false, 'Token de autenticación requerido', null, 401);
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring('Bearer '.length);
    const payload = tokenService.verifyToken<JwtPayload>(token);
    if (payload.token_type !== 'access') {
      const response = new ResponseDto(false, 'Token inválido', null, 401);
      res.status(401).json(response);
      return;
    }

    req.user_id = payload.id;
    req.company_id = payload.company_id;
    req.role_id = payload.role_id;
    req.user_email = payload.email;
    next();
  } catch (err: any) {
    console.log('error --->', err);
    const response = new ResponseDto(false, 'No autorizado', null, 401);
    res.status(401).json(response);
  }
}