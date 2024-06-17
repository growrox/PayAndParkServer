import { Router } from "express";
import { createUser, getUsers, getUserById, updateUser, deleteUser } from "../controllers/user.controller.js"
import validateJWT from "../middlewares/validateJWT.js"

const router = Router();

// Routes for user management
router.post('/users', createUser);
router.get('/users', validateJWT, getUsers);
router.get('/users/:phone', validateJWT, getUserById);
router.put('/users/:phone', updateUser);
router.delete('/users/:phone', deleteUser);


export default router