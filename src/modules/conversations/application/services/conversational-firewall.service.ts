import { getRedisClient } from '@/database/redis.js';
import { SlidingWindowRateLimiter } from './sliding-window-rate-limiter.service.js';
import { PenaltySystem } from './penalty-system.service.js';
import {
    FirewallAction,
    FirewallResult,
    FirewallConfig,
    FirewallStats,
    ViolationInfo,
    ViolationType,
    ViolationSeverity,
    RateLimitRule,
    BlockStatus
} from '../../domain/interfaces/firewall.interface.js';

/**
 * Firewall Conversacional - Middleware inteligente de protección anti-spam
 *
 * Protege el sistema de:
 * - Ataques de flooding/rate limiting
 * - Spam automatizado
 * - Contenido malicioso
 * - Comportamiento sospechoso
*/
export class ConversationalFirewallService {
    private readonly redis = getRedisClient();
    private readonly rateLimiter: SlidingWindowRateLimiter;
    private readonly penaltySystem: PenaltySystem;
    private stats: FirewallStats;
    private startTime: Date;

    constructor(private config: FirewallConfig) {
        this.startTime = new Date();
        this.stats = this.initializeStats();
        this.rateLimiter = new SlidingWindowRateLimiter(config.rateLimitRules);
        this.penaltySystem = new PenaltySystem();
    }

    /**
     * Evalúa un mensaje entrante contra todas las reglas del firewall
    */
    async checkMessage(contactId: string, message: string): Promise<FirewallResult> {
        const startTime = Date.now();
        const violations: ViolationInfo[] = [];
        let riskScore = 0;

        try {
            // 1. Verificar si el usuario está bloqueado
            const blockStatus = await this.getBlockStatus(contactId);
            if (blockStatus.isBlocked) {
                return this.createBlockedResult(
                    contactId,
                    message,
                    `Usuario temporalmente bloqueado. Tiempo restante: ${blockStatus.remainingSeconds}s`,
                    startTime
                );
            }

            // 2. Rate limiting check
            const rateLimitResult = await this.checkRateLimits(contactId);
            if (rateLimitResult.violations.length > 0) {
                violations.push(...rateLimitResult.violations);
                riskScore += rateLimitResult.riskScore;
            }

            // 3. Análisis de contenido
            const contentResult = await this.analyzeContent(contactId, message);
            if (contentResult.violations.length > 0) {
                violations.push(...contentResult.violations);
                riskScore += contentResult.riskScore;
            }

            // 4. Análisis comportamental
            const behavioralResult = await this.analyzeBehavior(contactId, message);
            if (behavioralResult.violations.length > 0) {
                violations.push(...behavioralResult.violations);
                riskScore += behavioralResult.riskScore;
            }

            // 5. Evaluar acción final
            const action = this.determineAction(violations, riskScore);

            // 6. Aplicar penalizaciones si es necesario
            let cooldownSeconds: number | undefined;
            if (action === 'BLOCK') {
                cooldownSeconds = await this.applyPenalties(contactId, violations);
            }

            // 7. Registrar mensaje si está permitido
            if (action === 'ALLOW') {
                await this.recordMessage(contactId);
            }

            // 8. Actualizar estadísticas
            this.updateStats(action, violations);

            return {
                action,
                allowed: action === 'ALLOW',
                blockedReason: action === 'BLOCK' ? violations[0]?.description : undefined,
                warningMessage: action === 'WARN' ? 'Mensaje procesado con precaución' : undefined,
                violations,
                riskScore,
                cooldownSeconds,
                metadata: {
                    contactId,
                    messageLength: message.length,
                    processingTimeMs: Date.now() - startTime,
                    rulesChecked: 4 // rate limit, content, behavior, penalties
                }
            };

        } catch (error) {
            console.error('Error en evaluación del firewall:', error);
            // En caso de error, permitir el mensaje pero registrar
            return this.createAllowResult(contactId, message, startTime);
        }
    }

    /**
     * Verifica si un usuario está bloqueado
    */
    private async getBlockStatus(contactId: string): Promise<BlockStatus> {
        return this.penaltySystem.getBlockStatus(contactId);
    }

    /**
     * Verifica límites de rate limiting usando sliding windows
    */
    private async checkRateLimits(contactId: string): Promise<{ violations: ViolationInfo[], riskScore: number }> {
        const violations: ViolationInfo[] = [];
        let riskScore = 0;

        // Usar el servicio dedicado de rate limiting
        const rateLimitCheck = await this.rateLimiter.checkLimit(contactId);

        if (!rateLimitCheck.allowed && rateLimitCheck.violatedRule) {
            const rule = rateLimitCheck.violatedRule;
            violations.push({
                type: 'RATE_LIMIT_EXCEEDED',
                severity: rule.severity,
                description: `Límite excedido: ${rule.maxRequests - rateLimitCheck.remainingRequests}/${rule.maxRequests} mensajes en ${rule.windowSeconds}s`,
                evidence: {
                    windowSeconds: rule.windowSeconds,
                    messageCount: rule.maxRequests - rateLimitCheck.remainingRequests,
                    limit: rule.maxRequests,
                    resetInSeconds: rateLimitCheck.resetTimeSeconds
                },
                timestamp: new Date()
            });

            riskScore += this.getSeverityScore(rule.severity);
        }

        return { violations, riskScore };
    }

