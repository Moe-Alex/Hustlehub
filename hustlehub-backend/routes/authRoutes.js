// Route > middleware > controller wiring for everything under /api/auth.

const express = require('express');
const rateLimit = require('express-rate-limit');

const { registerRules, loginRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { registerUser, loginUser, getProfile } = require('../controllers/authController');

const router = express.Router();

// Basic brute-force protection: limits repeated login attempts per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Slows down automated account-creation abuse.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many accounts created from this IP. Please try again later.' },
});

// Public routes
router.post('/register', registerLimiter, registerRules, handleValidationErrors, registerUser);
router.post('/login', loginLimiter, loginRules, handleValidationErrors, loginUser);

// Protected route - demonstrates JWT is required and validated beyond login.
router.get('/profile', protect, getProfile);

module.exports = router;