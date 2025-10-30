/**
 * Handlers de WebSocket para el módulo Channels
 * Arquitectura basada en Namespaces de Socket.IO
*/

// Exports de middleware de autenticación
export { isAuthenticated, getAuthenticatedUser } from './auth.middleware.js';
export type { AuthenticatedUser, AuthenticatedSocket } from './auth.middleware.js';
export { SocketAuthMiddleware, createSocketAuthMiddleware } from './auth.middleware.js';

// Exports de handlers
export { AuthHandler, createAuthHandler } from './auth.handler.js';
export type { SessionInfo, PermissionCheck } from './auth.handler.js';
// Handlers de canales
export { ChannelHandler, createChannelHandler } from './channel.handler.js';
export type {
  ChannelStatusRequest,
  ChannelJoinRequest,
  ChannelLeaveRequest,
  ChannelStatusResponse,
  ChannelJoinResponse
} from './channel.handler.js';
// Handlers de mensajes
export { MessageHandler, createMessageHandler } from '@/modules/conversations/infrastructure/handlers/message.handler.js';
export type {
  SendMessageRequest,
  MessageSentResponse,
  IncomingMessageData
} from '@/modules/conversations/infrastructure/handlers/message.handler.js';
// Handlers del sistema
export { SystemHandler, createSystemHandler } from './system.handler.js';
export type {
  PingData,
  PongData,
  HealthCheckResponse
} from './system.handler.js';

/**
 * Configuración centralizada de namespaces
*/
export const NAMESPACES = {
  AUTH: '/auth',
  CHANNEL: '/channel',
  MESSAGE: '/message',
  SYSTEM: '/system'
} as const;

/**
 * Tipos de namespaces disponibles
*/
export type NamespaceType = typeof NAMESPACES[keyof typeof NAMESPACES];