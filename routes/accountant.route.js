import { Router } from "express";
import { settleSupervisorTickets, getSupervisors, getAllSettlementTickets, getAccountantStats, getAllSettlementTicketsBySupervisor, getAccountantStatsBetweenTwoDates } from "../controllers/accountant.controller.js"
import { ROUTES } from "../utils/routes.js";
const router = Router();

const { ACCOUNTANT: { GET_STATS_BY_DATE,GET_STATS, SETTLE_SUPERVISOR_TICKET, GET_SUPERVISOR, GET_ALL_SETTLE_TICKETS, GET_SUPERVISOR_SETTLE_TICKETS }} = ROUTES

// Routes for user management
router.post(SETTLE_SUPERVISOR_TICKET, settleSupervisorTickets);
router.get(GET_SUPERVISOR, getSupervisors);
router.get(GET_ALL_SETTLE_TICKETS, getAllSettlementTickets);
router.get(GET_SUPERVISOR_SETTLE_TICKETS, getAllSettlementTicketsBySupervisor);
router.get(GET_STATS, getAccountantStats);
router.get(GET_STATS_BY_DATE, getAccountantStatsBetweenTwoDates);


export default router    