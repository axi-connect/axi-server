import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '@/database/redis.js';
import { createContainer, asClass, asValue, InjectionMode } from 'awilix';


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
import { MessageIngestionService } from '@/modules/conversations/application/services/message-ingestion.service.js';
import { ConversationResolver } from '@/modules/conversations/application/services/conversation-resolver.service.js';
import { IntentionClassifierService } from '@/modules/conversations/application/services/intention-classifier.service.js';
import { ConversationOrchestratorService } from '@/modules/conversations/application/services/conversation-orchestrator.service.js';

// Use Cases
import { ChannelUseCases } from '../application/use-cases/channel.usecases.js';
import { ChannelAuthUseCases } from '../application/use-cases/channel-auth.usecases.js';
import { createReceptionFlow } from '@/modules/conversations/domain/flows/reception.flow.js';

export function createChannelsContainer(io: Server) {
    const container = createContainer({
        injectionMode: InjectionMode.PROXY
    });

    // Paso 1: Registrar dependencias
    container.register({
        // Infrastructure
        prisma: asValue(new PrismaClient()),
        redisClient: asValue(getRedisClient()),
        io: asValue(io),

        // Repositories
        channelRepository: asClass(ChannelRepository).singleton(),
        credentialRepository: asClass(CredentialRepository).singleton(),
        conversationRepository: asClass(ConversationRepository).singleton(),
        messageRepository: asClass(MessageRepository).singleton(),
        agentsRepository: asClass(AgentsRepository).singleton(),
        parametersRepository: asClass(ParametersRepository).singleton(),
        companiesRepository: asClass(CompaniesRepository).singleton(),

        // Core Services
        authSessionService: asClass(AuthSessionService).singleton(),
        channelRuntimeService: asClass(ChannelRuntimeService).singleton(),
        webSocketGateway: asClass(ChannelWebSocketGateway).singleton(),
        aiService: asClass(AIService).singleton(),

        // Workflow Services
        flowRegistry: asClass(FlowRegistryService).singleton(),
        stepExecutor: asClass(StepExecutorService).singleton(),
        workflowEngine: asClass(WorkflowEngineService).singleton(),
        intentionClassifier: asClass(IntentionClassifierService).singleton(),
        agentMatching: asClass(AgentMatchingService).singleton(),
        conversationOrchestrator: asClass(ConversationOrchestratorService).singleton(),

        // Message Services
        messageIngestion: asClass(MessageIngestionService).singleton(),
        conversationResolver: asClass(ConversationResolver).singleton(),
        messageRouting: asClass(MessageRoutingService).singleton(),

        // Use Cases
        channelUseCases: asClass(ChannelUseCases).singleton(),
        channelAuthUseCases: asClass(ChannelAuthUseCases).singleton(),
    });

    // Paso 2: Inicialización post-registro (para dependencias circulares)
    const messageRouting:MessageRoutingService = container.resolve('messageRouting');
    const webSocketGateway:ChannelWebSocketGateway = container.resolve('webSocketGateway');
    const runtimeService:ChannelRuntimeService = container.resolve('channelRuntimeService');
    
    runtimeService.setWebSocketCallback((event) => webSocketGateway.handleWebSocketEvent(event));
    runtimeService.setMessageRouterService(messageRouting);

    // Paso 3: Registrar flows
    const flowRegistry = container.resolve<FlowRegistryService>('flowRegistry');
    const aiService = container.resolve<AIService>('aiService');
    const intentionClassifier = container.resolve<IntentionClassifierService>('intentionClassifier');
    const workflowEngine = container.resolve<WorkflowEngineService>('workflowEngine');
    
    flowRegistry.registerFlow(createReceptionFlow(aiService, intentionClassifier, workflowEngine));

    return container;
}