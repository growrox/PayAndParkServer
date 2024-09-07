import { Router } from "express";
import {
  createUser,
  loginUser,
  validateOTP,
  getUsers,
  getUserStatus,
  updateUser,
  getUserById,
  deleteUser,
  getSupervisorWithAssitant,
  forgotPassword,
  updateUserPassword
} from "../controllers/user.controller.js";
import validateJWT from "../middlewares/validateJWT.js";
import checkParkingAssistant from "../middlewares/checkParkingAssistant.js"

import { ROUTES } from "../utils/routes.js";

const router = Router();
const {
  USER: { SIGN_UP, LOGIN, VERIFY_OTP, GET_USER, GET_USER_STATUS, UPDATE_USER, GET_SUPERVISOR_WITH_ASSITANT, FOGOT_PASSWORD, UPDATE_PASSWORD },
} = ROUTES;
import authMiddleware from "../middlewares/validateJWT.js";

// Routes for user management
router.post(SIGN_UP, createUser);
router.post(LOGIN, loginUser);
router.post(VERIFY_OTP, validateOTP);
router.get(GET_USER, authMiddleware, getUsers);
router.get(GET_USER_STATUS, authMiddleware, validateJWT, getUserStatus);
router.put(UPDATE_USER, authMiddleware, updateUser);
router.get(GET_SUPERVISOR_WITH_ASSITANT, authMiddleware, getSupervisorWithAssitant);

router.get(FOGOT_PASSWORD, authMiddleware, forgotPassword);
router.patch(UPDATE_PASSWORD, authMiddleware, updateUserPassword);

// router.get('/users/:phone', validateJWT, getUserById);
// router.delete('/users/:phone', deleteUser);

export default router;
