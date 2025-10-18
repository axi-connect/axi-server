import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@/middlewares/auth.middleware.js';

// Import modular router factories
import { createChannelRouter } from './channel.routes.js';
import { createMessageRouter } from './message.routes.js';
import { createConversationRouter } from './conversation.routes.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create main router
export const ChannelsRouter = Router();

// Apply authentication middleware to all routes
ChannelsRouter.use(authenticate);

// Create and mount modular routers
// /channels/*
ChannelsRouter.use('/', createChannelRouter(prisma));          
// /channels/conversations/*
ChannelsRouter.use('/conversations', createConversationRouter(prisma)); 
// /channels/messages/*
ChannelsRouter.use('/messages', createMessageRouter(prisma));  

export default ChannelsRouter;
