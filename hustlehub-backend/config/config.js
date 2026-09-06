// Centralised place to read environment variables, so the rest of the app never calls process.env directly.

const path = require('path');
require('dotenv').config();

// Refuse to start if the JWT secret is missing - prevents the app from running with an insecure/undefined secret.
if (!process.env.JWT_SECRET) {
  console.error('[CONFIG ERROR] Missing JWT_SECRET in .env file.');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  sslKeyPath: path.resolve(process.env.SSL_KEY_PATH || './certs/key.pem'),
  sslCertPath: path.resolve(process.env.SSL_CERT_PATH || './certs/cert.pem'),
};