import { Server, Socket } from 'socket.io';
import { ChannelRuntimeService } from './channel-runtime.service.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';

/**
 * Gateway WebSocket para mensajería bidireccional en tiempo real
 * Gestiona conexiones de clientes y sincroniza eventos de canales
*/
export class ChannelWebSocketGateway {
  private io: Server;
  private runtimeService: ChannelRuntimeService;
  private connections = new Map<string, Set<Socket>>();
  private companyConnections = new Map<number, Set<Socket>>();

  constructor(io: Server, runtimeService: ChannelRuntimeService) {
    this.io = io;
    this.runtimeService = runtimeService;
    this.setupSocketHandlers();
  }

  /**
   * Configura los manejadores de eventos de Socket.IO
  */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Nueva conexión WebSocket: ${socket.id}`);

      // Autenticación de conexión
      socket.on('authenticate', (data: { companyId: number; token?: string }) => {
        this.handleAuthentication(socket, data);
      });

      // Solicitar estado de canal
      socket.on('channel.status', (data: { channelId: string }) => {
        this.handleChannelStatusRequest(socket, data);
      });

      // Enviar mensaje
      socket.on('send_message', (data: any) => {
        this.handleSendMessage(socket, data);
      });

      // Unirse a sala de canal
      socket.on('join_channel', (data: { channelId: string }) => {
        this.handleJoinChannel(socket, data);
      });

      // Salir de sala de canal
      socket.on('leave_channel', (data: { channelId: string }) => {
        this.handleLeaveChannel(socket, data);
      });

      // Ping/Pong para mantener conexión viva
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Desconexión
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Maneja la autenticación de conexiones WebSocket
  */
  private handleAuthentication(socket: Socket, data: { companyId: number; token?: string }): void {
    try {
      const { companyId, token } = data;

      if (!companyId) {
        socket.emit('error', { message: 'companyId requerido' });
        return;
      }

      // TODO: Validar token JWT si es necesario
      // Por ahora asumimos que la autenticación es válida

      // Registrar conexión por compañía
      if (!this.companyConnections.has(companyId)) {
        this.companyConnections.set(companyId, new Set());
      }
      this.companyConnections.get(companyId)!.add(socket);

      // Unir socket a sala de compañía
      socket.join(`company_${companyId}`);

      socket.emit('authenticated', { companyId });

      console.log(`✅ Socket ${socket.id} autenticado para compañía ${companyId}`);

    } catch (error) {
      console.error('Error en autenticación WebSocket:', error);
      socket.emit('error', { message: 'Error de autenticación' });
    }
  }

  /**
   * Maneja solicitud de estado de canal
  */
  private async handleChannelStatusRequest(socket: Socket, data: { channelId: string }): Promise<void> {
    try {
      const { channelId } = data;

      if (!channelId) {
        socket.emit('error', { message: 'El parámetro channelId es requerido' });
        return;
      }

      const status = await this.runtimeService.getChannelStatus(channelId);
      socket.emit('channel.status_response', { channelId, status });

    } catch (error: any) {
      console.error('Error obteniendo estado de canal:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Maneja envío de mensajes desde el cliente
  */
  private async handleSendMessage(socket: Socket, data: any): Promise<void> {
    try {
      const { channelId, message, recipient } = data;

      if (!channelId || !message) {
        socket.emit('error', { message: 'channelId y message requeridos' });
        return;
      }

      // Verificar que el canal esté activo
      if (!this.runtimeService.isChannelActive(channelId)) {
        socket.emit('error', { message: 'Canal no activo' });
        return;
      }

      // Preparar payload del mensaje
      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: message,
        recipient,
        timestamp: new Date(),
        fromSocket: socket.id
      };

      // Enviar mensaje a través del runtime service
      await this.runtimeService.emitMessage(channelId, messagePayload);

      // Confirmar envío al cliente
      socket.emit('message_sent', {
        id: messagePayload.id,
        channelId,
        status: 'sent'
      });

    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Maneja unión a sala de canal
  */
  private handleJoinChannel(socket: Socket, data: { channelId: string }): void {
    try {
      const { channelId } = data;

      if (!channelId) {
        socket.emit('error', { message: 'channelId requerido' });
        return;
      }

      // Registrar conexión por canal
      if (!this.connections.has(channelId)) this.connections.set(channelId, new Set());
      this.connections.get(channelId)!.add(socket);

      // Unir socket a sala de canal
      socket.join(`channel_${channelId}`);
      socket.emit('joined_channel', { channelId });

      console.log(`📱 Socket ${socket.id} se unió al canal ${channelId}`);
    } catch (error) {
      console.error('Error uniendo a canal:', error);
      socket.emit('error', { message: 'Error uniendo a canal' });
    }
  }

  /**
   * Maneja salida de sala de canal
  */
  private handleLeaveChannel(socket: Socket, data: { channelId: string }): void {
    try {
      const { channelId } = data;

      // Remover de conexiones por canal
      const channelConnections = this.connections.get(channelId);
      if (channelConnections) {
        channelConnections.delete(socket);
        if (channelConnections.size === 0) {
          this.connections.delete(channelId);
        }
      }

      // Salir de sala de canal
      socket.leave(`channel_${channelId}`);

      socket.emit('left_channel', { channelId });

      console.log(`📱 Socket ${socket.id} salió del canal ${channelId}`);

    } catch (error) {
      console.error('Error saliendo de canal:', error);
    }
  }

  /**
   * Maneja desconexión de socket
  */
  private handleDisconnect(socket: Socket): void {
    console.log(`🔌 Socket desconectado: ${socket.id}`);

    // Remover de todas las conexiones por canal
    for (const [channelId, sockets] of this.connections.entries()) {
      if (sockets.has(socket)) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          this.connections.delete(channelId);
        }
      }
    }

    // Remover de conexiones por compañía
    for (const [companyId, sockets] of this.companyConnections.entries()) {
      if (sockets.has(socket)) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          this.companyConnections.delete(companyId);
        }
      }
    }
  }

  /**
   * Emite evento a un canal específico
  */
  emitToChannel(channelId: string, event: string, data: any): void {
    this.io.to(`channel_${channelId}`).emit(event, { channelId, ...data });
  }

  /**
   * Emite evento a una compañía específica
  */
  emitToCompany(companyId: number, event: string, data: any): void {
    this.io.to(`company_${companyId}`).emit(event, { companyId, ...data });
  }

  /**
   * Emite evento a todos los clientes conectados
  */
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Procesa evento WebSocket del runtime service
  */
  handleWebSocketEvent(event: WebSocketEvent): void {
    const { event: eventName, channelId, companyId, data, timestamp } = event;
    console.log('handleWebSocketEvent', event);
    // Emitir a canal específico
    if (channelId) {
      this.emitToChannel(channelId, eventName, { data, timestamp });
    }

    // Emitir a compañía específica
    if (companyId) {
      this.emitToCompany(companyId, eventName, { data, timestamp });
    }
  }

  /**
   * Obtiene estadísticas de conexiones
  */
  getStats(): {
    totalChannels: number;
    totalCompanies: number;
    totalConnections: number;
  } {
    let totalConnections = 0;

    // Contar conexiones por canal
    for (const sockets of this.connections.values()) totalConnections += sockets.size;

    return {
      totalChannels: this.connections.size,
      totalCompanies: this.companyConnections.size,
      totalConnections
    };
  }

  /**
   * Cierra el gateway y todas las conexiones
  */
  async shutdown(): Promise<void> {
    console.log('🛑 Cerrando ChannelWebSocketGateway...');

    // Cerrar todas las conexiones
    const sockets = await this.io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }

    // Limpiar mapas
    this.connections.clear();
    this.companyConnections.clear();

    console.log('✅ ChannelWebSocketGateway cerrado');
  }
}
