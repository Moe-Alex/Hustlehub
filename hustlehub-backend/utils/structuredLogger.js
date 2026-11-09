// Structured logger. Every entry is one JSON object with a timestamp, level, event name and details, so logs
// can be searched and charted ("show every auth.login.failure in the last hour").
//
// Where entries go:
//   1. the console (readable in development, JSON in production and containers)
//   2. logs/events.log as JSON lines (a local audit trail; switch off with LOG_TO_FILE=false)
//   3. Grafana Cloud Loki, when LOKI_URL, LOKI_USER and LOKI_TOKEN are set (cloud monitoring)
//
// Event names are "category.action", for example auth.login.failure or booking.created.

const fs = require('fs');
const path = require('path');
const { redact } = require('./redact');
const { LokiTransport } = require('./lokiTransport');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function createLogger({
  level = 'info', toFile = true, filePath, console: consoleOutput = true, pretty = false,
  loki, labels = {}, fetchImpl, stdout = console,
} = {}) {
  // eslint-disable-next-line security/detect-object-injection -- level is one of the fixed logger methods
  const threshold = LEVELS[level] || LEVELS.info;
  let fileReady = false;
  let fileQueue = Promise.resolve();
  if (toFile && filePath) {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- the log path is set by the server's own code, not by requests
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fileReady = true;
    } catch {
      fileReady = false; // logging must never stop the app from starting
    }
  }

  let lastTransportError = 0;
  const reportTransportError = (message) => {
    if (Date.now() - lastTransportError < 60000) return; // at most one warning a minute
    lastTransportError = Date.now();
    stdout.error(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', event: 'logging.cloud.problem', message }));
  };

  let transport = null;
  if (loki && loki.url) {
    try {
      transport = new LokiTransport({ ...loki, labels, fetchImpl, onError: reportTransportError });
    } catch (err) {
      reportTransportError(err.message);
    }
  }

  function write(entryLevel, event, fields = {}) {
    // eslint-disable-next-line security/detect-object-injection -- level is one of the fixed logger methods
    if (LEVELS[entryLevel] < threshold) return;

    const time = new Date();
    // Line breaks are removed from the event name so it can never forge an extra log line.
    const safeEvent = String(event).replace(/[\r\n\t]+/g, ' ');
    const category = safeEvent.split('.')[0];
    const entry = { ts: time.toISOString(), level: entryLevel, event: safeEvent, category, ...redact(fields) };
    const line = JSON.stringify(entry);

    if (consoleOutput) {
      // JSON.stringify already escapes line breaks; the replace makes sure a console line can never be split in two.
      const text = (pretty ? `[${entry.ts}] ${entryLevel.toUpperCase().padEnd(5)} ${safeEvent} ${JSON.stringify(redact(fields))}` : line).replace(/[\r\n]+/g, ' ');
      (entryLevel === 'error' ? stdout.error : stdout.log)(text);
    }
    if (fileReady) {
      // Writes are chained so lines always land in the order they happened (separate appendFile calls can overtake each other).
      // A failed write is ignored: a full disk must not break a request.
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- the log path is set by the server's own code, not by requests
      fileQueue = fileQueue.then(() => fs.promises.appendFile(filePath, `${line}\n`)).catch(() => {});
    }
    if (transport) transport.push({ time, level: entryLevel, category, line });
  }

  return {
    debug: (event, fields) => write('debug', event, fields),
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
    flush: () => (transport ? transport.flush() : Promise.resolve()),
    close: () => (transport ? transport.close() : Promise.resolve()),
    get cloudEnabled() { return Boolean(transport); },
  };
}

module.exports = { createLogger, LEVELS };
