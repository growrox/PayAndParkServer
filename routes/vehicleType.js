import { Router } from "express";
import {
  createVehicleType,
  updateVehicleType,
  getAllVehicleType,
  getVehicleTypeDetail,
  deleteVehicleType,
  serveImage,
} from "../controllers/vehicelType.controller.js";
import validateJWT from "../middlewares/validateJWT.js";
import { ROUTES } from "../utils/routes.js";
import upload from "../services/multer.config.js";

const router = Router();
const {
  VEHICLE_TYPE: { CREATE, UPDATE, GET_DETAIL, GET_ALL, DELETE },
  IMAGE: { GET },
} = ROUTES;

// Routes for user management
router.post(CREATE, validateJWT, upload.single("image"), createVehicleType);
router.get(GET, serveImage);
router.put(UPDATE, validateJWT, upload.single("image"), updateVehicleType);
router.get(GET_ALL, validateJWT, getAllVehicleType);
router.get(GET_DETAIL, validateJWT, getVehicleTypeDetail);
router.delete(DELETE, validateJWT, deleteVehicleType);

export default router;
