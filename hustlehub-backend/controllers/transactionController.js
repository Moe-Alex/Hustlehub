// Transactions and freelancer income tracking.

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { TAX_TABLES } = require('../config/taxTables');
const { calculateTax, taxYearOf, taxYearRange, taxYearMonths, TAX_TIME_ZONE } = require('../utils/tax');
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

// The tax year we are in now. If SARS tables for it have not been added to config/taxTables.js yet,
// the newest table we have is used so the page keeps working.
function currentTaxYear() {
  const known = Object.keys(TAX_TABLES).map(Number);
  const current = taxYearOf(new Date());
  // eslint-disable-next-line security/detect-object-injection -- keys are tax years (validated whole numbers) or month numbers, never free text
  return TAX_TABLES[current] ? current : Math.max(...known);
}

// GET /api/transactions/income - the logged-in freelancer's income for one tax year, an estimate of the tax
// owed on it (progressive SARS brackets, see utils/tax.js), a month-by-month series for charts and a per-gig breakdown.
// Optional query: ?taxYear=2027&ageGroup=under65&expenses=1500
// Only completed work counts as income, and it counts in the tax year in which it was completed.
async function getIncomeSummary(req, res, next) {
  try {
    const endYear = req.query.taxYear || currentTaxYear();
    const ageGroup = req.query.ageGroup || 'under65';
    const requestedExpenses = req.query.expenses || 0;
    const { start, end } = taxYearRange(endYear);

    // Aggregation pipelines are not auto-cast, so the id must be converted to an ObjectId here.
    const freelancerId = new mongoose.Types.ObjectId(req.user.id);
    const dateIncomeIsEarned = { $ifNull: ['$completedAt', '$createdAt'] }; // older records have no completedAt

    const [monthly, incomeByGig, pending] = await Promise.all([
      // Every completed payment, grouped by month (South African time), across all tax years.
      Transaction.aggregate([
        { $match: { freelancer: freelancerId, status: 'completed' } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: dateIncomeIsEarned, timezone: TAX_TIME_ZONE } },
          income: { $sum: '$amount' },
          bookings: { $sum: 1 },
        } },
      ]),
      // Completed payments in the chosen tax year, per gig.
      Transaction.aggregate([
        { $match: { freelancer: freelancerId, status: 'completed' } },
        { $addFields: { earnedAt: dateIncomeIsEarned } },
        { $match: { earnedAt: { $gte: start, $lt: end } } },
        { $group: { _id: { gig: '$gig', title: '$gigTitle' }, income: { $sum: '$amount' }, bookings: { $sum: 1 } } },
      ]),
      // Money from bookings that are not completed yet. It is shown but never counted as income.
      Transaction.aggregate([
        { $match: { freelancer: freelancerId, status: 'pending' } },
        { $group: { _id: null, amount: { $sum: '$amount' }, bookings: { $sum: 1 } } },
      ]),
    ]);

    const monthlyIncome = new Map(monthly.map((row) => [row._id, row]));
    const months = taxYearMonths(endYear).map(({ key, label }) => ({
      month: key,
      label,
      income: round2(monthlyIncome.has(key) ? monthlyIncome.get(key).income : 0),
    }));

    // Tax years that have income, plus the current one, so the page can offer a year selector.
    const yearsWithIncome = new Set(monthly.map((row) => {
      const [year, month] = row._id.split('-').map(Number);
      return month >= 3 ? year + 1 : year;
    }));
    yearsWithIncome.add(currentTaxYear());
    // eslint-disable-next-line security/detect-object-injection -- keys are tax years (validated whole numbers) or month numbers, never free text
    const availableTaxYears = [...yearsWithIncome].filter((year) => TAX_TABLES[year]).sort((a, b) => b - a)
      // eslint-disable-next-line security/detect-object-injection -- keys are tax years (validated whole numbers) or month numbers, never free text
      .map((year) => ({ endYear: year, label: TAX_TABLES[year].label }));

    const totalIncome = round2(months.reduce((sum, row) => sum + row.income, 0));
    const transactionCount = incomeByGig.reduce((sum, row) => sum + row.bookings, 0);

    // Business expenses can reduce taxable income, but never below zero.
    const expenses = round2(Math.min(requestedExpenses, totalIncome));
    const taxableIncome = round2(totalIncome - expenses);
    const tax = calculateTax({ taxableIncome, endYear, ageGroup });

    const byGig = incomeByGig
      .map((row) => ({ gigId: row._id.gig, title: row._id.title, income: round2(row.income), bookings: row.bookings }))
      .sort((a, b) => b.income - a.income)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        currency: 'ZAR',
        // eslint-disable-next-line security/detect-object-injection -- keys are tax years (validated whole numbers) or month numbers, never free text
        taxYear: { endYear, label: TAX_TABLES[endYear].label, start, end },
        availableTaxYears,
        assumptions: { ageGroup, expenses },
        totalIncome,
        transactionCount,
        pending: { amount: round2(pending[0] ? pending[0].amount : 0), bookings: pending[0] ? pending[0].bookings : 0 },
        taxableIncome,
        tax,
        estimatedTax: tax.estimatedTax,
        netIncome: round2(taxableIncome - tax.estimatedTax),
        months,
        byGig,
        note: 'This is an estimate for illustration based on SARS tax tables. It assumes your gig income is your only income and is not tax advice.',
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listTransactions, getIncomeSummary };
