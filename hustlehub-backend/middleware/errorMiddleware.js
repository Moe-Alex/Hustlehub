// Centralised error handling: 1. notFound - catches requests to routes that don't exist (404). 2. errorHandler - catches everything passed via next(err)
// Security rule: the client always gets a short, safe, generic message.
// The full error (with stack trace) is only ever logged server-side.

const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Full detail (including stack trace) - server-side log only.
  logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);

  // Only ever send a safe, generic message to the client - never a stack trace, file path, or config value.
  const safeMessage =
    statusCode === 404
      ? err.message
      : statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Something went wrong.';

  res.status(statusCode).json({ success: false, message: safeMessage });
}

module.exports = { notFound, errorHandler };