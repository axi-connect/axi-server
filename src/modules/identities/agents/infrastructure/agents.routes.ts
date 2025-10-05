import { Router } from "express";
import { AgentsValidator } from "./agents.validator.js";
import { AgentsController } from "./agents.controller.js";
import { AgentsRepository } from "./agents.repository.js";
import { validateIdParam } from "@/shared/validators.shared.js";
import { AgentsUseCases } from "../application/agents.usescases.js";
import { authenticate } from "@/middlewares/auth.middleware.js";

export const AgentsRouter = Router();
const agentsRepository = new AgentsRepository();
const agentsUseCases = new AgentsUseCases(agentsRepository);
const agentsController = new AgentsController(agentsUseCases);

// /identities/agents
AgentsRouter.post('/', authenticate, AgentsValidator.validateCreate, agentsController.create);
// AgentsRouter.get('/:id', validateIdParam('id'), agentsController.list);
// AgentsRouter.get('/', AgentsValidator.validateSearchCriteria, agentsController.list);
// AgentsRouter.put('/:id', validateIdParam('id'), AgentsValidator.validateUpdate, agentsController.update);
// AgentsRouter.delete('/:id', validateIdParam('id'), agentsController.delete);