import { Router } from "express";
import {
     createVehiclePass,
     getAllVehiclePasses,
     getVehiclePass,
     updateVehiclePass,
     deleteVehiclePass
} from "../controllers/vehicalPass.controller.js";

import validateJWT from "../middlewares/validateJWT.js";
import checkParkingAssistant from "../middlewares/checkParkingAssistant.js"
import authMiddleware from "../middlewares/validateJWT.js";

import { ROUTES } from "../utils/routes.js";

const router = Router();
const { } = ROUTES;
// Routes for user management

router.post('/vehicle-passes', authMiddleware, createVehiclePass);
router.get('/vehicle-passes', authMiddleware, getAllVehiclePasses);
router.get('/vehicle-passes/:filter', authMiddleware, getVehiclePass);
router.put('/vehicle-passes/:passId', authMiddleware, updateVehiclePass);
router.delete('/vehicle-passes/:passId', authMiddleware, deleteVehiclePass);

// router.get('/users/:phone', validateJWT, getUserById);
// router.delete('/users/:phone', deleteUser);

export default router;


