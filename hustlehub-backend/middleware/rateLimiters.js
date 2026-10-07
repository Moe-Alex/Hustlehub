// Rate limiters. Limits live in config/config.js. When a limit is exceeded the client gets a
// 429 with a clear message and how many seconds to wait (also sent in the standard Retry-After header).

const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

function createLimiter({ name, message, keyByUser = false, skipSuccessfulRequests = false }) {
  const { windowMs, max } = config.rateLimits[name];

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    // Per-user limiters run after authentication, so one user cannot use up another user's allowance.
    ...(keyByUser && { keyGenerator: (req) => `user:${req.user.id}` }),
    handler: (req, res) => {
      const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      logger.warn(`Rate limit hit (${name}) on ${req.method} ${req.originalUrl}`);
      res.status(429).json({ success: false, message, retryAfterSeconds });
    },
  });
}

module.exports = {
  // Applied to every /api request as a baseline.
  generalLimiter: createLimiter({
    name: 'general',
    message: 'Too many requests. Please slow down and try again shortly.',
  }),
  // Only failed logins count, so normal users are never locked out but password guessing is throttled.
  loginLimiter: createLimiter({
    name: 'login',
    message: 'Too many failed login attempts. Please try again later.',
    skipSuccessfulRequests: true,
  }),
  registerLimiter: createLimiter({
    name: 'register',
    message: 'Too many accounts created from this address. Please try again later.',
  }),
  bookingLimiter: createLimiter({
    name: 'booking',
    message: 'You are booking too quickly. Please wait before making another booking.',
    keyByUser: true,
  }),
  gigWriteLimiter: createLimiter({
    name: 'gigWrite',
    message: 'Too many gig changes in a short time. Please try again later.',
    keyByUser: true,
  }),
};
