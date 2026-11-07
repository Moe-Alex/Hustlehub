// Gives every request an id (returned in the X-Request-Id header and written on every log line about it)
// and logs one "http.request" event when the response finishes: method, route, status, time taken and who asked.
// The id lets support trace one user's problem across the logs. The health check is skipped to keep logs useful.

const crypto = require('crypto');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.originalUrl === '/api/health') return;
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    // eslint-disable-next-line security/detect-object-injection -- level is one of three fixed strings chosen on the line above
    logger[level]('http.request', {
      requestId: req.id,
      method: req.method,
      // The route pattern (/api/gigs/:id) keeps one chart line per endpoint instead of one per record id.
      route: req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl || 'unmatched',
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user ? req.user.id : undefined,
    });
  });
  next();
}

module.exports = { requestLogger };
