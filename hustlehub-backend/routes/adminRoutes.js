// /api/admin - administrators only.

const express = require('express');

const { pageQueryRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { listUsers, getSummary } = require('../controllers/adminController');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect, requireRole(ROLES.ADMIN));

router.get('/users', pageQueryRules, handleValidationErrors, listUsers);
router.get('/summary', getSummary);

module.exports = router;
