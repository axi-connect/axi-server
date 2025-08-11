import { Router } from "express";
import { IdentitiesValidator } from "./identities.validator.js";
import { IdentitiesController } from "./identities.controller.js";
import { IdentitiesRepository } from "./identities.repository.js";
import { IdentitiesUsesCases } from "../application/identities.usescases.js";
import { RbacRepository } from "../../rbac/infrastructure/rbac.repository.js";
import { ParametersRepository } from "../../parameters/infrastructure/parameters.repository.js";

export const IdentitiesRouter = Router();
const identitiesRepository = new IdentitiesRepository();
const identitiesUsesCases = new IdentitiesUsesCases(identitiesRepository);
const identitiesController = new IdentitiesController(identitiesUsesCases);

IdentitiesRouter.get('/company/read', identitiesController.readCompany);
IdentitiesRouter.delete('/company/delete', identitiesController.deleteCompany);
IdentitiesRouter.post('/company/update', IdentitiesValidator.validateCompanyUpdate, identitiesController.updateCompany);
IdentitiesRouter.post('/company/create', IdentitiesValidator.validateCompanyCreation, identitiesController.createCompany);

IdentitiesRouter.get('/user/read', identitiesController.readUser);
IdentitiesRouter.delete('/user/delete', identitiesController.deleteUser);
IdentitiesRouter.post('/user/update', IdentitiesValidator.validateUserUpdate, identitiesController.updateUser);
IdentitiesRouter.post('/user/create', IdentitiesValidator.validateUserCreation, identitiesController.createUser);

IdentitiesRouter.post('/agent/create', IdentitiesValidator.validateAgentCreation, identitiesController.createAgent);