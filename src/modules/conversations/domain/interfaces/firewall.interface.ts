/**
 * Interfaces para el sistema de Firewall Conversacional
 * Protege contra spam, flooding y ataques automatizados
*/

/**
 * Resultado de la evaluación del firewall
*/
export type FirewallAction = 'ALLOW' | 'BLOCK' | 'WARN';

/**
 * Severidad de la violación detectada
*/
export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Tipo de violación detectada
*/
export type ViolationType =
    | 'RATE_LIMIT_EXCEEDED'
    | 'REPEATED_MESSAGES'
    | 'SUSPICIOUS_URL'
    | 'OFFENSIVE_CONTENT'
    | 'ABNORMAL_LENGTH'
    | 'BURST_DETECTION'
    | 'BOT_LIKE_BEHAVIOR';

/**
 * Información detallada de una violación
*/
export interface ViolationInfo {
    timestamp: Date;
    type: ViolationType;
    description: string;
    severity: ViolationSeverity;
    evidence: Record<string, unknown>;
}

/**
 * Resultado completo de la evaluación del firewall
*/
export interface FirewallResult {
    allowed: boolean;
    riskScore: number;
    action: FirewallAction;
    blockedReason?: string;
    warningMessage?: string;
    cooldownSeconds?: number;
    violations: ViolationInfo[];
    metadata: {
        contactId: string;
        rulesChecked: number;
        messageLength: number;
        processingTimeMs: number;
    };
}

/**
 * Configuración del rate limiting
*/
export interface RateLimitRule {
    maxRequests: number;
    windowSeconds: number;
    severity: ViolationSeverity;
    blockDurationSeconds: number;
}

/**
 * Estado de bloqueo de un usuario
*/
export interface BlockStatus {
    isBlocked: boolean;
    blockedUntil?: Date;
    lastViolation?: Date;
    violationCount: number;
    remainingSeconds?: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Configuración del firewall
*/
export interface FirewallConfig {
    enabled: boolean;
    maxRiskScore: number;
    offensiveWords: string[];
    minMessageLength: number;
    maxMessageLength: number;
    autoBlockEnabled: boolean;
    maxRepeatedMessages: number;
    botDetectionEnabled: boolean;
    rateLimitRules: RateLimitRule[];
    suspiciousUrlPatterns: RegExp[];
    burstThreshold: number; // mensajes por segundo para detectar bursts
}

/**
 * Estadísticas del firewall para monitoreo
*/
export interface FirewallStats {
    uptimeSeconds: number;
    messagesWarned: number;
    messagesAllowed: number;
    messagesBlocked: number;
    averageProcessingTime: number;
    totalMessagesProcessed: number;
    violationsByType: Record<ViolationType, number>;
    topViolators: Array<{
        contactId: string;
        violationCount: number;
        lastViolation: Date;
    }>;
}