    /**
     * Analiza el contenido del mensaje
    */
    private async analyzeContent(contactId: string, message: string): Promise<{ violations: ViolationInfo[], riskScore: number }> {
        const violations: ViolationInfo[] = [];
        let riskScore = 0;

        // 1. Verificar longitud anormal
        if (message.length < this.config.minMessageLength || message.length > this.config.maxMessageLength) {
            violations.push({
                type: 'ABNORMAL_LENGTH',
                severity: 'MEDIUM',
                description: `Longitud anormal: ${message.length} caracteres`,
                evidence: { length: message.length, min: this.config.minMessageLength, max: this.config.maxMessageLength },
                timestamp: new Date()
            });
            riskScore += 20;
        }

        // 2. Verificar mensajes repetidos
        const repeatedCount = await this.checkRepeatedMessages(contactId, message);
        if (repeatedCount >= this.config.maxRepeatedMessages) {
            violations.push({
                type: 'REPEATED_MESSAGES',
                severity: 'HIGH',
                description: `Mensaje repetido ${repeatedCount} veces consecutivas`,
                evidence: { repeatedCount, maxAllowed: this.config.maxRepeatedMessages },
                timestamp: new Date()
            });
            riskScore += 50;
        }

        // 3. Verificar URLs sospechosas
        const suspiciousUrls = this.detectSuspiciousUrls(message);
        if (suspiciousUrls.length > 0) {
            violations.push({
                type: 'SUSPICIOUS_URL',
                severity: 'CRITICAL',
                description: `URLs sospechosas detectadas: ${suspiciousUrls.join(', ')}`,
                evidence: { suspiciousUrls },
                timestamp: new Date()
            });
            riskScore += 100;
        }

        // 4. Verificar contenido ofensivo
        const offensiveWords = this.detectOffensiveContent(message);
        if (offensiveWords.length > 0) {
            violations.push({
                type: 'OFFENSIVE_CONTENT',
                severity: 'HIGH',
                description: `Contenido ofensivo detectado`,
                evidence: { offensiveWords },
                timestamp: new Date()
            });
            riskScore += 75;
        }

        return { violations, riskScore };
    }

    /**
     * Analiza el comportamiento del usuario
    */
    private async analyzeBehavior(contactId: string, message: string): Promise<{ violations: ViolationInfo[], riskScore: number }> {
        const violations: ViolationInfo[] = [];
        let riskScore = 0;

        if (this.config.burstThreshold > 0) {
            // Implementar detección de bursts en el futuro
            // Por ahora, retornamos vacío
        }

        return { violations, riskScore };
    }

    /**
     * Registra un mensaje permitido
    */
    private async recordMessage(contactId: string): Promise<void> {
        // Usar el servicio dedicado de rate limiting
        await this.rateLimiter.recordRequest(contactId);
    }

    /**
     * Verifica mensajes repetidos
    */
    private async checkRepeatedMessages(contactId: string, message: string): Promise<number> {
        const key = `firewall:user:${contactId}:recent_messages`;
        const normalizedMessage = message.trim().toLowerCase();

        // Obtener mensajes recientes
        const recentMessages = await this.redis.lrange(key, 0, this.config.maxRepeatedMessages - 1);
        const repeatedCount = recentMessages.filter(msg => msg === normalizedMessage).length + 1;

        // Agregar mensaje actual
        await this.redis.lpush(key, normalizedMessage);
        await this.redis.ltrim(key, 0, this.config.maxRepeatedMessages - 1);
        await this.redis.expire(key, 300); // 5 minutos

        return repeatedCount;
    }

    /**
     * Detecta URLs sospechosas
    */
    private detectSuspiciousUrls(message: string): string[] {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = message.match(urlRegex) || [];

        return urls.filter(url => {
            return this.config.suspiciousUrlPatterns.some(pattern => pattern.test(url));
        });
    }

    /**
     * Detecta contenido ofensivo
    */
    private detectOffensiveContent(message: string): string[] {
        const normalizedMessage = message.toLowerCase();
        return this.config.offensiveWords.filter(word =>
            normalizedMessage.includes(word.toLowerCase())
        );
    }

