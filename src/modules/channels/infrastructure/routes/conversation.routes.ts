import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { ConversationUseCases } from '../../application/use-cases/conversation.usecases.js';
import { MessageController } from '../controllers/message.controller.js';
import { MessageRepository } from '../repositories/message.repository.js';
import { MessageUseCases } from '../../application/use-cases/message.usecases.js';

/**
 * Create and configure conversation routes
 * @param prisma - Prisma client instance
 * @returns Configured conversation router
 */
export function createConversationRouter(prisma: PrismaClient): Router {
  // Initialize repositories
  const conversationRepository = new ConversationRepository(prisma);
  const messageRepository = new MessageRepository(prisma);

  // Initialize use cases
  const conversationUseCases = new ConversationUseCases(conversationRepository);
  const messageUseCases = new MessageUseCases(messageRepository);

  // Initialize controllers
  const conversationController = new ConversationController(conversationUseCases);
  const messageController = new MessageController(messageUseCases);

  // Create router
  const conversationRouter = Router();

  // CONVERSATIONS ROUTES
  // POST / - Create a new conversation
  conversationRouter.post(
    '/',
    authorize('/conversations', 'create'),
    conversationController.createConversation
  );

  // GET /:id - Get conversation by ID
  conversationRouter.get(
    '/:id',
    authorize('/conversations', 'read'),
    conversationController.getConversation
  );

  // PUT /:id - Update conversation
  conversationRouter.put(
    '/:id',
    authorize('/conversations', 'update'),
    conversationController.updateConversation
  );

  // PUT /:id/assign-agent - Assign agent to conversation
  conversationRouter.put(
    '/:id/assign-agent',
    authorize('/conversations', 'update'),
    conversationController.assignAgent
  );

  // PUT /:id/unassign-agent - Unassign agent from conversation
  conversationRouter.put(
    '/:id/unassign-agent',
    authorize('/conversations', 'update'),
    conversationController.unassignAgent
  );

  // GET /:conversationId/messages - Get messages by conversation
  conversationRouter.get(
    '/:conversationId/messages',
    authorize('/messages', 'read'),
    messageController.getMessagesByConversation
  );

  return conversationRouter;
}
