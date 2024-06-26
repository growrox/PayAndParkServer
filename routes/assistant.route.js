import express from 'express';
import {
     getTicketsStatsByAssistantId
} from '../controllers/parkingAssistant.controller.js'
import { ROUTES } from '../utils/routes.js';
import authMiddleware from '../middlewares/validateJWT.js';

const {
     ASSISTANT: { STATS }
} = ROUTES;
const router = express.Router();

router.get(STATS, authMiddleware, getTicketsStatsByAssistantId);

export default router;