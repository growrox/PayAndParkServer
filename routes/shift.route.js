// routes/shiftRoutes.js

import express from 'express';
import { createShift, updateShift } from '../controllers/shift.contoller.js';
import { ROUTES } from '../utils/routes.js';

const { SHIFT: { CREATE_SHIFTS, UPDATE_SHIFT } } = ROUTES;
const router = express.Router();

// Routes for shift management
router.post(CREATE_SHIFTS, createShift);
router.put(UPDATE_SHIFT, updateShift);
// router.post(CLOCK_IN, clockIn);
// router.post(CLOCK_OUT, clockOut);

export default router;
