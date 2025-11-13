import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { validateIdParam } from '@/shared/validators.shared.js';
import { getContainer } from '@/modules/channels/infrastructure/channels.container.js';
import { MessageUseCases } from '@/modules/conversations/application/use-cases/message.usecases.js';
import { MessageValidator } from '@/modules/conversations/infrastructure/validators/message.validator.js';
import { ChannelRuntimeService } from '@/modules/channels/application/services/channel-runtime.service.js';
import { MessageController } from '@/modules/conversations/infrastructure/controllers/message.controller.js';
import { MessageRepository } from '@/modules/conversations/infrastructure/repositories/message.repository.js';

/**
 * Create and configure message routes
 * @param prisma - Prisma client instance
 * @returns Configured message router
*/
export function createMessageRouter(prisma: PrismaClient): Router {
  // Initialize repository
  const messageRepository = new MessageRepository(prisma);

  // Initialize use cases
  const container = getContainer();
  const channelRuntimeService = container.resolve<ChannelRuntimeService>('channelRuntimeService');
  const messageUseCases = new MessageUseCases(channelRuntimeService, messageRepository);

  // Initialize controller
  const messageController = new MessageController(messageUseCases);

  // Create router
  const messageRouter = Router();

    // MESSAGES ROUTES
    // POST / - Send a new message
    messageRouter.post(
      '/',
      authorize('/messages', 'create'),
      MessageValidator.validateCreate,
      messageController.sendMessage
    );

  // GET /:id - Get message by ID
  messageRouter.get(
    '/:id',
    authorize('/messages', 'read'),
    validateIdParam('id', 'uuid'),
    messageController.getMessage
  );

  // GET /conversations/:conversation_id - Get all messages by conversation
  messageRouter.get(
    '/conversations/:conversation_id',
    authorize('/messages', 'read'),
    validateIdParam('conversation_id', 'uuid'),
    MessageValidator.validateSearchCriteria,
    messageController.getMessagesByConversation
  );

  // PUT /:id/status - Update message status
  messageRouter.put(
    '/:id/status',
    authorize('/messages', 'update'),
    validateIdParam('id', 'uuid'),
    MessageValidator.validateUpdateStatus,
    messageController.updateMessageStatus
  );

  return messageRouter;
}
