import { Router } from "express";
import { settleSupervisorTickets, getSupervisors, getAllSettlementTickets, getAccountantStats, getAllSettlementTicketsBySupervisor, getAccountantStatsBetweenTwoDates } from "../controllers/accountant.controller.js"
import { ROUTES } from "../utils/routes.js";
const router = Router();
import authMiddleware from "../middlewares/validateJWT.js";

const { ACCOUNTANT: { GET_STATS_BY_DATE, GET_STATS, SETTLE_SUPERVISOR_TICKET, GET_SUPERVISOR, GET_ALL_SETTLE_TICKETS, GET_SUPERVISOR_SETTLE_TICKETS } } = ROUTES

// Routes for user management
router.post(SETTLE_SUPERVISOR_TICKET, authMiddleware, settleSupervisorTickets);
router.get(GET_SUPERVISOR, authMiddleware, getSupervisors);
router.get(GET_ALL_SETTLE_TICKETS, authMiddleware, getAllSettlementTickets);
router.get(GET_SUPERVISOR_SETTLE_TICKETS, authMiddleware, getAllSettlementTicketsBySupervisor);
router.get(GET_STATS, authMiddleware, getAccountantStats);
router.get(GET_STATS_BY_DATE, authMiddleware, getAccountantStatsBetweenTwoDates);


export default router    