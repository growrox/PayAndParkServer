import express from 'express';
import {
     createParkingTicket,
     getParkingTickets,
     getParkingTicketByQuery,
     updateParkingTicketById,
     deleteParkingTicketById,
     getTicketsByAssistantId,
     updatePaymentStatusOnline,
     generatePaymentForTicket,
     deletePaymentOrderById
} from '../controllers/parkingTicket.controller.js';

import checkParkingAssistant from "../middlewares/checkParkingAssistant.js"

const router = express.Router();

router.post('/parking-tickets', checkParkingAssistant, createParkingTicket);
router.post('/ticket/generate-order', checkParkingAssistant, generatePaymentForTicket);
router.post('/ticket/payment-status', updatePaymentStatusOnline);
router.get('/parking-tickets', getParkingTickets);
router.get('/parking-tickets/:query', getParkingTicketByQuery);
router.get('/parking-tickets/unsettled/:assistantId', getTicketsByAssistantId);
router.delete('/ticket/order/:id', deletePaymentOrderById);
// router.get('/parking-tickets/stats/:assistantId', getTicketsByAssistantId);


// Bellow two routes will not be used yet.
router.put('/parking-tickets/:id', updateParkingTicketById);
router.delete('/parking-tickets/:id', deleteParkingTicketById);

export default router;