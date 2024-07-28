import express from "express";
import {
  createParkingTicket,
  getParkingTickets,
  getParkingTicketByQuery,
  updateParkingTicketById,
  deleteParkingTicketById,
  getTicketsByAssistantId,
  updatePaymentStatusOnline,
  generatePaymentForTicket,
  deletePaymentOrderById,
  getVehicleTypeDetail,
  uploadTicketImage,
  deleteTicketImage,
  getAllTickets,
  getTicketLocation
} from "../controllers/parkingTicket.controller.js";
import multer from "multer";
import path from "path";

import checkParkingAssistant from "../middlewares/checkParkingAssistant.js";
import { getTickets } from "../controllers/parkingAssistant.controller.js";
import { ROUTES } from "../utils/routes.js";

const router = express.Router();

const { PARKING_TICKETS: { GET_QUERY_TICKET, GET_TICKET_FOR_ASSISTANT, DELETE_PAYMENT_ORDER, GET_VEHICAL_TYPE_DETAILS, DELETE_TICEKT_IMAGE, UPDATE_TICKET_BY_ID, DELTE_TICEKT_BY_ID, GET_LOCATION, PAYMENT_STATUS, GET_TOCKET, GET_ALL_TICKETS, GENERATE_ORDER, CREATE_TICKET, UPLOAD_VEHICAL_IMAGE } } = ROUTES

const storage = multer.diskStorage({
  destination: 'images/tickets',
  filename: (req, file, cb) => {
    const { userId } = req.headers;
    console.log("req.headers", req.headers);
    console.log('adfasdf', req.body.assistantID);
    console.log("file.fieldname ", file.fieldname);
    cb(null, userId + '_' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, true);
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

router.post(
  UPLOAD_VEHICAL_IMAGE,
  checkParkingAssistant,
  upload.single("image"),
  uploadTicketImage
);

router.post(
  CREATE_TICKET,
  checkParkingAssistant,
  createParkingTicket
);

router.post(GENERATE_ORDER, checkParkingAssistant, generatePaymentForTicket);
router.get(GET_ALL_TICKETS, getAllTickets);
router.post(PAYMENT_STATUS, updatePaymentStatusOnline);
router.get(GET_TOCKET, getParkingTickets);
router.get(GET_LOCATION, getTicketLocation);
router.get(GET_QUERY_TICKET, getParkingTicketByQuery);
router.get(GET_TICKET_FOR_ASSISTANT, getTicketsByAssistantId);
router.delete(DELETE_PAYMENT_ORDER, deletePaymentOrderById);
router.get(GET_VEHICAL_TYPE_DETAILS, getVehicleTypeDetail);
// router.get('/parking-tickets/stats/:assistantId', getTicketsByAssistantId);

router.delete(DELETE_TICEKT_IMAGE, deleteTicketImage);

// Bellow two routes will not be used yet.
router.put(UPDATE_TICKET_BY_ID, updateParkingTicketById);
router.delete(DELTE_TICEKT_BY_ID, deleteParkingTicketById);

export default router;
