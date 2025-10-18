import { randomUUID } from 'crypto';
import { ChannelProvider } from '@prisma/client';

export interface AuthSession {
  id: string;
  channelId: string;
  provider: ChannelProvider;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  qrCode?: string;
  qrCodeUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
  metadata?: any;
}

export class AuthSessionService {
  private sessions = new Map<string, AuthSession>();

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
   * Limpia sesiones expiradas
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now && session.status === 'pending') {
        this.expireSession(sessionId);
      }
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
}
