import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from './auth.middleware.js';

/**
 * Interfaces para el handler del sistema
*/
export interface PingData {
  timestamp: number;
}

export interface PongData {
  timestamp: number;
  serverTime: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  connections: number;
}

/**
 * Handler para operaciones del sistema WebSocket
 * Namespace: /system
 * Gestiona ping/pong, health checks y operaciones del sistema
*/
export class SystemHandler {
    private startTime: number = Date.now();
    private connectionsCount: number = 0;

    constructor() {}

    /**
     * Configura el namespace del sistema
    */
    setup(namespace: Namespace): void {
        namespace.on('connection', (socket: AuthenticatedSocket) => {
            this.connectionsCount++;
            console.log(`🔧 Nueva conexión autenticada del sistema: ${socket.id} (Usuario: ${socket.user?.email}, Total: ${this.connectionsCount})`);

            // Handler para ping/pong
            socket.on('ping', (data: PingData) => {
                this.handlePing(socket, data);
            });

            // Handler para health check
            socket.on('health_check', () => {
                this.handleHealthCheck(socket);
            });

            // Handler de desconexión
            socket.on('disconnect', () => {
                this.connectionsCount--;
                this.handleDisconnect(socket);
            });
        });
    }

    /**
     * Maneja ping del cliente
    */
    private handlePing(socket: AuthenticatedSocket, data: PingData): void {
        try {
            const clientTimestamp = data.timestamp || Date.now();
            const serverTimestamp = Date.now();

            const pongData: PongData = {
                timestamp: clientTimestamp,
                serverTime: serverTimestamp
            };

            socket.emit('pong', pongData);
        } catch (error: any) {
            console.error('❌ Error en ping/pong:', error);
            socket.emit('system_error', {
                message: 'Error procesando ping',
                code: 'PING_ERROR'
            });
        }
    }

    /**
     * Maneja solicitud de health check
     */
    private handleHealthCheck(socket: AuthenticatedSocket): void {
        try {
            const uptime = Date.now() - this.startTime;

            const healthData: HealthCheckResponse = {
                status: 'healthy', // TODO: Implementar lógica real de health check
                timestamp: Date.now(),
                uptime,
                connections: this.connectionsCount
            };

            socket.emit('health_response', healthData);

        } catch (error: any) {
            console.error('❌ Error en health check:', error);

            const errorHealthData: HealthCheckResponse = {
                status: 'unhealthy',
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime,
                connections: this.connectionsCount
            };

            socket.emit('health_response', errorHealthData);
        }
    }

    /**
     * Maneja desconexión de socket
     */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`🔌 Usuario ${socket.user?.email} desconectado del sistema (Restantes: ${this.connectionsCount})`);
    }

    /**
     * Obtiene estadísticas del sistema
    */
    getStats(): {
        uptime: number;
        connections: number;
        status: string;
    } {
        return {
            uptime: Date.now() - this.startTime,
            connections: this.connectionsCount,
            status: 'operational'
        };
    }

    /**
     * Broadcast a todos los clientes conectados
    */
    broadcast(namespace: Namespace, event: string, data: any): void {
        namespace.emit(event, data);
    }
}

/**
 * Factory function para crear y configurar el handler del sistema
*/
export function createSystemHandler(): SystemHandler {
  return new SystemHandler();
}
