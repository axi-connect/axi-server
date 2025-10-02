import { Router } from "express";
import { AuthValidator } from './auth.validator.js';
import { AuthController } from "./auth.controller.js";
import { AuthUsesCases } from "../application/auth.usescases.js";
import { authenticate } from '@/middlewares/auth.middleware.js';

export const AuthRouter = Router();

const authUsesCases = new AuthUsesCases();
const authController = new AuthController(authUsesCases);

AuthRouter.get('/me', authenticate, authController.me);
AuthRouter.post('/login', AuthValidator.validateLogin, authController.login);
AuthRouter.post('/refresh', AuthValidator.validateRefresh, authController.refresh);
AuthRouter.post('/logout', authenticate, AuthValidator.validateLogout, authController.logout);