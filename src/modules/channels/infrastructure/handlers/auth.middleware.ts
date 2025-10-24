import { ExtendedError, Socket } from 'socket.io';
import { TokenService, type JwtPayload } from '../../../auth/application/token.service.js';

/**
 * Información de usuario autenticado disponible en el socket
*/
export interface AuthenticatedUser {
  id: number;
  email: string;
  role_id: number;
  company_id: number;
  token_type: 'access' | 'refresh';
  jti?: string;
}

/**
 * Socket extendido con información de autenticación
*/
export interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser;
}

/**
 * Middleware de autenticación JWT para Socket.IO
 * Valida tokens JWT desde headers de handshake y adjunta información de usuario al socket
*/
export class SocketAuthMiddleware {
    constructor(private tokenService: TokenService) {}

    /**
     * Middleware principal de autenticación
     * Se ejecuta durante el handshake de conexión
    */
    authMiddleware = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void => {
        try {
            // Extraer token desde diferentes fuentes posibles
            const token = this.extractToken(socket);

            if (!token) return next(new Error('Token de autenticación requerido'));

            // Verificar y decodificar token
            const payload = this.tokenService.verifyToken<JwtPayload>(token);

            // Validar que sea un token de acceso
            if (payload.token_type !== 'access') return next(new Error('Se requiere un token de acceso válido'));

            // Adjuntar información de usuario al socket
            socket.user = {
                id: payload.id,
                email: payload.email,
                role_id: payload.role_id,
                company_id: payload.company_id,
                token_type: payload.token_type,
                jti: payload.jti
            };

            console.log(`🔐 Socket ${socket.id} autenticado para usuario ${payload.email} (empresa: ${payload.company_id})`);
            next();

        } catch (error: any) {
            console.error('❌ Error de autenticación en socket:', error.message);

            if (error.name === 'JsonWebTokenError') return next(new Error('Token JWT inválido'));

            if (error.name === 'TokenExpiredError') return next(new Error('Token JWT expirado'));

            next(new Error('Error interno de autenticación'));
        }
    };

    /**
     * Extrae token JWT desde diferentes fuentes del handshake
    */
    private extractToken(socket: AuthenticatedSocket): string | null {
        // 1. Desde handshake.auth (recomendado por Socket.IO)
        if (socket.handshake.auth?.token) {
            return socket.handshake.auth.token;
        }

        // 2. Desde headers de autorización
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);

        return null;
    }

    /**
     * Middleware opcional para verificar permisos específicos
    */
    requirePermission(permission: string) {
        return (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void => {
            if (!socket.user) {
                return next(new Error('Usuario no autenticado'));
            }

            // TODO: Implementar verificación de permisos basada en role_id
            // Por ahora permitimos todo para usuarios autenticados
            next();
        };
    }

    /**
     * Middleware para verificar pertenencia a una compañía específica
    */
    requireCompanyAccess(requiredCompanyId?: number) {
        return (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void => {
            if (!socket.user) return next(new Error('Usuario no autenticado'));
            if (requiredCompanyId && socket.user.company_id !== requiredCompanyId) return next(new Error('Acceso denegado: compañía incorrecta'));

            next();
        };
    }
}

/**
 * Factory function para crear middleware de autenticación
*/
export function createSocketAuthMiddleware(): SocketAuthMiddleware {
  const tokenService = new TokenService();
  return new SocketAuthMiddleware(tokenService);
}

/**
 * Helper para verificar si un socket está autenticado
*/
export function isAuthenticated(socket: AuthenticatedSocket): socket is AuthenticatedSocket & { user: AuthenticatedUser } {
  return !!socket.user;
}

/**
 * Helper para obtener usuario de socket autenticado
*/
export function getAuthenticatedUser(socket: AuthenticatedSocket): AuthenticatedUser | null {
  return socket.user || null;
}