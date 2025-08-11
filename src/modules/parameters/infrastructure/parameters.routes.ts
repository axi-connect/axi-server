import { Router } from "express";
import { ParametersRepository } from "./parameters.repository.js";
import { ParametersUsesCases } from "../application/parameters.usescases.js";
import { ParametersController } from "./parameters.controller.js";
import { ParametersValidator } from "./parameters.validator.js";

export const ParametersRouter = Router();
const parametersRepository = new ParametersRepository();
const parametersUsesCases = new ParametersUsesCases(parametersRepository);
const parametersController = new ParametersController(parametersUsesCases);

ParametersRouter.delete('/intention/delete', parametersController.deleteIntention);
ParametersRouter.post('/intention/create', ParametersValidator.validateIntentionCreation, parametersController.createIntention);
ParametersRouter.post('/ai-requirement/create', ParametersValidator.validateAIRequirementsCreation, parametersController.createAIRequirements);
ParametersRouter.post('/form/create', ParametersValidator.validateFormCreation, parametersController.createForm);
