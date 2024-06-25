import { Router } from "express";
import {
  createUser,
  loginUser,
  validateOTP,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import validateJWT from "../middlewares/validateJWT.js";
import { ROUTES } from "../utils/routes.js";

const router = Router();
const {
  USER: { SIGN_UP, LOGIN, VERIFY_OTP },
} = ROUTES;
// Routes for user management
router.post(SIGN_UP, createUser);
router.post(LOGIN, loginUser);
router.post(VERIFY_OTP, validateOTP);
// router.get('/users', validateJWT, getUsers);
// router.get('/users/:phone', validateJWT, getUserById);
// router.put('/users/:phone', updateUser);
// router.delete('/users/:phone', deleteUser);

export default router;
