import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from './auth.middleware.js';

/**
 * Interfaces para el handler de autenticación
*/
export interface SessionInfo {
  user: {
    id: number;
    email: string;
    role_id: number;
    company_id: number;
  };
  permissions?: string[];
  connected_at: Date;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  allowed: boolean;
}

/**
 * Handler para operaciones de autenticación WebSocket
 * Namespace: /auth
 * Gestiona conexiones autenticadas y sesiones activas
*/
export class AuthHandler {
    private companyConnections = new Map<number, Set<AuthenticatedSocket>>();

    constructor() {}

    /**
     * Configura el namespace de autenticación
    */
    setup(namespace: Namespace): void {
        namespace.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`🔐 Nueva conexión autenticada: ${socket.id} (Usuario: ${socket.user?.email})`);

            // Handler para obtener información de sesión
            socket.on('auth.session', () => this.handleGetSession(socket));

            // Handler de desconexión
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Registrar conexión autenticada
            this.registerAuthenticatedConnection(socket);
        });
    }

    /**
     * Registra una conexión autenticada
    */
    private registerAuthenticatedConnection(socket: AuthenticatedSocket): void {
        if (!socket.user) return;

        const companyId = socket.user.company_id;

        // Registrar conexión por compañía
        if (!this.companyConnections.has(companyId)) this.companyConnections.set(companyId, new Set());
        this.companyConnections.get(companyId)!.add(socket);

        // Unir socket a sala de compañía
        socket.join(`company_${companyId}`);

        console.log(`✅ Usuario ${socket.user.email} registrado en compañía ${companyId}`);
    }

    /**
     * Maneja solicitud de información de sesión
    */
    private handleGetSession(socket: AuthenticatedSocket): void {
        try {
            if (!socket.user) {
                socket.emit('auth_error', {
                    message: 'Usuario no autenticado',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }

            const sessionInfo: SessionInfo = {
                user: {
                    id: socket.user.id,
                    email: socket.user.email,
                    role_id: socket.user.role_id,
                    company_id: socket.user.company_id
                },
                // permissions: this.getUserPermissions(socket.user.role_id),
                connected_at: new Date()
            };

            socket.emit('session_info', sessionInfo);
        } catch (error: any) {
            console.error('❌ Error obteniendo sesión:', error);
            socket.emit('auth_error', {
                message: 'Error obteniendo información de sesión',
                code: 'SESSION_ERROR'
            });
        }
    }

    /**
     * Maneja la desconexión de sockets autenticados
    */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`🔌 Socket autenticado desconectado: ${socket.id}`);

        // Remover de conexiones por compañía
        for (const [companyId, sockets] of Array.from(this.companyConnections.entries())) {
            if (sockets.has(socket)) {
                sockets.delete(socket);
                if (sockets.size === 0) this.companyConnections.delete(companyId);
                console.log(`📤 Usuario ${socket.user?.email} desconectado de compañía ${companyId}`);
                break;
            }
        }
    }

    /**
     * Obtiene estadísticas de conexiones autenticadas
    */
    getStats(): { totalCompanies: number; totalConnections: number } {
        let totalConnections = 0;
        for (const sockets of Array.from(this.companyConnections.values())) totalConnections += sockets.size;

        return {
            totalCompanies: this.companyConnections.size,
            totalConnections
        };
    }

    /**
     * Verifica si una compañía tiene conexiones activas
    */
    hasActiveConnections(companyId: number): boolean {
        const connections = this.companyConnections.get(companyId);
        return connections ? connections.size > 0 : false;
    }
}

/**
 * Factory function para crear y configurar el handler de autenticación
*/
export function createAuthHandler(): AuthHandler {
  return new AuthHandler();
}
