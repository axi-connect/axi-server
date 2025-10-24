import { Namespace } from 'socket.io';
import { type AuthenticatedSocket } from './auth.middleware.js';
import { ChannelRuntimeService } from '../../application/services/channel-runtime.service.js';

/**
 * Interfaces para el handler de canales
*/
export interface ChannelStatusRequest {
  channelId: string;
}

export interface ChannelJoinRequest {
  channelId: string;
}

export interface ChannelLeaveRequest {
  channelId: string;
}

export interface ChannelStatusResponse {
    channelId: string;
    status: any;
    timestamp: Date;
}

export interface ChannelJoinResponse {
    channelId: string;
    joined: boolean;
    timestamp: Date;
}

/**
 * Handler para operaciones de canales WebSocket
 * Namespace: /channel
 * Gestiona uniones, salidas y consultas de estado de canales
*/
export class ChannelHandler {
    private socketChannels = new Map<string, Set<string>>(); // socketId -> Set<channelIds>
    private connections = new Map<string, Set<AuthenticatedSocket>>();

    constructor(private runtimeService: ChannelRuntimeService) {}

    /**
     * Configura el namespace de canales
    */
    setup(namespace: Namespace): void {
        namespace.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`📡 Nueva conexión autenticada de canal: ${socket.id} (Usuario: ${socket.user?.email})`);

            // Inicializar mapa para este socket
            this.socketChannels.set(socket.id, new Set());

            // Handler para consultar estado de canal
            socket.on('channel.status', (data: ChannelStatusRequest) => {
                this.handleChannelStatus(socket, data, namespace);
            });

            // Handler para unirse a canal
            socket.on('channel.join', (data: ChannelJoinRequest) => {
                this.handleJoinChannel(socket, data, namespace);
            });

            // Handler para salir de canal
            socket.on('channel.leave', (data: ChannelLeaveRequest) => {
                this.handleLeaveChannel(socket, data, namespace);
            });

            // Handler de desconexión
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    /**
     * Maneja solicitud de estado de canal
    */
    private async handleChannelStatus(
        socket: AuthenticatedSocket,
        data: ChannelStatusRequest,
        namespace: Namespace
    ): Promise<void> {
        try {
            const { channelId } = data;

            if (!channelId || typeof channelId !== 'string') {
                socket.emit('channel_error', {
                    message: 'channelId requerido y debe ser un string',
                    code: 'INVALID_CHANNEL_ID',
                    request: data
                });
                return;
            }

            // Verificar que el usuario tenga acceso al canal (basado en compañía)
            if (!await this.validateChannelAccess(socket, channelId)) {
                socket.emit('channel_error', {
                    message: 'Acceso denegado al canal',
                    code: 'CHANNEL_ACCESS_DENIED',
                    channelId
                });
                return;
            }

            const status = await this.runtimeService.getChannelStatus(channelId);

            const response: ChannelStatusResponse = {
                channelId,
                status,
                timestamp: new Date()
            };

            socket.emit('channel.status_response', response);

            console.log(`📊 Estado consultado para canal ${channelId} por usuario ${socket.user?.email}`);
        } catch (error: any) {
            console.error('❌ Error obteniendo estado de canal:', error);
            socket.emit('channel_error', {
                message: error.message || 'Error interno consultando estado',
                code: 'STATUS_QUERY_ERROR',
                channelId: data.channelId
            });
        }
    }

    /**
     * Maneja unión a canal
    */
    private async handleJoinChannel(
        socket: AuthenticatedSocket,
        data: ChannelJoinRequest,
        namespace: Namespace
    ): Promise<void> {
        try {
            const { channelId } = data;

            if (!channelId || typeof channelId !== 'string') {
                socket.emit('channel_error', {
                    message: 'channelId requerido y debe ser un string',
                    code: 'INVALID_CHANNEL_ID',
                    request: data
                });
                return;
            }

            // Verificar que el usuario tenga acceso al canal
            if (!await this.validateChannelAccess(socket, channelId)) {
                socket.emit('channel_error', {
                    message: 'Acceso denegado al canal',
                    code: 'CHANNEL_ACCESS_DENIED',
                    channelId
                });
                return;
            }

            // Registrar conexión por canal
            if (!this.connections.has(channelId)) {
                this.connections.set(channelId, new Set());
            }
            this.connections.get(channelId)!.add(socket);

            // Registrar canal para este socket
            const socketChannels = this.socketChannels.get(socket.id)!;
            socketChannels.add(channelId);

            // Unir socket a sala de canal
            socket.join(`channel_${channelId}`);

            const response: ChannelJoinResponse = {
                channelId,
                joined: true,
                timestamp: new Date()
            };

            socket.emit('channel.joined', response);

            console.log(`📱 Usuario ${socket.user?.email} se unió al canal ${channelId}`);

        } catch (error: any) {
            console.error('❌ Error uniendo a canal:', error);
            socket.emit('channel_error', {
                message: error.message || 'Error interno uniendo a canal',
                code: 'JOIN_CHANNEL_ERROR',
                channelId: data.channelId
            });
        }
    }

