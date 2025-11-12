import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { validateIdParam } from '@/shared/validators.shared.js';
import { MessageController } from '../controllers/message.controller.js';
import { MessageRepository } from '../repositories/message.repository.js';
import { MessageUseCases } from '../../application/use-cases/message.usecases.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { ConversationUseCases } from '../../application/use-cases/conversation.usecases.js';
import { ChannelsContainer } from '@/modules/channels/infrastructure/channels.container_old.js';
import { AgentsRepository } from '@/modules/identities/agents/infrastructure/agents.repository.js';
import { ChannelRepository } from '@/modules/channels/infrastructure/repositories/channel.repository.js';
import { CompaniesRepository } from '@/modules/identities/companies/infrastructure/companies.repository.js';
import { ConversationValidator } from '@/modules/conversations/infrastructure/validators/conversation.validator.js';
import { ConversationRepository } from '@/modules/conversations/infrastructure/repositories/conversation.repository.js';

/**
 * Create and configure conversation routes
 * @param prisma - Prisma client instance
 * @returns Configured conversation router
*/
export function createConversationRouter(prisma: PrismaClient): Router {
  // Initialize repositories
  const messageRepository = new MessageRepository(prisma);
  const conversationRepository = new ConversationRepository(prisma);

  // Initialize use cases
  const agentsRepository = new AgentsRepository();
  const container = ChannelsContainer.getInstance();
  const runtimeService = container.getRuntimeService();
  const companiesRepository = new CompaniesRepository();
  const channelRepository = new ChannelRepository(prisma);
  const messageUseCases = new MessageUseCases(runtimeService, messageRepository);
  const conversationUseCases = new ConversationUseCases(conversationRepository, messageRepository, companiesRepository, agentsRepository, channelRepository);

  // Initialize controllers
  const messageController = new MessageController(messageUseCases);
  const conversationController = new ConversationController(conversationUseCases);

  // Create router
  const conversationRouter = Router();

  // CONVERSATIONS ROUTES
  // POST / - Create a new conversation
  conversationRouter.post(
    '/',
    authorize('/conversations', 'create'),
    ConversationValidator.validateCreate,
    conversationController.createConversation
  );

  // GET / - List conversations
  conversationRouter.get(
    '/',
    authorize('/conversations', 'read'),
    ConversationValidator.validateSearchCriteria,
    conversationController.listConversations
  );

  // GET /:id - Get conversation by ID
  conversationRouter.get(
    '/:id',
    authorize('/conversations', 'read'),
    validateIdParam('id', 'uuid'),
    conversationController.getConversation
  );

  // PUT /:id - Update conversation
  conversationRouter.put(
    '/:id',
    authorize('/conversations', 'update'),
    validateIdParam('id', 'uuid'),
    conversationController.updateConversation
  );

  // DELETE /:id - Delete conversation
  conversationRouter.delete(
    '/:id',
    authorize('/conversations', 'delete'),
    validateIdParam('id', 'uuid'),
    conversationController.deleteConversation
  );

  // PUT /:id/assign-agent - Assign agent to conversation
  conversationRouter.put(
    '/:id/assign-agent',
    authorize('/conversations', 'update'),
    validateIdParam('id', 'uuid'),
    conversationController.assignAgent
  );

  // PUT /:id/unassign-agent - Unassign agent from conversation
  conversationRouter.put(
    '/:id/unassign-agent',
    authorize('/conversations', 'update'),
    validateIdParam('id', 'uuid'),
    conversationController.unassignAgent
  );

  // GET /:conversationId/messages - Get messages by conversation
  conversationRouter.get(
    '/:conversationId/messages',
    authorize('/messages', 'read'),
    validateIdParam('conversationId', 'uuid'),
    messageController.getMessagesByConversation
  );

  return conversationRouter;
}
