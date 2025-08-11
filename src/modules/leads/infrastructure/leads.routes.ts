import { Router } from "express";
import { LeadsValidator } from "./leads.validator.js";
import { LeadsRepository } from "./leads.repository.js";
import { LeadsController } from "./leads.controller.js";
import { LeadsUseCases } from "../application/leads.usecases.js";
import { validateIdParam } from "../../../shared/validators.shared.js";

export const LeadsRouter = Router();
const leadsRepository = new LeadsRepository();
const leadsUseCases = new LeadsUseCases(leadsRepository);
const leadsController = new LeadsController(leadsUseCases);

// Rutas CRUD básicas
LeadsRouter.post('/', LeadsValidator.validateCreateLead, leadsController.createLead);
LeadsRouter.get('/', LeadsValidator.validateSearchCriteria, leadsController.getLeads);
LeadsRouter.get('/:id', validateIdParam('id'), leadsController.getLeadById);
LeadsRouter.put('/:id', validateIdParam('id'), LeadsValidator.validateUpdateLead, leadsController.updateLead);
LeadsRouter.delete('/:id', validateIdParam('id'), leadsController.deleteLead);

// Rutas de Google Maps
LeadsRouter.post('/google-maps/save', LeadsValidator.validateGoogleMapsSave, leadsController.saveGoogleMapsLead);
LeadsRouter.get('/google-maps/photo/:photoRef', leadsController.getGooglePhoto);
LeadsRouter.post('/google-maps/search', LeadsValidator.validateGoogleMapsSearch, leadsController.searchGoogleMapsPlaces);

// Rutas de deduplicación
LeadsRouter.get('/check-duplicate', leadsController.checkDuplicateLead);
LeadsRouter.post('/merge-duplicates', LeadsValidator.validateMergeLeads, leadsController.mergeDuplicateLeads);

// Rutas de análisis
LeadsRouter.get('/:id/score', validateIdParam('id'), leadsController.calculateLeadScore);