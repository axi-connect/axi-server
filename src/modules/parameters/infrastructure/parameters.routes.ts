import { Router } from "express";
import { ParametersValidator } from "./parameters.validator.js";
import { authenticate } from "@/middlewares/auth.middleware.js";
import { validateIdParam } from "@/shared/validators.shared.js";
import { ParametersRepository } from "./parameters.repository.js";
import { ParametersController } from "./parameters.controller.js";
import { ParametersUsesCases } from "../application/parameters.usescases.js";

export const ParametersRouter = Router();
const parametersRepository = new ParametersRepository();
const parametersUsesCases = new ParametersUsesCases(parametersRepository);
const parametersController = new ParametersController(parametersUsesCases);

ParametersRouter.post('/intention', authenticate, ParametersValidator.validateIntentionCreation, parametersController.createIntention);
ParametersRouter.get('/intention', authenticate, ParametersValidator.validateIntentionSearch, parametersController.listIntentions);
ParametersRouter.get('/intention/overview', authenticate, parametersController.overviewIntentions);
ParametersRouter.put('/intention/:id', authenticate, validateIdParam('id'), ParametersValidator.validateIntentionUpdate, parametersController.updateIntention);
ParametersRouter.delete('/intention/:id', authenticate, validateIdParam('id'), parametersController.deleteIntention);

ParametersRouter.post('/character', authenticate, ParametersValidator.validateAgentCharacterCreation, parametersController.createAgentCharacter);
ParametersRouter.get('/character', authenticate, ParametersValidator.validateCharacterSearch, parametersController.listCharacters);
ParametersRouter.put('/character/:id', authenticate, validateIdParam('id'), ParametersValidator.validateAgentCharacterUpdate, parametersController.updateAgentCharacter);
ParametersRouter.delete('/character/:id', authenticate, validateIdParam('id'), parametersController.deleteAgentCharacter);

ParametersRouter.get('/ai-requirement', authenticate, ParametersValidator.validateAIRequirementSearch, parametersController.listAIRequirements);
ParametersRouter.put('/ai-requirement/:id', authenticate, validateIdParam('id'), ParametersValidator.validateAIRequirementUpdate, parametersController.updateAIRequirement);
ParametersRouter.delete('/ai-requirement/:id', authenticate, validateIdParam('id'), parametersController.deleteAIRequirement);
ParametersRouter.post('/ai-requirement', authenticate, ParametersValidator.validateAIRequirementsCreation, parametersController.createAIRequirements);