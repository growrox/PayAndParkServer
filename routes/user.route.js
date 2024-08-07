import { Router } from "express";
import {
  createUser,
  loginUser,
  validateOTP,
  getUsers,
  getUserStatus,
  updateUser,
  getUserById,
  deleteUser
} from "../controllers/user.controller.js";
import validateJWT from "../middlewares/validateJWT.js";
import checkParkingAssistant from "../middlewares/checkParkingAssistant.js"

import { ROUTES } from "../utils/routes.js";

const router = Router();
const {
  USER: { SIGN_UP, LOGIN, VERIFY_OTP, GET_USER, GET_USER_STATUS, UPDATE_USER },
} = ROUTES;
// Routes for user management
router.post(SIGN_UP, createUser);
router.post(LOGIN, loginUser);
router.post(VERIFY_OTP, validateOTP);
router.get(GET_USER, getUsers);
router.get(GET_USER_STATUS, validateJWT, getUserStatus);
router.put(UPDATE_USER, updateUser);

// router.get('/users/:phone', validateJWT, getUserById);
// router.delete('/users/:phone', deleteUser);

export default router;
