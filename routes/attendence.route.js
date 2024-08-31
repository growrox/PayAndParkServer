// routes/shiftRoutes.js

import express from 'express';
import { clockIn, clockOut, getAttendanceByMonth, updateUserAttendance } from '../controllers/attendance.controller.js';
import { ROUTES } from '../utils/routes.js';

const { ATTENDENCE: { CLOCK_IN, CLOCK_OUT, UPDATE_ATTENDANCE, GET_ATTENDANCE } } = ROUTES;
const router = express.Router();
import authMiddleware from '../middlewares/validateJWT.js';

// Routes for attendence management
router.get(CLOCK_IN, authMiddleware, clockIn);
router.put(CLOCK_OUT, authMiddleware, clockOut);
router.patch(UPDATE_ATTENDANCE, authMiddleware, updateUserAttendance);
router.get(GET_ATTENDANCE, authMiddleware, getAttendanceByMonth);

// attendanceId

export default router;
