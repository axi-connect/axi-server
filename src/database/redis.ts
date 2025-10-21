import { createClient, RedisClientType } from 'redis';

/**
 * Cliente Redis
 * Maneja conexiones, reconexiones y errores
*/
export class RedisClient {
  private isConnecting = false;
  private client: RedisClientType | null = null;
  private connectionPromise: Promise<RedisClientType> | null = null;

  constructor(
    private options: { connectTimeout?: number } = {}
  ) {
    this.options = { connectTimeout: 10000, ...options };
  }

  /**
   * Obtiene o crea la instancia del cliente Redis
   */
  async getClient(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) return this.client;

    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * Conecta al servidor Redis con manejo de errores robusto
   */
  private async connect(): Promise<RedisClientType> {
    if (this.isConnecting) throw new Error('Conexión Redis ya en progreso');

    this.isConnecting = true;

    try {
      // Crear cliente con configuración robusta
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: { connectTimeout: this.options.connectTimeout },
      });

      // Configurar event listeners
      this.setupEventListeners();

      // Intentar conectar
      await this.client.connect();

      this.isConnecting = false;
      this.connectionPromise = null;

      console.log('✅ Redis conectado exitosamente');
      return this.client;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;

      console.error('❌ Error conectando a Redis:', error);
      throw new Error(`Fallo al conectar con Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Configura los listeners de eventos para monitoreo
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('error', (err) => {
      console.error('🔴 Error en cliente Redis:', err.message);
    });

    this.client.on('connect', () => {
      console.log('🔗 Conectando a Redis...');
    });

    this.client.on('ready', () => {
      console.log('✅ Cliente Redis listo');
    });

    this.client.on('end', () => {
      console.log('🔌 Conexión Redis cerrada');
    });

    this.client.on('reconnecting', () => {
      console.log(`🔄 Reconectando a Redis`);
    });
  }

  /**
   * Ejecuta un comando Redis de forma segura
   */
  async executeCommand<T>(command: string, ...args: any[]): Promise<T> {
    const client = await this.getClient();

    try {
      const result = await (client as any)[command](...args);
      return result;
    } catch (error) {
      console.error(`Error ejecutando comando Redis '${command}':`, error);
      throw error;
    }
  }

  /**
   * Establece una clave con expiración
   */
  async setEx(key: string, ttlSeconds: number, value: string): Promise<string | null> {
    return this.executeCommand('setEx', key, ttlSeconds, value);
  }

  /**
   * Obtiene el valor de una clave
   */
  async get(key: string): Promise<string | null> {
    return this.executeCommand('get', key);
  }

  /**
   * Elimina una o más claves
   */
  async del(...keys: string[]): Promise<number> {
    return this.executeCommand('del', ...keys);
  }

  /**
   * Verifica si una clave existe
   */
  async exists(key: string): Promise<number> {
    return this.executeCommand('exists', key);
  }

  /**
   * Establece el tiempo de expiración de una clave
   */
  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.executeCommand('expire', key, ttlSeconds);
  }

  /**
   * Obtiene todas las claves que coinciden con un patrón
   */
  async keys(pattern: string): Promise<string[]> {
    return this.executeCommand('keys', pattern);
  }

  /**
   * Incrementa el valor de una clave numérica
   */
  async incr(key: string): Promise<number> {
    return this.executeCommand('incr', key);
  }

  /**
   * Decrementa el valor de una clave numérica
   */
  async decr(key: string): Promise<number> {
    return this.executeCommand('decr', key);
  }

  /**
   * Ejecuta múltiples comandos en una transacción
   */
  async multi(commands: Array<{ command: string; args: any[] }>): Promise<any[]> {
    const client = await this.getClient();
    const multi = client.multi();

    for (const { command, args } of commands) {
      (multi as any)[command](...args);
    }

    const results = await multi.exec();
    return results;
  }

  /**
   * Publica un mensaje en un canal pub/sub
  */
  async publish(channel: string, message: string): Promise<number> {
    return this.executeCommand('publish', channel, message);
  }

  /**
   * Suscribe a un canal pub/sub
   */
  async subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<() => Promise<void>> {
    const client = await this.getClient();
    const subscriber = client.duplicate();

    await subscriber.connect();
    await subscriber.subscribe(channel, callback);

    // Retornar función para cancelar suscripción
    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.disconnect();
    };
  }

  /**
   * Verifica si el cliente está conectado
  */
  isConnected(): boolean {
    return this.client?.isOpen ?? false;
  }

  /**
   * Obtiene estadísticas de conexión
  */
  getStats(): {
    connected: boolean;
    isConnecting: boolean;
  } {
    return {
      connected: this.isConnected(),
      isConnecting: this.isConnecting
    };
  }

  /**
   * Fuerza la reconexión
  */
  async reconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.warn('Error desconectando Redis:', error);
      }
    }

    this.client = null;
    this.connectionPromise = null;

    await this.connect();
  }

  /**
   * Cierra la conexión de forma segura
  */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('🔌 Conexión Redis cerrada correctamente');
      } catch (error) {
        console.error('Error cerrando conexión Redis:', error);
      }
    }

    this.client = null;
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  /**
   * Método de limpieza para cerrar la aplicación
  */
  async close(): Promise<void> {
    await this.disconnect();
  }
}

// Instancia global singleton del cliente Redis
let redisInstance: RedisClient | null = null;

/**
 * Obtiene la instancia global del cliente Redis
*/
export function getRedisClient(): RedisClient {
  if (!redisInstance) redisInstance = new RedisClient();
  return redisInstance;
}

/**
 * Inicializa el cliente Redis global
*/
export async function initializeRedis(): Promise<RedisClient> {
  const client = getRedisClient();

  try {
    await client.getClient();
    console.log('🚀 Cliente Redis inicializado globalmente');
    return client;
  } catch (error) {
    console.error('❌ Error inicializando cliente Redis:', error);
    throw error;
  }
}

// Exportar instancia por defecto para compatibilidad
export const redisDB = getRedisClient();