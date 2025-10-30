import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { MessageController } from '../../../conversations/infrastructure/controllers/message.controller.js';
import { MessageRepository } from '../repositories/message.repository.js';
import { MessageUseCases } from '../../../conversations/application/use-cases/message.usecases.js';

/**
 * Create and configure message routes
 * @param prisma - Prisma client instance
 * @returns Configured message router
 */
export function createMessageRouter(prisma: PrismaClient): Router {
  // Initialize repository
  const messageRepository = new MessageRepository(prisma);

  // Initialize use cases
  const messageUseCases = new MessageUseCases(messageRepository);

  // Initialize controller
  const messageController = new MessageController(messageUseCases);

  // Create router
  const messageRouter = Router();

  // MESSAGES ROUTES
  // POST / - Send a new message
  messageRouter.post(
    '/',
    authorize('/messages', 'create'),
    messageController.sendMessage
  );

  // GET /:id - Get message by ID
  messageRouter.get(
    '/:id',
    authorize('/messages', 'read'),
    messageController.getMessage
  );

  // PUT /:id/status - Update message status
  messageRouter.put(
    '/:id/status',
    authorize('/messages', 'update'),
    messageController.updateMessageStatus
  );

  return messageRouter;
}
