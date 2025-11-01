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
  constructor(private runtimeService: ChannelRuntimeService) {}

    /**
     * Configura el namespace de mensajes
    */
    setup(namespace: Namespace): void {
        // El middleware de autenticación se configura automáticamente
        // en el gateway principal

        namespace.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`💬 Nueva conexión autenticada de mensajes: ${socket.id} (Usuario: ${socket.user?.email})`);

            // Handler para envío de mensajes
            socket.on('send_message', (data: SendMessageRequest) => {
                this.handleSendMessage(socket, data, namespace);
            });

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
     * Maneja envío de mensajes desde el cliente
    */
    private async handleSendMessage(
        socket: AuthenticatedSocket,
        data: SendMessageRequest,
        namespace: Namespace
    ): Promise<void> {
        try {
            const { channelId, message, recipient, metadata } = data;

            // Validaciones de entrada
            if (!channelId || typeof channelId !== 'string') {
                socket.emit('message_error', {
                    message: 'channelId requerido y debe ser un string',
                    code: 'INVALID_CHANNEL_ID',
                    request: data
                });
                return;
            }

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                socket.emit('message_error', {
                    message: 'message requerido y debe ser un string no vacío',
                    code: 'INVALID_MESSAGE',
                    request: data
                });
                return;
            }

            // Verificar que el canal esté activo
            if (!this.runtimeService.isChannelActive(channelId)) {
                socket.emit('message_error', {
                    message: 'Canal no activo o no encontrado',
                    code: 'CHANNEL_NOT_ACTIVE',
                    channelId
                });
                return;
            }

            // Verificar que el socket esté unido al canal
            if (!socket.rooms.has(`channel_${channelId}`)) {
                socket.emit('message_error', {
                    message: 'No estás unido a este canal',
                    code: 'NOT_JOINED_TO_CHANNEL',
                    channelId
                });
                return;
            }

            // Generar ID único para el mensaje
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Preparar payload del mensaje
            const messagePayload = {
                id: messageId,
                content: message.trim(),
                recipient,
                metadata,
                timestamp: new Date(),
                fromUser: socket.user?.email,
                channelId
            };

            // Enviar mensaje a través del runtime service
            await this.runtimeService.emitMessage(channelId, messagePayload);

            // Confirmar envío al cliente
            const response: MessageSentResponse = {
                id: messageId,
                channelId,
                status: 'sent',
                timestamp: new Date()
            };

            socket.emit('message_sent', response);

            console.log(`📤 Mensaje enviado desde usuario ${socket.user?.email} al canal ${channelId}`);
        } catch (error: any) {
            console.error('❌ Error enviando mensaje:', error);

            socket.emit('message_error', {
                message: error.message || 'Error interno enviando mensaje',
                code: 'SEND_MESSAGE_ERROR',
                channelId: data.channelId
            });
        }
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
     * Emite mensaje recibido a un canal específico
    */
    emitMessageToChannel(channelId: string, messageData: IncomingMessageData): void {
        // Esto se haría desde el namespace padre usando namespace.to()
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
export function createMessageHandler(runtimeService: ChannelRuntimeService): MessageHandler {
  return new MessageHandler(runtimeService);
}