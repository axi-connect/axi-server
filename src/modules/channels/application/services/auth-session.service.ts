import path from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { ChannelProvider } from '@prisma/client';
import { getRedisClient, RedisClient } from '@/database/redis.js';


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
  private redisClient: RedisClient = getRedisClient();
  private expireSessionTTL: number = 15 * 60 * 1000; // 15 minutes

  constructor() {}

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
   * Completa una sesión de autenticación con limpieza automática de QR
   * @param sessionId - ID de la sesión
   * @param metadata - Metadata adicional
   * @returns Sesión completada o null si no existe
  */
  async completeSession(channelId: string, metadata?: any): Promise<AuthSession | null> {
    const session = await this.getSessionByChannel(channelId);
    if (!session || session.status !== 'pending') return null;

    // Actualizar estado de la sesión
    session.status = 'completed';
    session.completedAt = new Date();
    session.metadata = { ...session.metadata, ...metadata };

    // Limpiar archivo QR automáticamente después de completar la sesión
    if (session.qrCodeUrl) {
      try {
        await this.cleanupQRFile(session.qrCodeUrl);
        console.log(`🧹 QR limpiado automáticamente para sesión completada: ${session.id}`);
      } catch (error) {
        console.warn(`⚠️ Error limpiando QR para sesión completada ${session.id}:`, error);
        // No fallar la sesión por error de limpieza
      }
    }

    // Guardar la sesión actualizada en Redis
    try {
      const key = `whatsapp:session:${session.id}`;
      await this.redisClient.setEx(key, this.expireSessionTTL, JSON.stringify(session));
      console.log(`💾 Sesión completada guardada: ${session.id}`);
    } catch (error) {
      console.error(`❌ Error guardando sesión completada ${session.id}:`, error);
      throw error;
    }

    return session;
  }

  /**
   * Limpia el archivo QR físico de una sesión
   * @param qrCodeUrl - URL del archivo QR a eliminar
   */
  private async cleanupQRFile(qrCodeUrl: string): Promise<void> {
    try {
      // Extraer el path relativo del archivo desde la URL
      // "/qr-images/qr-123456789.svg" → "qr-123456789.svg"
      const urlParts = qrCodeUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      if (!filename || !filename.startsWith('qr-') || !filename.endsWith('.svg')) {
        console.warn(`⚠️ Nombre de archivo QR inválido: ${filename}`);
        return;
      }

      // Construir path absoluto al archivo
      console.log('process.cwd():', process.cwd())
      const publicDir = path.resolve(process.cwd(), 'src', 'public', 'qr-images');
      const filePath = path.join(publicDir, filename);

      // Verificar que el archivo existe antes de intentar eliminarlo
      await fs.access(filePath);

      // Eliminar el archivo
      await fs.unlink(filePath);
      console.log(`🗑️ Archivo QR eliminado: ${filename}`);

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Archivo ya no existe, es normal
        console.log(`ℹ️ Archivo QR ya eliminado o no encontrado: ${qrCodeUrl}`);
      } else {
        // Error real al eliminar
        console.error(`❌ Error eliminando archivo QR ${qrCodeUrl}:`, error.message);
        throw error;
      }
    }
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
   * Obtiene estadísticas de sesiones y archivos QR
   */
  async getStats(): Promise<{
    sessions: {
      total: number;
      pending: number;
      completed: number;
      failed: number;
      expired: number;
    };
    qrFiles: {
      estimatedCount: number;
      cleanupRecommended: boolean;
    };
  }> {
    let pending = 0;
    let completed = 0;
    let failed = 0;
    let expired = 0;
    let sessionsWithQR = 0;

    const sessions = await this.redisClient.keys('whatsapp:session:*');
    for (const sessionId of sessions) {
      const session = await this.getSession(sessionId);
      if (!session) continue;

      if (session.qrCodeUrl) sessionsWithQR++;

      switch (session.status) {
        case 'pending': pending++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'expired': expired++; break;
      }
    }

    // Estimar archivos QR basados en sesiones activas con QR
    const estimatedQRFiles = sessionsWithQR;
    const cleanupRecommended = estimatedQRFiles > 50; // Recomendar limpieza si hay más de 50 QRs

    return {
      sessions: {
        total: sessions.length,
        pending,
        completed,
        failed,
        expired,
      },
      qrFiles: {
        estimatedCount: estimatedQRFiles,
        cleanupRecommended,
      }
    };
  }

  /**
   * Elimina la sesión serializada almacenada
  */
  async deleteSession(channelId: string): Promise<void> {
    const session = await this.getSessionByChannel(channelId);
    if (!session) return;

    try {
      await this.redisClient.del(`whatsapp:session:${session.id}`);
      console.log(`🗑️ Sesión serializada eliminada: ${session.id}`);
    } catch (error) {
      console.error(`Error eliminando sesión serializada: ${session.id}:`, error);
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
