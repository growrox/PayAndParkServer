// routes/shiftRoutes.js

import express from "express";
import {
  createSite,
  getAllSites,
  updateSite,
  deleteSite,
  getSitesBySupervisorCode,
  getSiteDetailsAndTickets
} from "../controllers/site.controller.js";
import { ROUTES } from "../utils/routes.js";

const {
  SITE: { CREATE, GET_DETAIL, GET_ALL, UPDATE, DELETE, GET_SUPERVISOR_SITES, GET_SITE_TICKETSTATS },
} = ROUTES;
const router = express.Router();
import authMiddleware from "../middlewares/validateJWT.js";

// Routes for shift management
router.post(CREATE, authMiddleware, createSite);
router.put(UPDATE, authMiddleware, updateSite);
router.get(GET_ALL, authMiddleware, getAllSites);
router.delete(DELETE, authMiddleware, deleteSite);
router.get(GET_SUPERVISOR_SITES, authMiddleware, getSitesBySupervisorCode);
router.get(GET_SITE_TICKETSTATS, authMiddleware, getSiteDetailsAndTickets);

export default router;
