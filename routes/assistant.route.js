import express from 'express';
import {
     getTicketsStatsByAssistantId,
     getTickets,
     getGlobalTickets,
     getLifeTimeStatsByAssistantId
} from '../controllers/parkingAssistant.controller.js'
import { ROUTES } from '../utils/routes.js';
import authMiddleware from '../middlewares/validateJWT.js';

const {
     ASSISTANT: { STATS, LIFETIME_STATS, GET_TICKETS, GET_GLOBAL_TICKETS }
} = ROUTES;
const router = express.Router();

router.get(STATS, authMiddleware, getTicketsStatsByAssistantId);
router.get(LIFETIME_STATS, authMiddleware, getLifeTimeStatsByAssistantId);
router.get(GET_TICKETS, authMiddleware, getTickets);
router.get(GET_GLOBAL_TICKETS, authMiddleware, getGlobalTickets);


export default router;