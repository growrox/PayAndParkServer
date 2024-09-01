import { Router } from "express";
import { settleParkingTickets, getParkingAssistants, getAllSettlementTickets, getSupervisorStats, getAllSuperVisors, getLifeTimeStatsBySupervisorId } from "../controllers/supervisor.controller.js"
import { ROUTES } from "../utils/routes.js";

const router = Router();
const { SUPERVISOR: { GET_ALL_SUPERVISOR, GET_STATS, GET_ALL_SETTLE_TICKETS, GET_ASSISTANTS, SETTLE_TICKETS, GET_LIFETIME_STATS } } = ROUTES
import authMiddleware from "../middlewares/validateJWT.js";

// Routes for user management
router.post(SETTLE_TICKETS, authMiddleware, settleParkingTickets);
router.get(GET_ASSISTANTS, authMiddleware, getParkingAssistants);
router.get(GET_ALL_SETTLE_TICKETS, authMiddleware, getAllSettlementTickets);
router.get(GET_STATS, authMiddleware, getSupervisorStats);
router.get(GET_LIFETIME_STATS, authMiddleware, getLifeTimeStatsBySupervisorId);
router.get(GET_ALL_SUPERVISOR, authMiddleware, getAllSuperVisors);

// router.get('/users/:phone', validateJWT, getUserById);
// router.put('/users/:phone', updateUser);
// router.delete('/users/:phone', deleteUser);


export default router