// /api/bookings - clients book, freelancers and clients view their own,
// freelancers accept or reject requests and complete accepted work. Clients can never change a status.

const express = require('express');

const { bookingRules, idParamRule, pageQueryRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { bookingLimiter } = require('../middleware/rateLimiters');
const { createBooking, listBookings, getBooking, acceptBooking, rejectBooking, completeBooking } = require('../controllers/bookingController');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

router.post('/', requireRole(ROLES.CLIENT), bookingLimiter, bookingRules, handleValidationErrors, createBooking);
router.get('/', pageQueryRules, handleValidationErrors, listBookings);
router.get('/:id', idParamRule, handleValidationErrors, getBooking);
router.patch('/:id/accept', requireRole(ROLES.FREELANCER), idParamRule, handleValidationErrors, acceptBooking);
router.patch('/:id/reject', requireRole(ROLES.FREELANCER), idParamRule, handleValidationErrors, rejectBooking);
router.patch('/:id/complete', requireRole(ROLES.FREELANCER), idParamRule, handleValidationErrors, completeBooking);

module.exports = router;
