// Centralised place to read environment variables, so the rest of the app never calls process.env directly.

const path = require('path');
require('dotenv').config();

// Refuse to start without the secrets the app depends on.
const missing = ['JWT_SECRET', 'MONGODB_URI'].filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[CONFIG ERROR] Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and set them.`);
  process.exit(1);
}

// A short secret makes signed tokens easier to brute-force.
if (process.env.JWT_SECRET.length < 32) {
  console.error('[CONFIG ERROR] JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toRate = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || parsed < 0 || parsed > 1 ? fallback : parsed;
};

const minutes = (n) => n * 60 * 1000;

module.exports = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME || undefined,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'https://localhost:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  estimatedTaxRate: toRate(process.env.ESTIMATED_TAX_RATE, 0.15),
  sslKeyPath: path.resolve(process.env.SSL_KEY_PATH || './certs/key.pem'),
  sslCertPath: path.resolve(process.env.SSL_CERT_PATH || './certs/cert.pem'),

  // Rate limits (requests allowed per window). Defaults suit production; tune via .env if needed.
  rateLimits: {
    general: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_GENERAL_MAX, 300) },
    login: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) },
    register: { windowMs: minutes(60), max: toInt(process.env.RATE_LIMIT_REGISTER_MAX, 20) },
    booking: { windowMs: minutes(10), max: toInt(process.env.RATE_LIMIT_BOOKING_MAX, 5) },
    gigWrite: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_GIG_WRITE_MAX, 30) },
  },
};
