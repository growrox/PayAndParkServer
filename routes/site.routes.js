// routes/shiftRoutes.js

import express from "express";
import {
  createSite,
  getAllSites,
  updateSite,
  deleteSite,
  getSitesBySupervisorCode,
  getSiteDetailsAndTickets,
  getAllSitesBySupervisorCode,
} from "../controllers/site.controller.js";
import { ROUTES } from "../utils/routes.js";

const {
  SITE: {
    CREATE,
    GET_DETAIL,
    GET_ALL,
    UPDATE,
    DELETE,
    GET_PARKING_TICKET_BY_SITE_AND_SUPERVISOR,
    GET_SUPERVISOR_SITES,
    GET_SITE_TICKETSTATS,
    GET_SUPERVISOR_ALL_SITES,
  },
} = ROUTES;
const router = express.Router();
import authMiddleware from "../middlewares/validateJWT.js";

// Routes for shift management
router.post(CREATE, authMiddleware, createSite);
router.put(UPDATE, authMiddleware, updateSite);
router.get(GET_ALL, authMiddleware, getAllSites);
router.delete(DELETE, authMiddleware, deleteSite);
router.get(GET_SUPERVISOR_SITES, getSitesBySupervisorCode);
router.get(GET_SITE_TICKETSTATS, getSiteDetailsAndTickets);
router.get(GET_SUPERVISOR_ALL_SITES, getAllSitesBySupervisorCode);


export default router;
