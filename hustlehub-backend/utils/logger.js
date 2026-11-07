// The logger the rest of the app uses. Settings come from config/config.js (see .env.example).
// Usage: logger.info('booking.created', { bookingId, amount })

const path = require('path');
const config = require('../config/config');
const { createLogger } = require('./structuredLogger');

const { logging } = config;

module.exports = createLogger({
  level: logging.level,
  toFile: logging.toFile,
  filePath: path.join(__dirname, '..', 'logs', 'events.log'),
  console: config.nodeEnv !== 'test', // automated test runs stay quiet
  pretty: !config.isProduction && !logging.json,
  loki: logging.loki.url ? logging.loki : undefined,
  labels: { app: 'hustlehub', env: logging.environment },
});
