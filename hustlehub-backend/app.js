// Configures the Express app (middleware + routes). Kept separate from server.js so it could be imported by automated tests later without needing a real running server.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const config = require('./config/config');

const app = express();

app.use(helmet()); // secure HTTP headers
app.use(cors());

// Body parsing, capped to reduce large-payload abuse.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev')); // HTTP request logging
}

// Health check - confirms the API/HTTPS is up before testing endpoints.
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running.' });
});

app.use('/api/auth', authRoutes);

// 404 + centralised error handling - must be registered last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;