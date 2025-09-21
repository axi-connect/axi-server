import { Router } from "express";
import { RbacValidator } from "./rbac.validator.js";
import { RbacController } from "./rbac.controller.js";
import { RbacRepository } from "./rbac.repository.js";
import { RbacUsesCases } from "../application/rbac.usecases.js";
import { authorize } from '../../../middlewares/rbac.middleware.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateIdParam } from "../../../shared/validators.shared.js";

export const RbacRouter = Router();
const rbacRepository = new RbacRepository();
const rbacUsesCases = new RbacUsesCases(rbacRepository);
const rbacController = new RbacController(rbacUsesCases);

// Apply authentication and RBAC authorization by module route
// authenticate, authorize('/rbac', 'read'),
RbacRouter.get('/role', RbacValidator.validateRoleSearch, rbacController.readRole);
RbacRouter.get('/module', RbacValidator.validateModuleSearch, rbacController.readModule);
RbacRouter.get('/overview', RbacValidator.validateOverview, rbacController.overview);
RbacRouter.get('/audit/logs', RbacValidator.validateAuditSearch, rbacController.auditLogs);
RbacRouter.get('/audit/role/:id', RbacValidator.validateAuditSearch, rbacController.auditLogsByRole);
RbacRouter.get('/audit/user/:id', RbacValidator.validateAuditSearch, rbacController.auditLogsByUser);
RbacRouter.post('/role', RbacValidator.validateRoleCreation, rbacController.createRole);
RbacRouter.post('/module', RbacValidator.validateModuleCreation, rbacController.createModule);
RbacRouter.put('/module/:id', validateIdParam('id'), RbacValidator.validateModuleUpdate, rbacController.updateModule);
RbacRouter.put('/role/:id', validateIdParam('id'), RbacValidator.validateRoleUpdate, rbacController.updateRole);
RbacRouter.delete('/module/:id', validateIdParam('id'), rbacController.deleteModule);
RbacRouter.delete('/role/:id', validateIdParam('id'), rbacController.deleteRole);

// authenticate, authorize('/rbac', 'create'),
// authenticate, authorize('/rbac', 'create'),