    /**
     * Aplica penalizaciones por violaciones
    */
    private async applyPenalties(contactId: string, violations: ViolationInfo[]): Promise<number> {
        const worstViolation = violations.reduce((worst, current) =>
            this.getSeverityScore(current.severity) > this.getSeverityScore(worst.severity) ? current : worst
        );

        // Obtener estado actual de bloqueo para contar violaciones
        const blockStatus = await this.getBlockStatus(contactId);

        // Aplicar penalización usando el sistema dedicado
        const penaltyResult = await this.penaltySystem.applyPenalty(
            contactId,
            worstViolation.severity,
            blockStatus.violationCount + 1 // +1 porque aún no se ha contado esta violación
        );

        return penaltyResult.blockDurationSeconds;
    }

    /**
     * Determina la acción final basada en violaciones y riesgo
    */
    private determineAction(violations: ViolationInfo[], riskScore: number): FirewallAction {
        if (!this.config.enabled) return 'ALLOW';

        // Si hay violaciones críticas, bloquear
        if (violations.some(v => v.severity === 'CRITICAL')) return 'BLOCK';

        // Si el riesgo es muy alto, bloquear
        if (riskScore >= this.config.maxRiskScore) return 'BLOCK';

        // Si hay violaciones altas, bloquear
        if (violations.some(v => v.severity === 'HIGH')) return 'BLOCK';

        // Si hay violaciones medias, advertir
        if (violations.some(v => v.severity === 'MEDIUM')) return 'WARN';

        // Si hay violaciones bajas o ninguna, permitir
        return 'ALLOW';
    }

    /**
     * Obtiene el puntaje de severidad
    */
    private getSeverityScore(severity: ViolationSeverity): number {
        const scores = { 'LOW': 10, 'MEDIUM': 25, 'HIGH': 50, 'CRITICAL': 100 };
        return scores[severity];
    }

    /**
     * Crea resultado de bloqueo
    */
    private createBlockedResult(
        contactId: string,
        message: string,
        reason: string,
        startTime: number
    ): FirewallResult {
        return {
            action: 'BLOCK',
            allowed: false,
            blockedReason: reason,
            violations: [],
            riskScore: 100,
            metadata: {
                contactId,
                messageLength: message.length,
                processingTimeMs: Date.now() - startTime,
                rulesChecked: 1
            }
        };
    }

    /**
     * Crea resultado de permiso
    */
    private createAllowResult(
        contactId: string,
        message: string,
        startTime: number
    ): FirewallResult {
        return {
            action: 'ALLOW',
            allowed: true,
            violations: [],
            riskScore: 0,
            metadata: {
                contactId,
                messageLength: message.length,
                processingTimeMs: Date.now() - startTime,
                rulesChecked: 4
            }
        };
    }

    /**
     * Inicializa estadísticas
    */
    private initializeStats(): FirewallStats {
        return {
            totalMessagesProcessed: 0,
            messagesAllowed: 0,
            messagesBlocked: 0,
            messagesWarned: 0,
            violationsByType: {} as Record<ViolationType, number>,
            topViolators: [],
            averageProcessingTime: 0,
            uptimeSeconds: 0
        };
    }

    /**
     * Actualiza estadísticas
    */
    private updateStats(action: FirewallAction, violations: ViolationInfo[]): void {
        this.stats.totalMessagesProcessed++;

        switch (action) {
            case 'ALLOW':
                this.stats.messagesAllowed++;
                break;
            case 'BLOCK':
                this.stats.messagesBlocked++;
                break;
            case 'WARN':
                this.stats.messagesWarned++;
                break;
        }

        // Contar violaciones por tipo
        violations.forEach(violation => {
            this.stats.violationsByType[violation.type] =
                (this.stats.violationsByType[violation.type] || 0) + 1;
        });
    }

    /**
     * Obtiene estadísticas del firewall
    */
    getStats(): FirewallStats {
        this.stats.uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
        return { ...this.stats };
    }

    /**
     * Configuración por defecto del firewall
    */
    static getDefaultConfig(): FirewallConfig {
        return {
            enabled: true,
            rateLimitRules: [
                { windowSeconds: 10, maxRequests: 3, blockDurationSeconds: 30, severity: 'MEDIUM' },
                { windowSeconds: 60, maxRequests: 8, blockDurationSeconds: 120, severity: 'HIGH' },
                { windowSeconds: 3600, maxRequests: 30, blockDurationSeconds: 300, severity: 'HIGH' },
                { windowSeconds: 86400, maxRequests: 100, blockDurationSeconds: 900, severity: 'CRITICAL' }
            ],
            maxRepeatedMessages: 3,
            suspiciousUrlPatterns: [
                /bit\.ly/i,
                /tinyurl\.com/i,
                /short\.ly/i,
                /t\.co/i,
                /\.ru\//i,
                /\.cn\//i
            ],
            offensiveWords: [
                'spam', 'scam', 'hack', 'exploit', 'malware', 'virus',
                'porn', 'sex', 'nude', 'nsfw'
            ],
            minMessageLength: 1,
            maxMessageLength: 2000,
            burstThreshold: 5,
            botDetectionEnabled: false,
            autoBlockEnabled: true,
            maxRiskScore: 100
        };
    }
}
