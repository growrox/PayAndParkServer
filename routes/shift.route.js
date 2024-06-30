// routes/shiftRoutes.js

import express from 'express';
import { createShift, updateShift, getShift } from '../controllers/shift.contoller.js';
import { ROUTES } from '../utils/routes.js';

const { SHIFT: { CREATE_SHIFTS, UPDATE_SHIFT, GET_SHIFT } } = ROUTES;
const router = express.Router();

// Routes for shift management
router.post(CREATE_SHIFTS, createShift);
router.put(UPDATE_SHIFT, updateShift);
router.get(GET_SHIFT, getShift);

export default router;
