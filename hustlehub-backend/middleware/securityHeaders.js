// Security headers (Helmet + Content Security Policy) and the CORS allow-list.

const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/config');

// This API only ever returns JSON, so the Content Security Policy blocks everything:
// no scripts, styles, images, frames, forms or <base> tags may ever be loaded from an API response.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  // The React app lives on another origin, so the API must allow cross-origin reads.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // HSTS is only sent in production: browsers remember it per host, which would break other localhost projects.
  hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
});

// Extra headers Helmet does not set.
function extraHeaders(req, res, next) {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cache-Control', 'no-store'); // authenticated JSON must never be cached
  next();
}

// Only the configured frontend origins may call the API from a browser.
// Requests with no Origin header (Postman, curl, same-origin proxy) are not browser cross-origin calls.
const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin not allowed');
    error.isCors = true;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

module.exports = { helmetMiddleware, extraHeaders, corsMiddleware };
