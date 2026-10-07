// Bookings. A booking always creates a (simulated) transaction record so income can be tracked.

const crypto = require('crypto');
const Booking = require('../models/Booking');
const Gig = require('../models/Gig');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { ROLES } = require('../config/constants');

const makeReference = () => `TXN-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

// Each role only ever sees its own records: clients their purchases, freelancers their sales, admins everything.
function scopeFor(user) {
  if (user.role === ROLES.CLIENT) return { client: user.id };
  if (user.role === ROLES.FREELANCER) return { freelancer: user.id };
  return {};
}

// POST /api/bookings - clients only
async function createBooking(req, res, next) {
  try {
    const { gigId, notes } = req.body;

    const gig = await Gig.findById(gigId);
    if (!gig || !gig.isActive) {
      return res.status(404).json({ success: false, message: 'That gig is not available.' });
    }

    // The price always comes from the gig stored on the server, never from the request.
    const booking = await Booking.create({
      gig: gig._id,
      gigTitle: gig.title,
      client: req.user.id,
      freelancer: gig.freelancer,
      price: gig.price,
      notes: notes || '',
    });

    let transaction;
    try {
      transaction = await Transaction.create({
        booking: booking._id,
        gig: gig._id,
        gigTitle: gig.title,
        client: req.user.id,
        freelancer: gig.freelancer,
        amount: gig.price,
        reference: makeReference(),
      });
    } catch (err) {
      await Booking.deleteOne({ _id: booking._id }); // never leave a booking without its transaction
      throw err;
    }

    logger.info(`Booking ${booking.id} created by ${req.user.email}; transaction ${transaction.reference} for R${transaction.amount}`);
    return res.status(201).json({
      success: true,
      message: 'Booking confirmed. Payment was simulated - no real money moved.',
      data: { booking, transaction },
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings - role-aware list
async function listBookings(req, res, next) {
  try {
    const pagination = parsePagination(req.query, 20);
    const filter = scopeFor(req.user);

    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit)
        .populate('client', 'username').populate('freelancer', 'username'),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: bookings, pagination: buildPagination(pagination, total) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings/:id - someone else's booking looks exactly like a booking that does not exist
async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, ...scopeFor(req.user) })
      .populate('client', 'username').populate('freelancer', 'username');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/bookings/:id/complete - the freelancer who owns the booking only
async function completeBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, freelancer: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(409).json({ success: false, message: 'Only confirmed bookings can be marked as completed.' });
    }

    booking.status = 'completed';
    await booking.save();

    logger.info(`Booking ${booking.id} completed by ${req.user.email}`);
    return res.status(200).json({ success: true, message: 'Booking marked as completed.', data: booking });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createBooking, listBookings, getBooking, completeBooking, scopeFor };
