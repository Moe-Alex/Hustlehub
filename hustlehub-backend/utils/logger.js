// Small logging helper for key security events (registrations, logins,failed logins, server errors). Writes to the console and appends tologs/events.log for a persistent audit trail.

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'events.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`;

  console[level === 'error' ? 'error' : 'log'](line.trim());

  // Fire-and-forget - logging must never crash the request lifecycle.
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Failed to write to log file:', err.message);
  });
}

module.exports = {
  info: (message) => write('info', message),
  warn: (message) => write('warn', message),
  error: (message) => write('error', message),
};