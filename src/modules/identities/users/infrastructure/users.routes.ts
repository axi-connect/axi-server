import { Router } from "express";
import { UsersValidator, UsersSearchValidator } from "./users.validator.js";
import { UsersController } from "./users.controller.js";
import { UsersRepository } from "./users.repository.js";
import { UsersUseCases } from "../application/users.usescases.js";
import { validateIdParam } from "../../../shared/validators.shared.js";

export const UsersRouter = Router();
const usersRepository = new UsersRepository();
const usersUseCases = new UsersUseCases(usersRepository);
const usersController = new UsersController(usersUseCases);

// /identities/users
UsersRouter.get('/', UsersSearchValidator.validate, usersController.list);
UsersRouter.get('/:id', validateIdParam('id'), usersController.list);
UsersRouter.post('/', UsersValidator.validateCreate, usersController.create);
UsersRouter.put('/:id', validateIdParam('id'), UsersValidator.validateUpdate, usersController.update);
UsersRouter.delete('/:id', validateIdParam('id'), usersController.delete);