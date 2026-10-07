// Transactions and freelancer income tracking.

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const config = require('../config/config');
const { round2 } = require('../utils/money');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { scopeFor } = require('./bookingController');

// GET /api/transactions - role-aware list (client payments, freelancer earnings, or everything for admins)
async function listTransactions(req, res, next) {
  try {
    const pagination = parsePagination(req.query, 20);
    const filter = scopeFor(req.user);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit)
        .populate('client', 'username').populate('freelancer', 'username'),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: transactions, pagination: buildPagination(pagination, total) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/transactions/income - the logged-in freelancer's income, estimated tax and per-gig breakdown
async function getIncomeSummary(req, res, next) {
  try {
    // Aggregation pipelines are not auto-cast, so the id must be converted to an ObjectId here.
    const freelancerId = new mongoose.Types.ObjectId(req.user.id);
    const match = { $match: { freelancer: freelancerId, status: 'completed' } };

    const [[totals], transactionCount, incomeByGig, countByGig] = await Promise.all([
      Transaction.aggregate([match, { $group: { _id: null, totalIncome: { $sum: '$amount' } } }]),
      Transaction.countDocuments({ freelancer: req.user.id, status: 'completed' }),
      Transaction.aggregate([match, { $group: { _id: { gig: '$gig', title: '$gigTitle' }, income: { $sum: '$amount' } } }]),
      Transaction.aggregate([match, { $group: { _id: '$gig', bookings: { $sum: 1 } } }]),
    ]);

    // Join the two small result sets, then show the ten best-earning gigs first.
    const bookingsPerGig = new Map(countByGig.map((row) => [String(row._id), row.bookings]));
    const byGig = incomeByGig
      .map((row) => ({
        gigId: row._id.gig,
        title: row._id.title,
        income: round2(row.income),
        bookings: bookingsPerGig.get(String(row._id.gig)) || 0,
      }))
      .sort((a, b) => b.income - a.income)
      .slice(0, 10);

    const totalIncome = round2(totals ? totals.totalIncome : 0);
    const estimatedTax = round2(totalIncome * config.estimatedTaxRate);

    return res.status(200).json({
      success: true,
      data: {
        currency: 'ZAR',
        totalIncome,
        transactionCount,
        estimatedTaxRate: config.estimatedTaxRate,
        estimatedTax,
        netIncome: round2(totalIncome - estimatedTax),
        byGig,
        note: 'Estimated tax uses a simple flat rate for illustration. It is not tax advice.',
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listTransactions, getIncomeSummary };
