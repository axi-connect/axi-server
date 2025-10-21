import { randomUUID } from 'crypto';
import { ChannelProvider } from '@prisma/client';
import { RedisClient } from '@/database/redis.js';
import { CredentialRepositoryInterface } from '@/modules/channels/domain/repositories/credential-repository.interface.js';

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
  private sessions = new Map<string, AuthSession>();
  private credentialRepository: CredentialRepositoryInterface | null = null;

  constructor(redisClient?: RedisClient, credentialRepository?: CredentialRepositoryInterface) {
    this.redisClient = redisClient || new RedisClient();
    this.credentialRepository = credentialRepository || null;
  }

  /**
   * Crea una nueva sesión de autenticación temporal
   * @param channelId - ID del canal
   * @param provider - Proveedor del canal
   * @param qrCode - Código QR opcional
   * @param qrCodeUrl - URL del código QR opcional
   * @param ttlMinutes - Tiempo de vida en minutos (default: 15)
   * @returns Sesión de autenticación creada
  */
  createSession(
    channelId: string,
    provider: ChannelProvider,
    qrCode?: string,
    qrCodeUrl?: string,
    ttlMinutes: number = 15
  ): AuthSession {
    const session: AuthSession = {
      id: randomUUID(),
      channelId,
      provider,
      status: 'pending',
      qrCode,
      qrCodeUrl,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      createdAt: new Date(),
      metadata: {}
    };

    this.sessions.set(session.id, session);

    // Limpiar sesión expirada automáticamente
    setTimeout(() => {
      this.expireSession(session.id);
    }, ttlMinutes * 60 * 1000);

    return session;
  }

  /**
   * Obtiene una sesión por su ID
   * @param sessionId - ID de la sesión
   * @returns Sesión o null si no existe o expiró
  */
  getSession(sessionId: string): AuthSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    // Verificar si expiró
    if (session.expiresAt < new Date()) {
      this.expireSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Obtiene la sesión activa de un canal
   * @param channelId - ID del canal
   * @returns Sesión activa o null
  */
  getActiveSessionByChannel(channelId: string): AuthSession | null {
    // Limpiar sesiones expiradas primero
    this.cleanupExpiredSessions();

    for (const session of this.sessions.values()) {
      if (session.channelId === channelId &&
          session.status === 'pending' &&
          session.expiresAt > new Date()) {
        return session;
      }
    }
    return null;
  }

  /**
   * Limpia las sesiones expiradas
  */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now && session.status === 'pending') {
        this.expireSession(sessionId);
      }
    }
  }

  /**
   * Completa una sesión de autenticación
   * @param sessionId - ID de la sesión
   * @param metadata - Metadata adicional
   * @returns Sesión completada o null si no existe
  */
  completeSession(sessionId: string, metadata?: any): AuthSession | null {
    const session = this.sessions.get(sessionId);

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
  failSession(sessionId: string, error: string): AuthSession | null {
    const session = this.sessions.get(sessionId);

    if (!session || session.status !== 'pending') return null;

    session.status = 'failed';
    session.metadata = { ...session.metadata, error };

    return session;
  }

  /**
   * Expira una sesión
   * @param sessionId - ID de la sesión
  */
  private expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'expired';
      // Mantener en memoria por un tiempo más para posibles consultas
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 5 * 60 * 1000); // Limpiar después de 5 minutos
    }
  }

  /**
   * Obtiene estadísticas de sesiones
  */
  getStats(): {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    expired: number;
  } {
    let pending = 0;
    let completed = 0;
    let failed = 0;
    let expired = 0;

    for (const session of this.sessions.values()) {
      switch (session.status) {
        case 'pending': pending++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'expired': expired++; break;
      }
    }

    return {
      total: this.sessions.size,
      pending,
      completed,
      failed,
      expired
    };
  }

  /**
   * Guarda una sesión serializada de WhatsApp para persistencia
  */
  async saveSerializedSession(channelId: string, sessionData: any): Promise<void> {
    if (!this.credentialRepository) {
      console.warn('CredentialRepository no disponible para guardar sesión');
      return;
    }

    try {
      const key = `whatsapp:session:${channelId}`;
      const serialized = JSON.stringify(sessionData);

      // Guardar en Redis con expiración de 30 días
      await this.redisClient.setEx(key, 30 * 24 * 60 * 60, serialized);

      console.log(`💾 Sesión serializada guardada para canal ${channelId}`);
    } catch (error) {
      console.error(`Error guardando sesión serializada para canal ${channelId}:`, error);
    }
  }

  /**
   * Restaura una sesión serializada de WhatsApp
  */
  async restoreSession(channelId: string): Promise<boolean> {
    try {
      const key = `whatsapp:session:${channelId}`;
      const serialized = await this.redisClient.get(key);

      if (!serialized) {
        console.log(`📭 No hay sesión serializada para canal ${channelId}`);
        return false;
      }

      const sessionData = JSON.parse(serialized);

      // Validar que la sesión no esté corrupta
      if (!sessionData || typeof sessionData !== 'object') {
        console.warn(`Sesión corrupta para canal ${channelId}, eliminando...`);
        await this.redisClient.del(key);
        return false;
      }

      console.log(`🔄 Sesión restaurada para canal ${channelId}`);
      return true; // Indica que hay sesión disponible para restaurar

    } catch (error) {
      console.error(`Error restaurando sesión para canal ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Obtiene la sesión serializada almacenada
  */
  async getSerializedSession(channelId: string): Promise<any> {
    try {
      const key = `whatsapp:session:${channelId}`;
      const serialized = await this.redisClient.get(key);

      if (!serialized) {
        return null;
      }

      return JSON.parse(serialized);
    } catch (error) {
      console.error(`Error obteniendo sesión serializada para canal ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Elimina la sesión serializada almacenada
  */
  async deleteSerializedSession(channelId: string): Promise<void> {
    try {
      const key = `whatsapp:session:${channelId}`;
      await this.redisClient.del(key);
      console.log(`🗑️ Sesión serializada eliminada para canal ${channelId}`);
    } catch (error) {
      console.error(`Error eliminando sesión serializada para canal ${channelId}:`, error);
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
