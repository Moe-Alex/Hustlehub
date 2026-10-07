// /api/gigs - every route requires a valid JWT. Writes are restricted by role; ownership is checked in the controller.

const express = require('express');

const { gigRules, idParamRule, gigListQueryRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { gigWriteLimiter } = require('../middleware/rateLimiters');
const { listGigs, listMyGigs, getGig, createGig, updateGig, deleteGig } = require('../controllers/gigController');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

router.get('/', gigListQueryRules, handleValidationErrors, listGigs);
router.get('/mine', requireRole(ROLES.FREELANCER), listMyGigs); // must be declared before '/:id'
router.get('/:id', idParamRule, handleValidationErrors, getGig);

router.post('/', requireRole(ROLES.FREELANCER), gigWriteLimiter, gigRules, handleValidationErrors, createGig);
router.put('/:id', requireRole(ROLES.FREELANCER), gigWriteLimiter, idParamRule, gigRules, handleValidationErrors, updateGig);
router.delete('/:id', requireRole(ROLES.FREELANCER, ROLES.ADMIN), gigWriteLimiter, idParamRule, handleValidationErrors, deleteGig);

module.exports = router;
