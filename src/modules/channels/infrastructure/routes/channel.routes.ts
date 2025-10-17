import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authorize } from '@/middlewares/rbac.middleware.js';
import { ChannelController } from '../controllers/channel.controller.js';
import { ChannelRepository } from '../repositories/channel.repository.js';
import { CredentialRepository } from '../repositories/credential.repository.js';
import { ChannelUseCases } from '../../application/use-cases/channel.usecases.js';
import { ChannelValidator } from '../../shared/validators/channel.validator.js';

/**
 * Create and configure channel routes
 * @param prisma - Prisma client instance
 * @returns Configured channel router
 */
export function createChannelRouter(prisma: PrismaClient): Router {
  // Initialize repositories
  const channelRepository = new ChannelRepository(prisma);
  const credentialRepository = new CredentialRepository(prisma);

  // Initialize use cases
  const channelUseCases = new ChannelUseCases(channelRepository, credentialRepository);

  // Initialize controller
  const channelController = new ChannelController(channelUseCases);

  // Create router
  const channelRouter = Router();

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

  return channelRouter;
}
