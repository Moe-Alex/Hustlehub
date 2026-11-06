// Admin-only oversight: user list and platform summary.

const User = require('../models/User');
const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const { round2 } = require('../utils/money');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { ROLES } = require('../config/constants');

// GET /api/admin/users
async function listUsers(req, res, next) {
  try {
    const pagination = parsePagination(req.query, 50);
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      User.countDocuments(),
    ]);
    return res.status(200).json({ success: true, data: users, pagination: buildPagination(pagination, total) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/admin/summary
async function getSummary(req, res, next) {
  try {
    const [clients, freelancers, admins, gigs, bookings, transactionCount, volume] = await Promise.all([
      User.countDocuments({ role: ROLES.CLIENT }),
      User.countDocuments({ role: ROLES.FREELANCER }),
      User.countDocuments({ role: ROLES.ADMIN }),
      Gig.countDocuments(),
      Booking.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: { clients, freelancers, admins },
        gigs,
        bookings,
        transactions: { count: transactionCount, totalValue: round2(volume[0] ? volume[0].total : 0) },
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers, getSummary };
