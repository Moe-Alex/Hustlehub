// Configures the Express app (middleware + routes). Kept separate from server.js so it can be imported without starting a server.

const express = require('express');

const config = require('./config/config');
const authRoutes = require('./routes/authRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { helmetMiddleware, extraHeaders, corsMiddleware } = require('./middleware/securityHeaders');
const { sanitizeRequest } = require('./middleware/sanitizeMiddleware');
const { generalLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

app.disable('x-powered-by'); // do not tell visitors which framework is running

app.set('trust proxy', config.trustProxyHops); // see TRUST_PROXY_HOPS in .env.example

app.use(requestLogger); // request id + one structured log line per request
app.use(helmetMiddleware); // secure HTTP headers + Content Security Policy
app.use(extraHeaders);
app.use(corsMiddleware); // only the frontend origins may call the API from a browser

// The API only accepts JSON, capped at 10kb to reduce large-payload abuse.
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeRequest); // strips NoSQL operators and HTML from body and query

// Health check - confirms the API/HTTPS is up before testing endpoints.
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running.' });
});

app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// 404 + centralised error handling - must be registered last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
