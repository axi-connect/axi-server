import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Repositories
import { ChannelRepository } from './repositories/channel.repository.js';
import { CredentialRepository } from './repositories/credential.repository.js';

// Services
import { getRedisClient, type RedisClient } from '@/database/redis.js';
import { AuthSessionService } from '../application/services/auth-session.service.js';
import { ChannelRuntimeService } from '../application/services/channel-runtime.service.js';
import { ChannelWebSocketGateway } from '../application/services/channel-websocket.gateway.js';

// Use Cases
import { ChannelUseCases } from '../application/use-cases/channel.usecases.js';
import { ChannelAuthUseCases } from '../application/use-cases/channel-auth.usecases.js';

/**
 * Contenedor de dependencias centralizado para el módulo Channels
 * Maneja la creación e inyección de todas las dependencias de manera profesional
*/
export class ChannelsContainer {
    private prisma: PrismaClient;
    private redisClient: RedisClient;
    private static instance: ChannelsContainer;

    // Repositories
    private channelRepository: ChannelRepository;
    private credentialRepository: CredentialRepository;

    // Services
    private runtimeService: ChannelRuntimeService;
    private authSessionService: AuthSessionService;
    private webSocketGateway: ChannelWebSocketGateway;

    // Use Cases
    private channelUseCases: ChannelUseCases;
    private channelAuthUseCases: ChannelAuthUseCases; // Acceso directo al caso de uso de autenticación

    private constructor(io: Server) {
        this.prisma = new PrismaClient();
        this.redisClient = getRedisClient();

        // Initialize repositories
        this.channelRepository = new ChannelRepository(this.prisma);
        this.credentialRepository = new CredentialRepository(this.prisma);
        
        // Initialize services
        this.authSessionService = new AuthSessionService(this.redisClient);
        this.runtimeService = new ChannelRuntimeService(this.channelRepository, this.authSessionService);
        this.webSocketGateway = new ChannelWebSocketGateway(io, this.runtimeService);

        // Connect runtime service with WebSocket gateway
        this.runtimeService.setWebSocketCallback((event) => { this.webSocketGateway.handleWebSocketEvent(event) });

        this.channelAuthUseCases = new ChannelAuthUseCases(
            this.runtimeService,
            this.authSessionService,
            this.channelRepository,
            this.credentialRepository
        );
        
        // Initialize use cases
        this.channelUseCases = new ChannelUseCases(
            this.runtimeService,
            this.channelAuthUseCases,
            this.channelRepository,
        );
    }

    /**
     * Crea o obtiene la instancia singleton del contenedor
    */
    static create(io: Server): ChannelsContainer {
        if (!ChannelsContainer.instance) ChannelsContainer.instance = new ChannelsContainer(io);
        return ChannelsContainer.instance;
    }

    /**
     * Obtiene la instancia singleton del contenedor
    */
    static getInstance(): ChannelsContainer {
        if (!ChannelsContainer.instance) {
        throw new Error('ChannelsContainer not initialized. Call create() first.');
        }
        return ChannelsContainer.instance;
    }

    // Getters para acceder a las dependencias

    getChannelRepository(): ChannelRepository {
        return this.channelRepository;
    }

    getCredentialRepository(): CredentialRepository {
        return this.credentialRepository;
    }

    getRuntimeService(): ChannelRuntimeService {
        return this.runtimeService;
    }

    getAuthSessionService(): AuthSessionService {
        return this.authSessionService;
    }

    getWebSocketGateway(): ChannelWebSocketGateway {
        return this.webSocketGateway;
    }

    getChannelUseCases(): ChannelUseCases {
        return this.channelUseCases;
    }

    getPrisma(): PrismaClient {
        return this.prisma;
    }

    getRedisClient(): any {
        return this.redisClient;
    }

    /**
     * Inicializa automáticamente los canales activos
    */
    async initializeActiveChannels(): Promise<void> {
        await this.runtimeService.initializeActiveChannels();
    }

    /**
     * Cierra todas las conexiones y limpia recursos
    */
    async shutdown(): Promise<void> {
        console.log('🧹 Cerrando ChannelsContainer...');

        try {
        await this.runtimeService.shutdown();
        await this.authSessionService.shutdown();
        await this.redisClient.disconnect();
        await this.prisma.$disconnect();

        ChannelsContainer.instance = null as any;
        console.log('✅ ChannelsContainer cerrado correctamente');
        } catch (error) {
        console.error('❌ Error cerrando ChannelsContainer:', error);
        throw error;
        }
    }
}