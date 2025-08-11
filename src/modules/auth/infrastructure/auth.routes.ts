import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthUsesCases } from "../application/auth.usescases.js";

export const AuthRouter = Router();

const authUsesCases = new AuthUsesCases();
const authController = new AuthController(authUsesCases);

AuthRouter.post('/login', authController.login)
AuthRouter.post('/signup', authController.signup)