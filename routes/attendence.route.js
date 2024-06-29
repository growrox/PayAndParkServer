// routes/shiftRoutes.js

import express from 'express';
import { clockIn, clockOut } from '../controllers/attendance.controller.js';
import { ROUTES } from '../utils/routes.js';

const { ATTENDENCE: { CLOCK_IN, CLOCK_OUT } } = ROUTES;
const router = express.Router();

// Routes for attendence management
router.get(CLOCK_IN, clockIn);
router.put(CLOCK_OUT, clockOut);

export default router;
