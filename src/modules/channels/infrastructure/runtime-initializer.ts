import { Server as SocketIOServer } from 'socket.io';
import { createChannelsContainer } from './channels.container.js';

/**
 * Inicializa el Channel Runtime Layer
 * Configura todos los servicios necesarios para mensajería bidireccional
*/
export async function initializeChannelRuntime(io: SocketIOServer): Promise<{
  container: any;
  channelsRouter: any;
  webSocketGateway: any;
}> {
  console.log('🔧 Inicializando Channel Runtime Layer...');

  // Crear contenedor de dependencias centralizado
  const container = createChannelsContainer(io);
  const webSocketGateway = container.getWebSocketGateway();

  // Inicializar canales activos automáticamente
  try {
    await container.initializeActiveChannels();
    console.log('✅ Canales activos inicializados');
  } catch (error) {
    console.error('⚠️ Error inicializando canales activos, continuando...', error);
  }

  // Configurar limpieza al cerrar aplicación
  const cleanup = async () => {
    console.log('🧹 Limpiando recursos del Channel Runtime...');
    try {
      await container.shutdown();
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
