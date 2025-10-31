import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@/middlewares/auth.middleware.js';

// Import modular router factories
import { createChannelRouter } from './channel.routes.js';
import { createMessageRouter } from '@/modules/conversations/infrastructure/routes/message.routes.js';
import { createConversationRouter } from '@/modules/conversations/infrastructure/routes/conversation.routes.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create main router
export const ChannelsRouter = Router();

// Apply authentication middleware to all routes
ChannelsRouter.use(authenticate);

// Create and mount modular routers with proper dependency injection
export function initializeChannelsRouter() {
    // Mount specific routers BEFORE the generic '/' router to avoid route capture
    // /channels/messages/*
    ChannelsRouter.use('/messages', createMessageRouter(prisma));
    // /channels/conversations/*
    ChannelsRouter.use('/conversations', createConversationRouter(prisma));
    // /channels/*
    ChannelsRouter.use('/', createChannelRouter());

    return ChannelsRouter;
}