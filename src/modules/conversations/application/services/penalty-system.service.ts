import { getRedisClient } from '@/database/redis.js';
import { ViolationSeverity, BlockStatus } from '../../domain/interfaces/firewall.interface.js';

/**
 * Sistema de Penalización para el Firewall Conversacional
 *
 * Maneja bloqueos temporales, cooldowns progresivos y
 * seguimiento de comportamiento de usuarios.
*/
export class PenaltySystem {
    private readonly redis = getRedisClient();

    /**
     * Aplica una penalización por violación
    */
    async applyPenalty(
        contactId: string,
        severity: ViolationSeverity,
        violationCount: number = 1
    ): Promise<{
        blocked: boolean;
        blockDurationSeconds: number;
        nextBlockDurationSeconds: number;
    }> {
        // Calcular duración del bloqueo
        const blockDuration = this.calculateBlockDuration(severity, violationCount);

        // Verificar si debe bloquearse automáticamente
        const shouldBlock = this.shouldAutoBlock(severity, violationCount);

        if (shouldBlock) {
            await this.blockUser(contactId, blockDuration);

            // Incrementar contador de violaciones
            await this.incrementViolationCount(contactId);

            // Calcular próxima duración para información
            const nextViolationCount = violationCount + 1;
            const nextBlockDuration = this.calculateBlockDuration(severity, nextViolationCount);

            return {
                blocked: true,
                blockDurationSeconds: blockDuration,
                nextBlockDurationSeconds: nextBlockDuration
            };
        }

        // Solo incrementar contador sin bloquear
        await this.incrementViolationCount(contactId);

        return {
            blocked: false,
            blockDurationSeconds: 0,
            nextBlockDurationSeconds: this.calculateBlockDuration(severity, violationCount + 1)
        };
    }

    /**
     * Bloquea a un usuario por un tiempo determinado
    */
    async blockUser(contactId: string, durationSeconds: number): Promise<void> {
        const blockKey = `firewall:user:${contactId}:blocked_until`;
        const blockUntil = Date.now() + (durationSeconds * 1000);

        await this.redis.setEx(blockKey, durationSeconds, blockUntil.toString());

        console.log(`🚫 Usuario ${contactId} bloqueado por ${durationSeconds}s`);
    }

    /**
     * Desbloquea a un usuario manualmente
    */
    async unblockUser(contactId: string): Promise<void> {
        const blockKey = `firewall:user:${contactId}:blocked_until`;
        await this.redis.del(blockKey);

        console.log(`✅ Usuario ${contactId} desbloqueado manualmente`);
    }

    /**
     * Verifica si un usuario está bloqueado
    */
    async getBlockStatus(contactId: string): Promise<BlockStatus> {
        const blockKey = `firewall:user:${contactId}:blocked_until`;
        const countKey = `firewall:user:${contactId}:violation_count`;

        const [blockedUntil, violationCount] = await Promise.all([
            this.redis.get(blockKey),
            this.redis.get(countKey)
        ]);

        const now = Date.now();
        const isBlocked = blockedUntil ? parseInt(blockedUntil) > now : false;
        const remainingSeconds = isBlocked ? Math.ceil((parseInt(blockedUntil!) - now) / 1000) : undefined;

        return {
            isBlocked,
            blockedUntil: isBlocked ? new Date(parseInt(blockedUntil!)) : undefined,
            remainingSeconds,
            violationCount: parseInt(violationCount || '0'),
            riskLevel: this.calculateRiskLevel(parseInt(violationCount || '0'))
        };
    }

    /**
     * Incrementa el contador de violaciones de un usuario
    */
    private async incrementViolationCount(contactId: string): Promise<number> {
        const countKey = `firewall:user:${contactId}:violation_count`;
        const newCount = await this.redis.incr(countKey);

        // Establecer expiración para limpieza automática (30 días)
        await this.redis.expire(countKey, 30 * 24 * 60 * 60);

        return newCount;
    }

    /**
     * Calcula la duración del bloqueo basada en severidad y reincidencia
    */
    private calculateBlockDuration(severity: ViolationSeverity, violationCount: number): number {
        // Duraciones base por severidad (en segundos)
        const baseDurations = {
            'LOW': 30,        // 30 segundos
            'MEDIUM': 120,    // 2 minutos
            'HIGH': 600,      // 10 minutos
            'CRITICAL': 1800  // 30 minutos
        };

        const baseDuration = baseDurations[severity];

        // Multiplicador por reincidencia (máximo x5)
        const recidivismMultiplier = Math.min(violationCount, 5);

        // Aplicar multiplicador exponencial para casos graves
        if (severity === 'CRITICAL' && violationCount > 2) {
            return baseDuration * recidivismMultiplier * 2; // Doble penalización para críticos
        }

        return baseDuration * recidivismMultiplier;
    }

    /**
     * Determina si debe bloquearse automáticamente
    */
    private shouldAutoBlock(severity: ViolationSeverity, violationCount: number): boolean {
        // Siempre bloquear violaciones críticas
        if (severity === 'CRITICAL') return true;

        // Bloquear violaciones altas en la primera ocurrencia
        if (severity === 'HIGH') return true;

        // Bloquear violaciones medias después de 2 ocurrencias
        if (severity === 'MEDIUM' && violationCount >= 2) return true;

        // Bloquear violaciones bajas después de 5 ocurrencias
        if (severity === 'LOW' && violationCount >= 5) return true;

        return false;
    }

    /**
     * Calcula el nivel de riesgo basado en el contador de violaciones
    */
    private calculateRiskLevel(violationCount: number): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (violationCount >= 10) return 'HIGH';
        if (violationCount >= 5) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Limpia todos los datos de penalización de un usuario
    */
    async clearUserData(contactId: string): Promise<void> {
        const keys = [
            `firewall:user:${contactId}:blocked_until`,
            `firewall:user:${contactId}:violation_count`
        ];

        await this.redis.del(...keys);
        console.log(`🧹 Datos de penalización limpiados para usuario ${contactId}`);
    }

    /**
     * Obtiene estadísticas de penalización
    */
    async getPenaltyStats(): Promise<{
        totalBlockedUsers: number;
        totalViolations: number;
        recentBlocks: Array<{
            contactId: string;
            blockedUntil: Date;
            violationCount: number;
        }>;
    }> {
        // Nota: En una implementación real, esto requeriría
        // escanear todas las claves, lo cual puede ser costoso.
        // Para producción, considera mantener contadores separados.

        return {
            totalBlockedUsers: 0, // Implementar con SCAN si es necesario
            totalViolations: 0,   // Implementar con contadores separados
            recentBlocks: []      // Implementar con lista ordenada
        };
    }

    /**
     * Resetea violaciones de bajo riesgo (para usuarios que mejoran su comportamiento)
    */
    async resetLowRiskViolations(contactId: string): Promise<void> {
        const blockStatus = await this.getBlockStatus(contactId);

        // Solo resetear si no está bloqueado actualmente y es bajo riesgo
        if (!blockStatus.isBlocked && blockStatus.riskLevel === 'LOW' && blockStatus.violationCount > 0) {
            const countKey = `firewall:user:${contactId}:violation_count`;
            await this.redis.set(countKey, '0');
            console.log(`🔄 Violaciones de bajo riesgo reseteadas para usuario ${contactId}`);
        }
    }
}
