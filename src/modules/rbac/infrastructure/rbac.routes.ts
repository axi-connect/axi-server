import { Router } from "express";
import { RbacValidator } from "./rbac.validator.js";
import { RbacController } from "./rbac.controller.js";
import { RbacRepository } from "./rbac.repository.js";
import { RbacUsesCases } from "../application/rbac.usecases.js";
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { authorize } from '../../../middlewares/rbac.middleware.js';

export const RbacRouter = Router();
const rbacRepository = new RbacRepository();
const rbacUsesCases = new RbacUsesCases(rbacRepository);
const rbacController = new RbacController(rbacUsesCases);

// Apply authentication and RBAC authorization by module route
RbacRouter.get('/role/read', authenticate, authorize('/rbac', 'read'), rbacController.readRole);
RbacRouter.post('/role/create', RbacValidator.validateRoleCreation, rbacController.createRole)
RbacRouter.post('/module/create', RbacValidator.validateModuleCreation, rbacController.createModule)

// authenticate, authorize('/rbac', 'create'),
// authenticate, authorize('/rbac', 'create'),