import { Router } from "express";
import { settleSupervisorTickets, getSupervisors, getAllSettlementTickets, getAccountantStats } from "../controllers/accountant.controller.js"

const router = Router();

// Routes for user management
router.post('/accountant/settle-tickets/:accountantID', settleSupervisorTickets);
router.get('/accountant/supervisors', getSupervisors);
router.get('/accountant/tickets/all/:accountantID', getAllSettlementTickets);
router.get('/accountant/stats/:accountantID', getAccountantStats);


export default router    