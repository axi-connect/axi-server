import { Router } from 'express';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { ChannelsContainer } from '../channels.container.js';
import { ChannelValidator } from '../../shared/validators/channel.validator.js';
import { ChannelController } from '@/modules/channels/infrastructure/controllers/channel.controller.js';

/**
 * Create and configure channel routes with proper dependency injection
 * @param prisma - Prisma client instance
 * @param runtimeService - Channel runtime service instance
 * @returns Configured channel router
*/
export function createChannelRouter(): Router {
  // Create router
  const channelRouter = Router();

  // Get dependencies from container
  const container = ChannelsContainer.getInstance();
  const channelUseCases = container.getChannelUseCases();

  // Initialize controller with injected dependencies
  const channelController = new ChannelController(channelUseCases);

  // CHANNELS ROUTES
  // POST / - Create a new channel
  channelRouter.post(
    '/',
    authorize('/channels', 'create'),
    ChannelValidator.validateCreate,
    ChannelValidator.validateProviderCredentials,
    channelController.createChannel
  );

  // GET / - List channels for company
  channelRouter.get(
    '/',
    authorize('/channels', 'read'),
    ChannelValidator.validateSearchCriteria,
    channelController.listChannels
  );

  // GET /:id - Get channel by ID
  channelRouter.get(
    '/:id',
    authorize('/channels', 'read'),
    ChannelValidator.validateIdParam,
    channelController.getChannel
  );

  // PUT /:id - Update channel
  channelRouter.put(
    '/:id',
    authorize('/channels', 'update'),
    ChannelValidator.validateIdParam,
    ChannelValidator.validateUpdate,
    channelController.updateChannel
  );

  // DELETE /:id - Delete channel (soft delete)
  channelRouter.delete(
    '/:id',
    authorize('/channels', 'delete'),
    ChannelValidator.validateIdParam,
    channelController.deleteChannel
  );

  // PUT /:id/activate - Activate channel
  channelRouter.put(
    '/:id/activate',
    authorize('/channels', 'update'),
    ChannelValidator.validateIdParam,
    channelController.activateChannel
  );

  // PUT /:id/deactivate - Deactivate channel
  channelRouter.put(
    '/:id/deactivate',
    authorize('/channels', 'update'),
    ChannelValidator.validateIdParam,
    channelController.deactivateChannel
  );

  // GET /:id/qr - Get QR code for authentication
  channelRouter.get(
    '/:id/qr',
    authorize('/channels', 'read'),
    ChannelValidator.validateIdParam,
    channelController.getChannelQR
  );

  // POST /:id/auth - Complete channel authentication
  channelRouter.post(
    '/:id/auth',
    authorize('/channels', 'update'),
    ChannelValidator.validateIdParam,
    ChannelValidator.validateCompleteAuth,
    channelController.completeChannelAuth
  );

  return channelRouter;
}