    /**
     * Maneja salida de canal
    */
    private handleLeaveChannel(
        socket: AuthenticatedSocket,
        data: ChannelLeaveRequest,
        namespace: Namespace
    ): void {
        try {
            const { channelId } = data;

            if (!channelId || typeof channelId !== 'string') {
                socket.emit('channel_error', {
                    message: 'channelId requerido y debe ser un string',
                    code: 'INVALID_CHANNEL_ID',
                    request: data
                });
                return;
            }

            this.removeSocketFromChannel(socket, channelId);

            socket.emit('channel.left', {
                channelId,
                left: true,
                timestamp: new Date()
            });

            console.log(`📤 Usuario ${socket.user?.email} salió del canal ${channelId}`);

        } catch (error: any) {
            console.error('❌ Error saliendo de canal:', error);
            socket.emit('channel_error', {
                message: error.message || 'Error interno saliendo de canal',
                code: 'LEAVE_CHANNEL_ERROR',
                channelId: data.channelId
            });
        }
    }

    /**
     * Maneja desconexión de socket
    */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`🔌 Usuario ${socket.user?.email} desconectado de canales`);

        // Remover socket de todos los canales
        const socketChannels = this.socketChannels.get(socket.id);
        if (socketChannels) {
            for (const channelId of socketChannels) {
                this.removeSocketFromChannel(socket, channelId);
            }
            this.socketChannels.delete(socket.id);
        }
    }

    /**
     * Valida que un usuario autenticado tenga acceso a un canal
    */
    private async validateChannelAccess(socket: AuthenticatedSocket, channelId: string): Promise<boolean> {
        if (!socket.user) return false;

        try {
            // TODO: Implementar validación completa de permisos desde base de datos
            // Por ahora verificamos que el canal pertenezca a la misma compañía del usuario

            // Aquí iría la lógica para consultar si el canal pertenece a la compañía del usuario
            // y si el usuario tiene permisos para acceder a él

            // Para este ejemplo, permitimos acceso si el usuario está autenticado
            // En producción, esto debería validar contra la base de datos
            return true;

        } catch (error) {
            console.error('Error validando acceso al canal:', error);
            return false;
        }
    }

    /**
     * Remueve un socket de un canal específico
    */
    private removeSocketFromChannel(socket: AuthenticatedSocket, channelId: string): void {
        // Remover de conexiones por canal
        const channelConnections = this.connections.get(channelId);
        if (channelConnections) {
            channelConnections.delete(socket);
            if (channelConnections.size === 0) {
                this.connections.delete(channelId);
            }
        }

        // Remover canal de la lista del socket
        const socketChannels = this.socketChannels.get(socket.id);
        if (socketChannels) socketChannels.delete(channelId);

        // Salir de sala de canal
        socket.leave(`channel_${channelId}`);
    }

    /**
     * Emite evento a un canal específico
    */
    emitToChannel(channelId: string, event: string, data: any): void {
        // Esto se haría desde el namespace padre usando namespace.to()
    }

    /**
     * Obtiene estadísticas de conexiones de canales
    */
    getStats(): { totalChannels: number; totalConnections: number } {
        let totalConnections = 0;
        for (const sockets of Array.from(this.connections.values())) {
            totalConnections += sockets.size;
        }

        return {
            totalChannels: this.connections.size,
            totalConnections
        };
    }

    /**
     * Verifica si un canal tiene conexiones activas
    */
    hasActiveConnections(channelId: string): boolean {
        const connections = this.connections.get(channelId);
        return connections ? connections.size > 0 : false;
    }
}

/**
 * Factory function para crear y configurar el handler de canales
*/
export function createChannelHandler(runtimeService: ChannelRuntimeService): ChannelHandler {
  return new ChannelHandler(runtimeService);
}
