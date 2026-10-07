// Route > middleware > controller wiring for everything under /api/auth.

const express = require('express');

const { registerRules, loginRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const { registerUser, loginUser, getProfile } = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, registerRules, handleValidationErrors, registerUser);
router.post('/login', loginLimiter, loginRules, handleValidationErrors, loginUser);

// Protected route - demonstrates JWT is required and validated beyond login.
router.get('/profile', protect, getProfile);

module.exports = router;
