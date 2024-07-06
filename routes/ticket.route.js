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
  getVehicleTypeDetail
} from "../controllers/parkingTicket.controller.js";

import checkParkingAssistant from "../middlewares/checkParkingAssistant.js";
import upload from "../services/multer.config.js";

const router = express.Router();

router.post(
  "/parking-tickets/:folderName",
  checkParkingAssistant,
  upload.single("image"),
  createParkingTicket
);
router.post(
  "/ticket/generate-order",
  checkParkingAssistant,
  generatePaymentForTicket
);
router.post("/ticket/payment-status", updatePaymentStatusOnline);
router.get("/parking-tickets", getParkingTickets);
router.get("/parking-tickets/:query", getParkingTicketByQuery);
router.get("/parking-tickets/unsettled/:assistantId", getTicketsByAssistantId);
router.delete("/ticket/order/:id", deletePaymentOrderById);
router.get("/ticket/detail/:id", getVehicleTypeDetail);
// router.get('/parking-tickets/stats/:assistantId', getTicketsByAssistantId);

// Bellow two routes will not be used yet.
router.put("/parking-tickets/:id", updateParkingTicketById);
router.delete("/parking-tickets/:id", deleteParkingTicketById);

export default router;
