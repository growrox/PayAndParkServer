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

const router = express.Router();


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
  "/parking-tickets/uploadParkingTicket",
  checkParkingAssistant,
  upload.single("image"),
  uploadTicketImage
);

router.post(
  "/parking-tickets/:folderName",
  checkParkingAssistant,
  createParkingTicket
);

router.post(
  "/ticket/generate-order",
  checkParkingAssistant,
  generatePaymentForTicket
);
router.get("/admin/parking-tickets", getAllTickets);
router.post("/ticket/payment-status", updatePaymentStatusOnline);
router.get("/parking-tickets", getParkingTickets);
router.get("/parking-ticket/location", getTicketLocation);
router.get("/parking-tickets/:query", getParkingTicketByQuery);
router.get("/parking-tickets/unsettled/:assistantId", getTicketsByAssistantId);
router.delete("/ticket/order/:id", deletePaymentOrderById);
router.get("/ticket/detail/:id", getVehicleTypeDetail);
// router.get('/parking-tickets/stats/:assistantId', getTicketsByAssistantId);

router.delete('/parking-tickets/:filename', deleteTicketImage);

// Bellow two routes will not be used yet.
router.put("/parking-tickets/:id", updateParkingTicketById);
router.delete("/parking-tickets/:id", deleteParkingTicketById);

export default router;
