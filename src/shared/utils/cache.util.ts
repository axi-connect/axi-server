import { redisDB } from '../../database/redis.js';

/**
 * Obtiene un valor del caché Redis y lo deserializa desde JSON.
 * - Retorna null si la clave no existe o si hay un error de Redis/parseo.
*/
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await (redisDB as any)?.get?.(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (parseErr) {
      console.warn(`Falló el parseo del caché para clave ${key}:`, parseErr);
      return null;
    }
  } catch (err) {
    console.warn('Redis GET falló (continuando sin caché):', err);
    return null;
  }
}

/**
 * Guarda un valor serializado como JSON en Redis con expiración en segundos.
 * - No lanza si Redis falla; registra warning y continúa.
*/
export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const payload = JSON.stringify(value);
    await (redisDB as any)?.set?.(key, payload, { EX: ttlSeconds });
  } catch (err) {
    console.warn('Redis SET falló (continuando):', err);
  }
}