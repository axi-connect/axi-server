import { Router } from "express";
import { CompaniesValidator } from "./companies.validator.js";
import { CompaniesController } from "./companies.controller.js";
import { CompaniesRepository } from "./companies.repository.js";
import { validateIdParam } from "../../../shared/validators.shared.js";
import { CompaniesUseCases } from "../application/companies.usescases.js";

export const CompaniesRouter = Router();
const companiesRepository = new CompaniesRepository();
const companiesUseCases = new CompaniesUseCases(companiesRepository);
const companiesController = new CompaniesController(companiesUseCases);

// /identities/companies
CompaniesRouter.get('/', CompaniesValidator.validateSearchCriteria, companiesController.list);
CompaniesRouter.get('/:id', validateIdParam('id'), companiesController.list);
CompaniesRouter.post('/', CompaniesValidator.validateCreate, companiesController.create);
CompaniesRouter.put('/:id', validateIdParam('id'), CompaniesValidator.validateUpdate, companiesController.update);
CompaniesRouter.delete('/:id', validateIdParam('id'), companiesController.delete);