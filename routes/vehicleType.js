import { Router } from "express";
import {
  createVehicleType,
  updateVehicleType,
  getAllVehicleType,
  getVehicleTypeDetail,
  deleteVehicleType,
} from "../controllers/vehicelType.controller.js";
import validateJWT from "../middlewares/validateJWT.js";
import { ROUTES } from "../utils/routes.js";

const router = Router();
const {
  VEHICLE_TYPE: { CREATE, UPDATE, GET_DETAIL, GET_ALL, DELETE },
} = ROUTES;

// Routes for user management
router.post(CREATE, createVehicleType);
router.put(UPDATE, updateVehicleType);
router.get(GET_ALL, getAllVehicleType);
router.get(GET_DETAIL, validateJWT, getVehicleTypeDetail);
router.delete(DELETE, validateJWT, deleteVehicleType);

export default router;
