import { Router } from 'express';
import { RedisClient } from '@/database/redis.js';
import { Server as SocketIOServer } from 'socket.io';
import { ChannelContainer, initializeContainer } from './channels.container.js';
import { ChannelRuntimeService } from '../application/services/channel-runtime.service.js';
import { type ChannelWebSocketGateway } from '../application/services/channel-websocket.gateway.js';

/**
 * Inicializa el Channel Runtime Layer
 * Configura todos los servicios necesarios para mensajería bidireccional
*/
export async function initializeChannelRuntime(io: SocketIOServer): Promise<{
  channelsRouter: Router;
  container: ChannelContainer;
  webSocketGateway: ChannelWebSocketGateway;
}> {
  console.log('🔧 Inicializando Channel Runtime Layer...');

  // Crear contenedor de dependencias centralizado
  const container: ChannelContainer = initializeContainer(io);
  const webSocketGateway = container.resolve<ChannelWebSocketGateway>('webSocketGateway');

  // Inicializar canales activos automáticamente
  try {
    const channelRuntimeService = container.resolve<ChannelRuntimeService>('channelRuntimeService');
    await channelRuntimeService.initializeActiveChannels();
    console.log('✅ Canales activos inicializados');
  } catch (error) {
    console.error('⚠️ Error inicializando canales activos, continuando...', error);
  }

  // Configurar limpieza al cerrar aplicación
  const cleanup = async () => {
    console.log('🧹 Limpiando recursos del Channel Runtime...');
    try {
      await container.resolve<ChannelRuntimeService>('channelRuntimeService').shutdown();
      console.log('✅ Recursos limpiados correctamente');
    } catch (error) {
      console.error('❌ Error limpiando recursos:', error);
    }
  };

  // Registrar manejadores de señales para limpieza
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Inicializar y devolver el router de channels ya configurado
  const { initializeChannelsRouter } = await import('./routes/main.routes.js');
  const channelsRouter = initializeChannelsRouter();

  console.log('✅ Channel Runtime Layer inicializado exitosamente');
  console.log(`📊 Estadísticas iniciales:`, webSocketGateway.getStats());

  return {
    container,
    channelsRouter,
    webSocketGateway
  };
}
