// routes/shiftRoutes.js

import express from 'express';
import { createShift, updateShift, getShift } from '../controllers/shift.contoller.js';
import { ROUTES } from '../utils/routes.js';

const { SHIFT: { CREATE_SHIFTS, UPDATE_SHIFT, GET_SHIFT } } = ROUTES;
const router = express.Router();
import authMiddleware from '../middlewares/validateJWT.js';

// Routes for shift management
router.post(CREATE_SHIFTS, authMiddleware, createShift);
router.put(UPDATE_SHIFT, authMiddleware, updateShift);
router.get(GET_SHIFT, authMiddleware, getShift);

export default router;
