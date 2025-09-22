import { Router } from "express";
import { AgentsValidator } from "./agents.validator.js";
import { AgentsController } from "./agents.controller.js";
import { AgentsRepository } from "./agents.repository.js";
import { AgentsUseCases } from "../application/agents.usescases.js";
import { validateIdParam } from "../../../shared/validators.shared.js";

export const AgentsRouter = Router();
const agentsRepository = new AgentsRepository();
const agentsUseCases = new AgentsUseCases(agentsRepository);
const agentsController = new AgentsController(agentsUseCases);

// /identities/agents
AgentsRouter.get('/:id', validateIdParam('id'), agentsController.list);
AgentsRouter.get('/', AgentsValidator.validateSearchCriteria, agentsController.list);
AgentsRouter.post('/', AgentsValidator.validateCreate, agentsController.create);
AgentsRouter.put('/:id', validateIdParam('id'), AgentsValidator.validateUpdate, agentsController.update);
AgentsRouter.delete('/:id', validateIdParam('id'), agentsController.delete);