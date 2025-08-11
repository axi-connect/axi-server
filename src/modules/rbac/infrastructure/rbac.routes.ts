import { Router } from "express";
import { RbacValidator } from "./rbac.validator.js";
import { RbacController } from "./rbac.controller.js";
import { RbacRepository } from "./rbac.repository.js";
import { RbacUsesCases } from "../application/rbac.usecases.js";

export const RbacRouter = Router();
const rbacRepository = new RbacRepository();
const rbacUsesCases = new RbacUsesCases(rbacRepository);
const rbacController = new RbacController(rbacUsesCases);

RbacRouter.get('/role/read', rbacController.readRole);
RbacRouter.post('/role/create', RbacValidator.validateRoleCreation, rbacController.createRole)
RbacRouter.post('/module/create', RbacValidator.validateModuleCreation, rbacController.createModule)