import express from 'express';
import {
     getTicketsStatsByAssistantId
} from '../controllers/parkingAssistant.controller.js'

const router = express.Router();

router.get('/parking-assistant/stats/:assistantId', getTicketsStatsByAssistantId);


export default router;