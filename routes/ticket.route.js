import express from "express";
import {
  createParkingTicket,
  getParkingTickets,
  getParkingTicketByQuery,
  getTicketsByAssistantId,
  updatePaymentStatusOnline,
  generatePaymentForTicket,
  deletePaymentOrderById,
  getVehicleTypeDetail,
  uploadTicketImage,
  deleteTicketImage,
  getAllTickets,
  getTicketLocation,
  getTicketByVehicleNumber,
  getTicketTotalsByPaymentMode,
  moveTicketToDeleted,
  restoreTicketFromDeleted,
  getAllDeletedTickets
} from "../controllers/parkingTicket.controller.js";
import multer from "multer";
import path from "path";

import checkParkingAssistant from "../middlewares/checkParkingAssistant.js";
import {
  getParkingTicketsByDateRange,
  getTickets,
} from "../controllers/parkingAssistant.controller.js";
import { ROUTES } from "../utils/routes.js";
import authMiddleware from "../middlewares/validateJWT.js";

const router = express.Router();

const { PARKING_TICKETS: {
  GET_QUERY_TICKET,
  GET_TICKET_FOR_ASSISTANT,
  DELETE_PAYMENT_ORDER,
  GET_VEHICAL_TYPE_DETAILS,
  DELETE_TICEKT_IMAGE,
  GET_LOCATION,
  PAYMENT_STATUS,
  GET_TOCKET,
  GET_ALL_TICKETS,
  GENERATE_ORDER,
  CREATE_TICKET,
  GET_PREVIOUS_TICKET_DETAILS,
  UPLOAD_VEHICAL_IMAGE,
  GET_PARKING_TICKETS_IN_DATE_RANGE,
  DELTE_TICEKT_BY_ID,
  RESTORE_TICEKT_BY_ID,
  GET_ALL_DELETED_TICKETS,
  GET_ALL_TICKETS_AMOUNT_TOTAL
} } = ROUTES

const storage = multer.diskStorage({
  destination: "images/tickets",
  filename: (req, file, cb) => {
    const { userId } = req.headers;
    console.log("req.headers", req.headers);
    console.log("adfasdf", req.body.assistantID);
    console.log("file.fieldname ", file.fieldname);
    cb(null, userId + "_" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image") {
      cb(null, true);
    } else {
      cb(new Error("Unexpected field"));
    }
  },
});

router.post(
  UPLOAD_VEHICAL_IMAGE,
  checkParkingAssistant,
  upload.single("image"),
  uploadTicketImage
);

router.post(CREATE_TICKET, checkParkingAssistant, createParkingTicket);
router.post(
  GENERATE_ORDER,
  authMiddleware,
  checkParkingAssistant,
  generatePaymentForTicket
);
router.post(GET_ALL_TICKETS, authMiddleware, getAllTickets);
router.get(GET_ALL_DELETED_TICKETS, getAllDeletedTickets);
router.post(GET_ALL_TICKETS_AMOUNT_TOTAL, authMiddleware, getTicketTotalsByPaymentMode);
router.post(PAYMENT_STATUS, authMiddleware, updatePaymentStatusOnline);
router.get(GET_TOCKET, authMiddleware, getParkingTickets);
router.get(GET_LOCATION, authMiddleware, getTicketLocation);
router.get(GET_QUERY_TICKET, authMiddleware, getParkingTicketByQuery);
router.get(GET_TICKET_FOR_ASSISTANT, authMiddleware, getTicketsByAssistantId);
router.delete(DELETE_PAYMENT_ORDER, authMiddleware, deletePaymentOrderById);
router.get(GET_VEHICAL_TYPE_DETAILS, authMiddleware, getVehicleTypeDetail);
router.get(GET_PREVIOUS_TICKET_DETAILS, authMiddleware, getTicketByVehicleNumber);
router.get(GET_PARKING_TICKETS_IN_DATE_RANGE, authMiddleware, getParkingTicketsByDateRange)
// router.get('/parking-tickets/stats/:assistantId', getTicketsByAssistantId);

router.delete(DELETE_TICEKT_IMAGE, authMiddleware, deleteTicketImage);

// Bellow two routes will not be used yet.
router.delete(DELTE_TICEKT_BY_ID, authMiddleware, moveTicketToDeleted);
router.get(RESTORE_TICEKT_BY_ID, authMiddleware, restoreTicketFromDeleted);

export default router;
