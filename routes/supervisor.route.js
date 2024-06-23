import { Router } from "express";
import { settleParkingTickets, getParkingAssistants, getAllSettlementTickets, getSupervisorStats } from "../controllers/supervisor.controller.js"

const router = Router();

// Routes for user management
router.post('/supervisor/settle-tickets/:parkingAssistantID', settleParkingTickets);
router.get('/supervisor/parkings-assistants/:supervisorID', getParkingAssistants);
router.get('/supervisor/tickets/all/:supervisorID', getAllSettlementTickets);
router.get('/supervisor/stats/:supervisorID', getSupervisorStats);

// router.get('/users/:phone', validateJWT, getUserById);
// router.put('/users/:phone', updateUser);
// router.delete('/users/:phone', deleteUser);


export default router