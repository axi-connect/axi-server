import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from '@/modules/channels/infrastructure/handlers/auth.middleware.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';

/**
 * Interfaces para el handler de mensajes
*/
export interface SendMessageRequest {
  channelId: string;
  message: string;
  recipient?: string;
  metadata?: any;
}

export interface MessageSentResponse {
  id: string;
  channelId: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: Date;
}

export interface IncomingMessageData {
  channelId: string;
  messageId: string;
  content: string;
  sender: string;
  recipient?: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Handler para operaciones de mensajes WebSocket
 * Namespace: /message
 * Gestiona envío y recepción de mensajes en tiempo real
*/
export class MessageHandler {
  constructor(private channelRuntimeService: ChannelRuntimeService) {}

    /**
     * Configura el namespace de mensajes
    */
    setup(namespace: Namespace): void {
        // El middleware de autenticación se configura automáticamente
        // en el gateway principal

        namespace.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`💬 Nueva conexión autenticada de mensajes: ${socket.id} (Usuario: ${socket.user?.email})`);

            // Handler para mensajes entrantes (desde providers)
            socket.on('message_received', (data: IncomingMessageData) => {
                this.handleIncomingMessage(socket, data);
            });

            // Handler de desconexión
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    /**
     * Maneja mensajes entrantes desde providers (este método es más para recepción)
     */
    private handleIncomingMessage(socket: AuthenticatedSocket, data: IncomingMessageData): void {
        try {
            const { channelId, messageId, content, sender, recipient, timestamp, metadata } = data;

            // Validar datos del mensaje entrante
            if (!channelId || !messageId || !content) {
                console.warn('Mensaje entrante inválido:', data);
                return;
            }

            // Verificar que el socket esté unido al canal
            if (!socket.rooms.has(`channel_${channelId}`)) {
                console.warn(`Socket ${socket.id} recibió mensaje para canal no unido: ${channelId}`);
                return;
            }

            // Emitir mensaje al canal correspondiente
            socket.to(`channel_${channelId}`).emit('message_received', {
                channelId,
                messageId,
                content,
                sender,
                recipient,
                timestamp: timestamp || new Date(),
                metadata
            });

            console.log(`📨 Mensaje ${messageId} recibido en canal ${channelId}`);

        } catch (error: any) {
            console.error('❌ Error procesando mensaje entrante:', error);
        }
    }

    /**
     * Maneja desconexión de socket
    */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`🔌 Usuario ${socket.user?.email} desconectado de mensajes`);
        // Aquí se pueden limpiar recursos específicos de mensajes si es necesario
        // Por ahora solo logging
    }

    /**
     * Obtiene estadísticas de mensajes
    */
    getStats(): { status: 'operational' } {
        // Estadísticas básicas del handler
        return { status: 'operational' };
    }
}

/**
 * Factory function para crear y configurar el handler de mensajes
*/
export function createMessageHandler(channelRuntimeService: ChannelRuntimeService): MessageHandler {
  return new MessageHandler(channelRuntimeService);
}