import { Router } from "express";
import { AgentsValidator } from "./agents.validator.js";
import { AgentsController } from "./agents.controller.js";
import { AgentsRepository } from "./agents.repository.js";
import { authenticate } from "@/middlewares/auth.middleware.js";
import { validateIdParam } from "@/shared/validators.shared.js";
import { AgentsUseCases } from "../application/agents.usescases.js";

export const AgentsRouter = Router();
const agentsRepository = new AgentsRepository();
const agentsUseCases = new AgentsUseCases(agentsRepository);
const agentsController = new AgentsController(agentsUseCases);

AgentsRouter.get('/:id', authenticate, validateIdParam('id'), agentsController.list);
AgentsRouter.get('/', authenticate, AgentsValidator.validateSearchCriteria, agentsController.list);
AgentsRouter.post('/', authenticate, AgentsValidator.validateCreate, agentsController.create);
AgentsRouter.put('/:id', authenticate, validateIdParam('id'), AgentsValidator.validateUpdate, agentsController.update);
AgentsRouter.delete('/:id', authenticate, validateIdParam('id'), agentsController.delete);