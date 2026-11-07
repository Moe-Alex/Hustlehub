// Centralised error handling: 1. notFound - requests to routes that don't exist (404). 2. errorHandler - everything passed via next(err).
// Security rule: the client always gets a short, safe message. The full error (with stack trace) is only ever logged server-side.

const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Maps known error types to a status and a safe message. Anything unknown becomes a generic 500.
function describeError(err, res) {
  if (err.isCors) return { status: 403, message: 'Origin not allowed.' };
  if (err.type === 'entity.parse.failed') return { status: 400, message: 'Request body contains malformed JSON.' };
  if (err.type === 'entity.too.large') return { status: 413, message: 'Request body is too large.' };
  if (err.name === 'CastError') return { status: 400, message: 'Invalid identifier supplied.' };
  if (err.name === 'ValidationError') return { status: 400, message: 'Submitted data failed validation.' };
  if (err.code === 11000) return { status: 409, message: 'A record with those details already exists.' };
  // Errors from Express/body-parser that are marked safe to show (e.g. unsupported content type).
  if (err.expose && err.status >= 400 && err.status < 500) return { status: err.status, message: err.message };
  if (res.statusCode === 404) return { status: 404, message: err.message };
  return { status: 500, message: 'An unexpected error occurred. Please try again later.' };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, message } = describeError(err, res);

  // Full detail (including stack trace) - server-side log only.
  // Client mistakes (400s, 404s) are logged as warnings; real server faults (500) as errors.
  const log = status >= 500 ? logger.error : logger.warn;
  log('error.request', { requestId: req.id, method: req.method, path: req.baseUrl + req.path, status, errorName: err.name, message: err.message, stack: status >= 500 ? err.stack : undefined, userId: req.user ? req.user.id : undefined });

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
