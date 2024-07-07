import express from 'express';
import {
     getTicketsStatsByAssistantId,
     getTickets
} from '../controllers/parkingAssistant.controller.js'
import { ROUTES } from '../utils/routes.js';
import authMiddleware from '../middlewares/validateJWT.js';

const {
     ASSISTANT: { STATS, GET_TICKETS }
} = ROUTES;
const router = express.Router();

router.get(STATS, authMiddleware, getTicketsStatsByAssistantId);
router.get(GET_TICKETS, authMiddleware, getTickets);

export default router;