import { Server, Namespace } from 'socket.io';
import { ChannelRuntimeService } from './channel-runtime.service.js';
import { WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';

// Importar handlers y middleware
import {
  NAMESPACES,
  createAuthHandler,
  createSystemHandler,
  createChannelHandler,
  createMessageHandler,
  createSocketAuthMiddleware,
  type AuthHandler,
  type SystemHandler,
  type ChannelHandler,
  type MessageHandler,
  type SocketAuthMiddleware,
} from '../../infrastructure/handlers/index.js';

/**
 * Gateway WebSocket para mensajería bidireccional en tiempo real
 * Gestiona conexiones de clientes y sincroniza eventos de canales
 * Arquitectura basada en Namespaces de Socket.IO
*/
export class ChannelWebSocketGateway {
  // Middleware de autenticación compartido
  private socketAuthMiddleware: SocketAuthMiddleware;

  // Handlers especializados por namespace
  private authHandler: AuthHandler;
  private systemHandler: SystemHandler;
  private channelHandler: ChannelHandler;
  private messageHandler: MessageHandler;

  // Namespaces
  private authNamespace: Namespace;
  private systemNamespace: Namespace;
  private channelNamespace: Namespace;
  private messageNamespace: Namespace;

  constructor(private io: Server, private runtimeService: ChannelRuntimeService) {
    // Crear middleware de autenticación
    this.socketAuthMiddleware = createSocketAuthMiddleware();

    // Crear handlers especializados
    this.authHandler = createAuthHandler();
    this.systemHandler = createSystemHandler();
    this.channelHandler = createChannelHandler(runtimeService);
    this.messageHandler = createMessageHandler(runtimeService);

    // Crear namespaces
    this.authNamespace = this.io.of(NAMESPACES.AUTH);
    this.channelNamespace = this.io.of(NAMESPACES.CHANNEL);
    this.messageNamespace = this.io.of(NAMESPACES.MESSAGE);
    this.systemNamespace = this.io.of(NAMESPACES.SYSTEM);

    // Configurar handlers
    this.setupNamespaceHandlers();
  }

  /**
   * Configura los handlers para cada namespace con autenticación
  */
  private setupNamespaceHandlers(): void {
    console.log('🚀 Configurando handlers de namespaces WebSocket con autenticación...');

    // Configurar handler de autenticación (sin middleware adicional)
    this.authHandler.setup(this.authNamespace);
    console.log(`✅ Namespace ${NAMESPACES.AUTH} configurado`);

    // Aplicar middleware de autenticación a namespaces protegidos
    this.authNamespace.use(this.socketAuthMiddleware.authMiddleware);
    this.systemNamespace.use(this.socketAuthMiddleware.authMiddleware);
    this.channelNamespace.use(this.socketAuthMiddleware.authMiddleware);
    this.messageNamespace.use(this.socketAuthMiddleware.authMiddleware);

    // Configurar handlers para namespaces protegidos
    this.channelHandler.setup(this.channelNamespace);
    console.log(`✅ Namespace ${NAMESPACES.CHANNEL} configurado con autenticación`);

    this.messageHandler.setup(this.messageNamespace);
    console.log(`✅ Namespace ${NAMESPACES.MESSAGE} configurado con autenticación`);

    this.systemHandler.setup(this.systemNamespace);
    console.log(`✅ Namespace ${NAMESPACES.SYSTEM} configurado con autenticación`);

    console.log('🎯 Todos los namespaces WebSocket configurados exitosamente con autenticación JWT');
  }

  // Los métodos de manejo individuales han migrados a sus respectivos handlers especializados

  /**
   * Emite evento a un canal específico usando el namespace de canales
  */
  emitToChannel(channelId: string, event: string, data: any): void {
    this.channelNamespace.to(`channel_${channelId}`).emit(event, {
      channelId,
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento a una compañía específica usando el namespace de auth
  */
  emitToCompany(companyId: number, event: string, data: any): void {
    this.authNamespace.to(`company_${companyId}`).emit(event, {
      companyId,
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento a todos los clientes conectados usando el namespace de sistema
  */
  emitToAll(event: string, data: any): void {
    this.systemNamespace.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Procesa evento WebSocket del runtime service
  */
  handleWebSocketEvent(event: WebSocketEvent): void {
    const { event: eventName, channelId, companyId, data, timestamp } = event;
    console.log('handleWebSocketEvent', event);
    // Emitir a canal específico
    if (channelId) this.emitToChannel(channelId, eventName, { data, timestamp });

    // Emitir a compañía específica
    if (companyId) this.emitToCompany(companyId, eventName, { data, timestamp });
  }

  /**
   * Obtiene estadísticas de conexiones desde todos los handlers
  */
  getStats(): {
    auth: ReturnType<AuthHandler['getStats']>;
    channels: ReturnType<ChannelHandler['getStats']>;
    messages: ReturnType<MessageHandler['getStats']>;
    system: ReturnType<SystemHandler['getStats']>;
    totalConnections: number;
  } {
    const authStats = this.authHandler.getStats();
    const channelStats = this.channelHandler.getStats();
    const messageStats = this.messageHandler.getStats();
    const systemStats = this.systemHandler.getStats();

    return {
      auth: authStats,
      channels: channelStats,
      messages: messageStats,
      system: systemStats,
      totalConnections: authStats.totalConnections + channelStats.totalConnections
    };
  }

  /**
   * Cierra el gateway y todas las conexiones de todos los namespaces
  */
  async shutdown(): Promise<void> {
    console.log('🛑 Cerrando ChannelWebSocketGateway...');

    try {
      // Cerrar namespace de autenticación
      const authSockets = await this.authNamespace.fetchSockets();
      for (const socket of authSockets) {
        socket.disconnect(true);
      }

      // Cerrar namespace de canales
      const channelSockets = await this.channelNamespace.fetchSockets();
      for (const socket of channelSockets) {
        socket.disconnect(true);
      }

      // Cerrar namespace de mensajes
      const messageSockets = await this.messageNamespace.fetchSockets();
      for (const socket of messageSockets) {
        socket.disconnect(true);
      }

      // Cerrar namespace del sistema
      const systemSockets = await this.systemNamespace.fetchSockets();
      for (const socket of systemSockets) {
        socket.disconnect(true);
      }

      console.log('✅ Todos los namespaces WebSocket cerrados');

    } catch (error) {
      console.error('❌ Error cerrando namespaces:', error);
      // Fallback: cerrar servidor principal
      const allSockets = await this.io.fetchSockets();
      for (const socket of allSockets) {
        socket.disconnect(true);
      }
    }

    console.log('✅ ChannelWebSocketGateway cerrado completamente');
  }
}