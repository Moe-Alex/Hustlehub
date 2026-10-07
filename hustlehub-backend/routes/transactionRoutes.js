// /api/transactions - payment records and freelancer income.

const express = require('express');

const { pageQueryRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { listTransactions, getIncomeSummary } = require('../controllers/transactionController');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

router.get('/income', requireRole(ROLES.FREELANCER), getIncomeSummary); // must be declared before any '/:id'
router.get('/', pageQueryRules, handleValidationErrors, listTransactions);

module.exports = router;
