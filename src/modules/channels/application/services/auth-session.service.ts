import { randomUUID } from 'crypto';
import { ChannelProvider } from '@prisma/client';
import { RedisClient } from '@/database/redis.js';

export interface AuthSession {
  id: string;
  metadata?: any;
  qrCode?: string;
  expiresAt: Date;
  createdAt: Date;
  channelId: string;
  qrCodeUrl?: string;
  completedAt?: Date;
  provider: ChannelProvider;
  status: 'pending' | 'completed' | 'failed' | 'expired';
}

export class AuthSessionService {
  private redisClient: RedisClient;
  private expireSessionTTL: number = 15 * 60 * 1000; // 15 minutes

  constructor(redisClient?: RedisClient) {
    this.redisClient = redisClient || new RedisClient();
  }

  /**
   * Crea una nueva sesión de autenticación serializada en Redis
   * @param channelId - ID del canal
   * @param provider - Proveedor del canal
   * @param qrCode - Código QR opcional
   * @param qrCodeUrl - URL del código QR opcional
   * @param ttlMinutes - Tiempo de vida en minutos (default: 15)
   * @returns Sesión de autenticación creada
  */
  async createSession(
    channelId: string,
    provider: ChannelProvider,
    qrCode?: string,
    qrCodeUrl?: string,
  ): Promise<AuthSession> {
    const session: AuthSession = {
      id: randomUUID(),
      channelId,
      provider,
      status: 'pending',
      qrCode,
      qrCodeUrl,
      expiresAt: new Date(Date.now() + this.expireSessionTTL),
      createdAt: new Date(),
      metadata: {}
    };

    const key = `whatsapp:session:${session.id}`;
    await this.redisClient.setEx(key, this.expireSessionTTL, JSON.stringify(session));
    console.log(`💾 Nueva sesión serializada creada: ${session.id}`);

    return session;
  }

  /**
   * Actualiza la sesión serializada almacenada
  */
  async updateSession(sessionId: string, session: AuthSession): Promise<AuthSession> {
    try {
      const sessionSerialized = this.getSession(sessionId);
      if (!sessionSerialized) throw new Error(`Sesión serializada no encontrada: ${sessionId}`);
      const dataToUpdate: AuthSession = {...sessionSerialized, ...session};

      await this.redisClient.setEx(`whatsapp:session:${sessionId}`, this.expireSessionTTL, JSON.stringify(dataToUpdate));
      console.log(`💾 Sesión serializada actualizada: ${sessionId}`);
      return dataToUpdate;
    } catch (error) {
      console.error(`Error actualizando sesión serializada: ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una sesión por su ID
   * @param sessionId - ID de la sesión
   * @returns Sesión o null si no existe o expiró
  */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const serializedSession = await this.redisClient.get(`whatsapp:session:${sessionId}`);
    if (!serializedSession) return null;

    return JSON.parse(serializedSession) as AuthSession;
  }

  /**
   * Obtiene la sesión activa de un canal
   * @param channelId - ID del canal
   * @returns Sesión activa o null
  */
  async getSessionByChannel(channelId: string): Promise<AuthSession | null> {
    const sessions = await this.redisClient.keys('whatsapp:session:*');
    for (const sessionId of sessions) {
      const session = await this.getSession(sessionId.split(':').pop() || '');
      if (!session || session.channelId !== channelId) continue;
      return session;
    }
    return null;
  }

  /**
   * Completa una sesión de autenticación
   * @param sessionId - ID de la sesión
   * @param metadata - Metadata adicional
   * @returns Sesión completada o null si no existe
  */
  async completeSession(sessionId: string, metadata?: any): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session || session.status !== 'pending') return null;

    session.status = 'completed';
    session.completedAt = new Date();
    session.metadata = { ...session.metadata, ...metadata };

    return session;
  }

  /**
   * Marca una sesión como fallida
   * @param sessionId - ID de la sesión
   * @param error - Error que causó el fallo
   * @returns Sesión fallida o null si no existe
  */
  async failSession(sessionId: string, error: string): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session || session.status !== 'pending') return null;

    session.status = 'failed';
    session.metadata = { ...session.metadata, error };

    return session;
  }

  /**
   * Obtiene estadísticas de sesiones
  */
  async getStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    expired: number;
  }> {
    let pending = 0;
    let completed = 0;
    let failed = 0;
    let expired = 0;

    const sessions = await this.redisClient.keys('whatsapp:session:*');
    for (const sessionId of sessions) {
      const session = await this.getSession(sessionId);
      if (!session) continue;

      switch (session.status) {
        case 'pending': pending++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'expired': expired++; break;
      }
    }

    return {
      failed,
      pending,
      expired,
      completed,
      total: sessions.length,
    };
  }

  /**
   * Elimina la sesión serializada almacenada
  */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.redisClient.del(`whatsapp:session:${sessionId}`);
      console.log(`🗑️ Sesión serializada eliminada: ${sessionId}`);
    } catch (error) {
      console.error(`Error eliminando sesión serializada: ${sessionId}:`, error);
    }
  }

  /**
   * Cierra la conexión con Redis
  */
  async shutdown(): Promise<void> {
    try {
      await this.redisClient.disconnect();
      console.log('🔌 Conexión Redis cerrada desde AuthSessionService');
    } catch (error) {
      console.error('Error cerrando conexión Redis desde AuthSessionService:', error);
    }
  }
}
