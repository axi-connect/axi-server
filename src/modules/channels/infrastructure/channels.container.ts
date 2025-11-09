import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { getRedisClient, type RedisClient } from '@/database/redis.js';

// Repositories
import { ChannelRepository } from './repositories/channel.repository.js';
import { CredentialRepository } from './repositories/credential.repository.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { CompaniesRepository } from '@/modules/identities/companies/infrastructure/companies.repository.js';
import { MessageRepository } from '@/modules/conversations/infrastructure/repositories/message.repository.js';
import { ConversationRepository } from '@/modules/conversations/infrastructure/repositories/conversation.repository.js';

// Services
import { AuthSessionService } from '../application/services/auth-session.service.js';
import { ChannelRuntimeService } from '../application/services/channel-runtime.service.js';
import { ChannelWebSocketGateway } from '../application/services/channel-websocket.gateway.js';
import { FlowRegistryService } from '@/modules/conversations/application/services/flow-registry.service.js';
import { StepExecutorService } from '@/modules/conversations/application/services/step-executor.service.js';
import { AgentMatchingService } from '@/modules/conversations/application/services/agent-matching.service.js';
import { WorkflowEngineService } from '@/modules/conversations/application/services/workflow-engine.service.js';
import { MessageRoutingService } from '@/modules/conversations/application/services/message-routing.service.js';
import { MessageIngestionService } from '@/modules/conversations/application/services/message-ingestion.service.js';
import { ConversationResolver } from '@/modules/conversations/application/services/conversation-resolver.service.js';
import { IntentionClassifierService } from '@/modules/conversations/application/services/intention-classifier.service.js';
import { ConversationOrchestratorService } from '@/modules/conversations/application/services/conversation-orchestrator.service.js';

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

        const companiesRepository = new CompaniesRepository();
        this.channelAuthUseCases = new ChannelAuthUseCases(
            this.runtimeService,
            this.authSessionService,
            this.channelRepository,
            this.credentialRepository,
            companiesRepository
        );
        
        // Initialize use cases
        this.channelUseCases = new ChannelUseCases(
            this.runtimeService,
            this.channelAuthUseCases,
            this.channelRepository,
        );

        // Wire ConversationResolver for inbound messages
        const conversationRepository = new ConversationRepository(this.prisma);
        const conversationResolver = new ConversationResolver(
            conversationRepository,
            this.channelRepository,
            60 * 60 * 24
        );

        // Wire MessageIngestion pipeline (MessageUseCases + ConversationUseCases)
        const messageRepository = new MessageRepository(this.prisma);
        const messageIngestion = new MessageIngestionService(
            messageRepository,
            conversationRepository,
            { idempotencyTtlSeconds: 15 * 60, maxMetadataBytes: 32 * 1024 } // 15 minutes, 32KB
        );

        // Intention classifier (Redis cache + AI fallback)
        const parametersRepository = new ParametersRepository();
        const intentionClassifier = new IntentionClassifierService(
            messageRepository,
            parametersRepository,
            { maxHistory: 15, cacheTtlSeconds: 5 * 60, aiTimeoutMs: 9500 } // 9.5 seconds
        );

        // Agent matching (skills/intent filters + load balancing)
        const agentsRepository = new AgentsRepository();
        const agentMatching = new AgentMatchingService(
            agentsRepository,
            conversationRepository,
            this.channelRepository,
            { cacheTtlSeconds: 60, maxCandidates: 100 }
        );

        // Flow registry (central flow definitions repository)
        const flowRegistry = new FlowRegistryService();

        // Step executor (executes individual workflow steps)
        const stepExecutor = new StepExecutorService();

        // Workflow engine (state management per conversation)
        const workflowEngine = new WorkflowEngineService(
            conversationRepository,
            parametersRepository,
            this.runtimeService,
            flowRegistry,
            stepExecutor,
        );

        // Conversation orchestrator (coordinates intent → agent → workflow)
        const conversationOrchestrator = new ConversationOrchestratorService(
            agentMatching,
            workflowEngine,
            intentionClassifier,
            (event) => this.webSocketGateway.handleWebSocketEvent(event),
            conversationRepository
        );

        const messageRouting = new MessageRoutingService(
            messageIngestion,
            conversationResolver,
            (event) => this.webSocketGateway.handleWebSocketEvent(event),
            conversationOrchestrator
        );
          
        this.runtimeService.setMessageRouterService(messageRouting);
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
        if (!ChannelsContainer.instance) throw new Error('ChannelsContainer not initialized. Call create() first.');
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