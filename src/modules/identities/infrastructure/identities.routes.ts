import { Router } from "express";
import { CompaniesRouter } from "../../companies/infrastructure/companies.routes.js";
import { UsersRouter } from "../../users/infrastructure/users.routes.js";
import { AgentsRouter } from "../../agents/infrastructure/agents.routes.js";

export const IdentitiesRouter = Router();

// Mount sub-resources under /identities
IdentitiesRouter.use('/companies', CompaniesRouter);
IdentitiesRouter.use('/users', UsersRouter);
IdentitiesRouter.use('/agents', AgentsRouter);
