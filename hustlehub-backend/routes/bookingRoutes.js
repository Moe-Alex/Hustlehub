// /api/bookings - clients book, freelancers and clients view their own, freelancers complete.

const express = require('express');

const { bookingRules, idParamRule, pageQueryRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { bookingLimiter } = require('../middleware/rateLimiters');
const { createBooking, listBookings, getBooking, completeBooking } = require('../controllers/bookingController');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

router.post('/', requireRole(ROLES.CLIENT), bookingLimiter, bookingRules, handleValidationErrors, createBooking);
router.get('/', pageQueryRules, handleValidationErrors, listBookings);
router.get('/:id', idParamRule, handleValidationErrors, getBooking);
router.patch('/:id/complete', requireRole(ROLES.FREELANCER), idParamRule, handleValidationErrors, completeBooking);

module.exports = router;
