import { Router } from "express";
import { UsersRouter } from "../users/infrastructure/users.routes.js";
import { AgentsRouter } from "../agents/infrastructure/agents.routes.js";
import { CompaniesRouter } from "../companies/infrastructure/companies.routes.js";

export const IdentitiesRouter = Router();

// Mount sub-resources under /identities
IdentitiesRouter.use('/users', UsersRouter);
IdentitiesRouter.use('/agents', AgentsRouter);
IdentitiesRouter.use('/companies', CompaniesRouter);