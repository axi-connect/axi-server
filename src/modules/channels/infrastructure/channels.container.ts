import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { getRedisClient, RedisClient } from '@/database/redis.js';
import { createContainer, asClass, asValue, InjectionMode, AwilixContainer, asFunction } from 'awilix';


// Repositories
import { ChannelRepository } from './repositories/channel.repository.js';
import { CredentialRepository } from './repositories/credential.repository.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import { ParametersRepository } from '@/modules/parameters/infrastructure/parameters.repository.js';
import { CompaniesRepository } from '@/modules/identities/companies/infrastructure/companies.repository.js';
import { MessageRepository } from '@/modules/conversations/infrastructure/repositories/message.repository.js';
import { ConversationRepository } from '@/modules/conversations/infrastructure/repositories/conversation.repository.js';

// Services
import { AIService } from '@/services/ai/index.js';
import { AuthSessionService } from '../application/services/auth-session.service.js';
import { ChannelRuntimeService } from '../application/services/channel-runtime.service.js';
import { ChannelWebSocketGateway } from '../application/services/channel-websocket.gateway.js';
import { FlowRegistryService } from '@/modules/conversations/application/services/flow-registry.service.js';
import { StepExecutorService } from '@/modules/conversations/application/services/step-executor.service.js';
import { AgentMatchingService } from '@/modules/conversations/application/services/agent-matching.service.js';
import { WorkflowEngineService } from '@/modules/conversations/application/services/workflow-engine.service.js';
import { MessageRoutingService } from '@/modules/conversations/application/services/message-routing.service.js';
import { ConversationalFirewallService } from '@/modules/conversations/application/services/conversational-firewall.service.js';
import { MessageIngestionService } from '@/modules/conversations/application/services/message-ingestion.service.js';
import { ConversationResolver } from '@/modules/conversations/application/services/conversation-resolver.service.js';
import { IntentionClassifierService } from '@/modules/conversations/application/services/intention-classifier.service.js';
import { ConversationOrchestratorService } from '@/modules/conversations/application/services/conversation-orchestrator.service.js';

// Use Cases
import { ChannelUseCases } from '../application/use-cases/channel.usecases.js';
import { ChannelAuthUseCases } from '../application/use-cases/channel-auth.usecases.js';
import { createReceptionFlow } from '@/modules/conversations/domain/flows/reception.flow.js';

export type ChannelContainer = AwilixContainer<ChannelsContainerDependencies>;

type ChannelsContainerDependencies = {
    io: Server;
    prisma: PrismaClient;
    aiService: AIService;
    redisClient: RedisClient;
    channelUseCases: ChannelUseCases;
    flowRegistry: FlowRegistryService;
    stepExecutor: StepExecutorService;
    agentsRepository: AgentsRepository;
    agentMatching: AgentMatchingService;
    messageRepository: MessageRepository;
    channelRepository: ChannelRepository;
    workflowEngine: WorkflowEngineService;
    messageRouting: MessageRoutingService;
    authSessionService: AuthSessionService;
    channelAuthUseCases: ChannelAuthUseCases;
    companiesRepository: CompaniesRepository;
    messageIngestion: MessageIngestionService;
    webSocketGateway: ChannelWebSocketGateway;
    parametersRepository: ParametersRepository;
    conversationResolver: ConversationResolver;
    credentialRepository: CredentialRepository;
    channelRuntimeService: ChannelRuntimeService;
    conversationRepository: ConversationRepository;
    intentionClassifier: IntentionClassifierService;
    conversationOrchestrator: ConversationOrchestratorService;
}

let containerInstance: ChannelContainer;

function createChannelsContainer(io: Server) {
    const container = createContainer<ChannelsContainerDependencies>({ injectionMode: InjectionMode.CLASSIC });
    // Paso 1: Registrar dependencias
    container.register({
        // Infrastructure
        io: asValue(io),
        prisma: asValue(new PrismaClient()),

        // Repositories
        agentsRepository: asClass(AgentsRepository).singleton(),
        messageRepository: asClass(MessageRepository).singleton(),
        channelRepository: asClass(ChannelRepository).singleton(),
        companiesRepository: asClass(CompaniesRepository).singleton(),
        parametersRepository: asClass(ParametersRepository).singleton(),
        credentialRepository: asClass(CredentialRepository).singleton(),
        conversationRepository: asClass(ConversationRepository).singleton(),

        // Core Services
        aiService: asFunction(() => new AIService()).singleton(),
        authSessionService: asClass(AuthSessionService).singleton(),
        webSocketGateway: asClass(ChannelWebSocketGateway).singleton(),
        channelRuntimeService: asClass(ChannelRuntimeService).singleton(),

        // Workflow Services
        flowRegistry: asClass(FlowRegistryService).singleton(),
        stepExecutor: asClass(StepExecutorService).singleton(),
        agentMatching: asClass(AgentMatchingService).singleton(),
        workflowEngine: asClass(WorkflowEngineService).singleton(),
        intentionClassifier: asClass(IntentionClassifierService).singleton(),
        conversationOrchestrator: asClass(ConversationOrchestratorService).singleton(),

        // Message Services
        messageIngestion: asClass(MessageIngestionService).singleton(),
        conversationResolver: asClass(ConversationResolver).singleton(),

        // Use Cases
        channelUseCases: asClass(ChannelUseCases).singleton(),
        channelAuthUseCases: asClass(ChannelAuthUseCases).singleton(),
    });

    // Paso 2: Inicialización post-registro (para dependencias circulares)
    const webSocketGateway:ChannelWebSocketGateway = container.resolve('webSocketGateway');
    const channelRuntimeService:ChannelRuntimeService = container.resolve('channelRuntimeService');
    const conversationOrchestrator:ConversationOrchestratorService = container.resolve('conversationOrchestrator');
    const messageIngestion:MessageIngestionService = container.resolve('messageIngestion');
    const conversationResolver:ConversationResolver = container.resolve('conversationResolver');

    // Crear firewall con configuración por defecto
    const firewallConfig = ConversationalFirewallService.getDefaultConfig();
    const messageRouting = new MessageRoutingService(
        messageIngestion,
        conversationResolver,
        conversationOrchestrator,
        firewallConfig
    );
    
    conversationOrchestrator.setWebSocketEventEmitter((event) => webSocketGateway.handleWebSocketEvent(event));
    messageRouting.setWebSocketEventEmitter((event) => webSocketGateway.handleWebSocketEvent(event));
    channelRuntimeService.setWebSocketCallback((event) => webSocketGateway.handleWebSocketEvent(event));
    channelRuntimeService.setMessageRouterService(messageRouting);

    // Paso 3: Registrar flows
    const flowRegistry = container.resolve<FlowRegistryService>('flowRegistry');
    const aiService = container.resolve<AIService>('aiService');
    const intentionClassifier = container.resolve<IntentionClassifierService>('intentionClassifier');
    const workflowEngine = container.resolve<WorkflowEngineService>('workflowEngine');
    
    flowRegistry.registerFlow(createReceptionFlow(aiService, intentionClassifier, workflowEngine));

    containerInstance = container;
    return container;
}

export function initializeContainer(io: Server): AwilixContainer {
    if (containerInstance) throw new Error('Container already initialized');
    return createChannelsContainer(io);
}

export function getContainer(): ChannelContainer {
    if (!containerInstance) throw new Error('Container not initialized. Call initializeContainer(io) first.');
    return containerInstance;
}

// Helper para resolver dependencias directamente
export function resolve<T>(key: string): T {
    const container = getContainer();
    if (!container) throw new Error('Container not initialized. Call initializeContainer(io) first.');
    return container.resolve<T>(key);
}