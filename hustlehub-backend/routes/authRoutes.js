// Route > middleware > controller wiring for everything under /api/auth.

const express = require('express');

const { registerRules, loginRules, handleValidationErrors } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const { registerUser, loginUser, logoutUser, getProfile } = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, registerRules, handleValidationErrors, registerUser);
router.post('/login', loginLimiter, loginRules, handleValidationErrors, loginUser);

// Protected routes - the JWT is required and validated.
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logoutUser); // ends the session on the server

module.exports = router;
