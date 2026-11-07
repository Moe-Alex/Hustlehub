// Centralised place to read environment variables, so the rest of the app never calls process.env directly.

const path = require('path');
require('dotenv').config();

// Refuse to start without the secrets the app depends on.
// eslint-disable-next-line security/detect-object-injection -- key comes from the fixed list on the line above, not from user input
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
  sslKeyPath: path.resolve(process.env.SSL_KEY_PATH || './certs/key.pem'),
  sslCertPath: path.resolve(process.env.SSL_CERT_PATH || './certs/cert.pem'),

  // How many reverse proxies (like nginx in Docker) sit in front of the API. Needed so rate limiting and logs see the
  // real visitor address instead of the proxy's. Leave at 0 when the API is reached directly.
  trustProxyHops: toInt(process.env.TRUST_PROXY_HOPS, 0),

  // Account lockout: this many wrong passwords for one email locks logins for that email for this many minutes.
  lockout: { maxAttempts: toInt(process.env.LOCKOUT_MAX_ATTEMPTS, 5), minutes: toInt(process.env.LOCKOUT_MINUTES, 15) },

  // Logging. Entries always go to the console and logs/events.log; they also go to Grafana Cloud Loki when
  // LOKI_URL, LOKI_USER and LOKI_TOKEN are set (see README, "Logging and monitoring").
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    toFile: process.env.LOG_TO_FILE !== 'false',
    json: process.env.LOG_FORMAT === 'json', // one JSON object per line on the console (always on in production)
    environment: process.env.LOG_ENVIRONMENT || process.env.NODE_ENV || 'development',
    loki: { url: process.env.LOKI_URL || '', user: process.env.LOKI_USER || '', token: process.env.LOKI_TOKEN || '' },
  },

  // Rate limits (requests allowed per window). Defaults suit production; tune via .env if needed.
  rateLimits: {
    general: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_GENERAL_MAX, 300) },
    login: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) },
    register: { windowMs: minutes(60), max: toInt(process.env.RATE_LIMIT_REGISTER_MAX, 20) },
    booking: { windowMs: minutes(10), max: toInt(process.env.RATE_LIMIT_BOOKING_MAX, 5) },
    gigWrite: { windowMs: minutes(15), max: toInt(process.env.RATE_LIMIT_GIG_WRITE_MAX, 30) },
  },
};
