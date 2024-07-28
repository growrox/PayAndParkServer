import { Router } from "express";
import { settleParkingTickets, getParkingAssistants, getAllSettlementTickets, getSupervisorStats, getAllSuperVisors } from "../controllers/supervisor.controller.js"
import { ROUTES } from "../utils/routes.js";

const router = Router();
const { SUPERVISOR: { GET_ALL_SUPERVISOR,GET_STATS,GET_ALL_SETTLE_TICKETS, GET_ASSISTANTS, SETTLE_TICKETS } }=ROUTES

// Routes for user management
router.post(SETTLE_TICKETS, settleParkingTickets);
router.get(GET_ASSISTANTS, getParkingAssistants);
router.get(GET_ALL_SETTLE_TICKETS, getAllSettlementTickets);
router.get(GET_STATS, getSupervisorStats);
router.get(GET_ALL_SUPERVISOR, getAllSuperVisors)

// router.get('/users/:phone', validateJWT, getUserById);
// router.put('/users/:phone', updateUser);
// router.delete('/users/:phone', deleteUser);


export default router