import { Router } from "express";
import { settleSupervisorTickets, getSupervisors, getAllSettlementTickets, getAccountantStats, getAllSettlementTicketsBySupervisor, getAccountantStatsBetweenTwoDates } from "../controllers/accountant.controller.js"

const router = Router();

// Routes for user management
router.post('/accountant/settle-tickets/:supervisorID', settleSupervisorTickets);
router.get('/accountant/supervisors', getSupervisors);
router.get('/accountant/tickets/settled/:accountantID', getAllSettlementTickets);
router.get('/accountant/tickets/supervisor/:supervisorID', getAllSettlementTicketsBySupervisor);
router.get('/accountant/stats/:accountantID', getAccountantStats);
router.get('/accountant/stats-by-date/:accountantID', getAccountantStatsBetweenTwoDates);


export default router    