import { getRedisClient } from '@/database/redis.js';
import { RateLimitRule } from '../../domain/interfaces/firewall.interface.js';

/**
 * Servicio de Rate Limiting con Sliding Window Algorithm
 *
 * Implementa rate limiting preciso usando sliding windows móviles
 * con Redis para persistencia y escalabilidad.
*/
export class SlidingWindowRateLimiter {
    private readonly redis = getRedisClient();

    constructor(private rules: RateLimitRule[]) {}

    /**
     * Verifica si una solicitud excede los límites de rate limiting
    */
    async checkLimit(contactId: string): Promise<{
        allowed: boolean;
        remainingRequests: number;
        resetTimeSeconds: number;
        violatedRule?: RateLimitRule;
    }> {
        let mostRestrictiveRule: RateLimitRule | undefined;
        let minRemainingRequests = Infinity;
        let earliestResetTime = 0;

        // Verificar todas las reglas
        for (const rule of this.rules) {
            const result = await this.checkRule(contactId, rule);

            if (!result.allowed) {
                // Si viola alguna regla, bloquear inmediatamente
                return {
                    allowed: false,
                    remainingRequests: result.remainingRequests,
                    resetTimeSeconds: result.resetTimeSeconds,
                    violatedRule: rule
                };
            }

            // Mantener el más restrictivo
            if (result.remainingRequests < minRemainingRequests) {
                minRemainingRequests = result.remainingRequests;
                earliestResetTime = result.resetTimeSeconds;
                mostRestrictiveRule = rule;
            }
        }

        return {
            allowed: true,
            remainingRequests: minRemainingRequests,
            resetTimeSeconds: earliestResetTime,
            violatedRule: mostRestrictiveRule
        };
    }

    /**
     * Registra una solicitud exitosa
     */
    async recordRequest(contactId: string): Promise<void> {
        const now = Date.now();
        const nowStr = now.toString();

        // Registrar en todas las ventanas
        const recordPromises = this.rules.map(async (rule) => {
            const windowKey = this.getWindowKey(contactId, rule.windowSeconds);
            await this.redis.zadd(windowKey, now, nowStr);

            // Limpiar elementos antiguos (fuera de la ventana)
            const cutoffTime = now - (rule.windowSeconds * 1000);
            await this.redis.zremrangebyscore(windowKey, '-inf', cutoffTime);

            // Establecer TTL para limpieza automática
            await this.redis.expire(windowKey, rule.windowSeconds * 2);
        });

        await Promise.all(recordPromises);
    }

    /**
     * Verifica una regla específica
     */
    private async checkRule(contactId: string, rule: RateLimitRule): Promise<{
        allowed: boolean;
        remainingRequests: number;
        resetTimeSeconds: number;
    }> {
        const windowKey = this.getWindowKey(contactId, rule.windowSeconds);
        const now = Date.now();

        // Obtener mensajes en la ventana actual
        const cutoffTime = now - (rule.windowSeconds * 1000);
        const messages = await this.redis.zrangebyscore(windowKey, cutoffTime, now);

        const requestCount = messages.length;
        const allowed = requestCount < rule.maxRequests;

        // Calcular tiempo hasta reset (cuando expire el elemento más antiguo)
        let resetTimeSeconds = rule.windowSeconds;
        if (messages.length > 0) {
            const oldestMessage = parseInt(messages[0]);
            const timeUntilExpiry = Math.max(0, (oldestMessage + (rule.windowSeconds * 1000) - now));
            resetTimeSeconds = Math.ceil(timeUntilExpiry / 1000);
        }

        return {
            allowed,
            remainingRequests: Math.max(0, rule.maxRequests - requestCount),
            resetTimeSeconds
        };
    }

    /**
     * Obtiene la clave de Redis para una ventana específica
    */
    private getWindowKey(contactId: string, windowSeconds: number): string {
        return `ratelimit:user:${contactId}:window:${windowSeconds}s`;
    }

    /**
     * Limpia todos los datos de rate limiting para un usuario
    */
    async clearUserData(contactId: string): Promise<void> {
        const keys = this.rules.map(rule => this.getWindowKey(contactId, rule.windowSeconds));
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    /**
     * Obtiene estadísticas de uso para un usuario
    */
    async getUserStats(contactId: string): Promise<Record<number, { requests: number; remaining: number; resetIn: number }>> {
        const stats: Record<number, { requests: number; remaining: number; resetIn: number }> = {};

        for (const rule of this.rules) {
            const result = await this.checkRule(contactId, rule);
            stats[rule.windowSeconds] = {
                requests: rule.maxRequests - result.remainingRequests,
                remaining: result.remainingRequests,
                resetIn: result.resetTimeSeconds
            };
        }

        return stats;
    }

    /**
     * Obtiene estadísticas globales del rate limiter
    */
    async getGlobalStats(): Promise<{
        totalKeys: number;
        totalRequests: number;
        activeUsers: number;
    }> {
        // Esto es una implementación básica - en producción podrías usar Redis SCAN
        // o mantener contadores separados
        return {
            totalKeys: 0, // Implementar si es necesario
            totalRequests: 0, // Implementar si es necesario
            activeUsers: 0 // Implementar si es necesario
        };
    }

    /**
     * Configuración por defecto de rate limiting para sistemas conversacionales
    */
    static getDefaultRules(): RateLimitRule[] {
        return [
            {
                windowSeconds: 10,      // 10 segundos
                maxRequests: 3,         // máximo 3 mensajes
                blockDurationSeconds: 30, // bloqueo de 30 segundos
                severity: 'MEDIUM'
            },
            {
                windowSeconds: 60,      // 1 minuto
                maxRequests: 8,         // máximo 8 mensajes
                blockDurationSeconds: 120, // bloqueo de 2 minutos
                severity: 'HIGH'
            },
            {
                windowSeconds: 3600,    // 1 hora
                maxRequests: 30,        // máximo 30 mensajes
                blockDurationSeconds: 300, // bloqueo de 5 minutos
                severity: 'HIGH'
            },
            {
                windowSeconds: 86400,   // 24 horas
                maxRequests: 100,       // máximo 100 mensajes
                blockDurationSeconds: 900, // bloqueo de 15 minutos
                severity: 'CRITICAL'
            }
        ];
    }
}