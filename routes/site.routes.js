// routes/shiftRoutes.js

import express from "express";
import {
  createSite,
  getAllSites,
  updateSite,
  deleteSite
} from "../controllers/site.controller.js";
import { ROUTES } from "../utils/routes.js";

const {
  SITE: { CREATE, GET_DETAIL, GET_ALL, UPDATE, DELETE },
} = ROUTES;
const router = express.Router();
import authMiddleware from "../middlewares/validateJWT.js";

// Routes for shift management
router.post(CREATE, authMiddleware, createSite);
router.put(UPDATE, authMiddleware, updateSite);
router.get(GET_ALL, authMiddleware, getAllSites);
router.delete(DELETE, authMiddleware, deleteSite);

export default router;
