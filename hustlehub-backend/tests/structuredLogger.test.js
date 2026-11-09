// Unit tests for the structured logger: entry shape, levels, redaction, the local audit file and the cloud sink.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createLogger } = require('../utils/structuredLogger');

const capture = () => { const lines = []; return { lines, stdout: { log: (l) => lines.push(l), error: (l) => lines.push(l) } }; };

test('writes one JSON object per event with timestamp, level, event and category', () => {
  const { lines, stdout } = capture();
  const logger = createLogger({ toFile: false, stdout });
  logger.info('booking.created', { bookingId: 'b1', amount: 500 });
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'booking.created');
  assert.equal(entry.category, 'booking');
  assert.equal(entry.bookingId, 'b1');
  assert.equal(entry.amount, 500);
  assert.ok(!Number.isNaN(Date.parse(entry.ts)));
});

test('line breaks in an event name cannot forge a second log line', () => {
  const { lines, stdout } = capture();
  const logger = createLogger({ toFile: false, stdout, pretty: true });
  logger.info('auth.login\nFAKE info admin.login.success {}');
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes('\n'), 'the console text must stay on one line');
});

test('respects the minimum level', () => {
  const { lines, stdout } = capture();
  const logger = createLogger({ level: 'warn', toFile: false, stdout });
  logger.debug('a.b'); logger.info('a.b'); logger.warn('a.warn'); logger.error('a.error');
  assert.deepEqual(lines.map((l) => JSON.parse(l).level), ['warn', 'error']);
});

test('never logs passwords or tokens, whatever the caller passes', () => {
  const { lines, stdout } = capture();
  const logger = createLogger({ toFile: false, stdout });
  logger.info('auth.login.failure', { password: 'Hunter2!', token: 'eyJ.x.y', note: 'Bearer eyJabc.def.ghi' });
  assert.ok(!lines[0].includes('Hunter2!'));
  assert.ok(!lines[0].includes('eyJ'));
  assert.ok(lines[0].includes('[REDACTED]'));
});

test('appends JSON lines to the local audit file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-log-'));
  const filePath = path.join(dir, 'logs', 'events.log');
  const logger = createLogger({ console: false, filePath });
  logger.info('auth.login.success', { userId: 'u1' });
  logger.warn('auth.login.failure', { reason: 'wrong_password' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const written = fs.readFileSync(filePath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(written.map((e) => e.event), ['auth.login.success', 'auth.login.failure']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ships entries to Loki with app labels when cloud logging is configured', async () => {
  const sent = [];
  const fetchImpl = async (url, options) => { sent.push({ url, body: JSON.parse(options.body), auth: options.headers.Authorization }); return { ok: true, status: 204 }; };
  const logger = createLogger({
    console: false, toFile: false, fetchImpl,
    loki: { url: 'https://logs-prod.grafana.net', user: '1', token: 't', flushIntervalMs: 60000 },
    labels: { app: 'hustlehub', env: 'test' },
  });
  assert.equal(logger.cloudEnabled, true);
  logger.error('error.request', { status: 500 });
  await logger.close();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://logs-prod.grafana.net/loki/api/v1/push');
  assert.deepEqual(sent[0].body.streams[0].stream, { app: 'hustlehub', env: 'test', level: 'error', category: 'error' });
  assert.match(sent[0].body.streams[0].values[0][1], /"event":"error.request"/);
});

test('a bad cloud setting is reported but never stops the logger working', () => {
  const { lines, stdout } = capture();
  const logger = createLogger({ toFile: false, stdout, loki: { url: 'http://insecure.example.com', user: '1', token: 't' } });
  assert.equal(logger.cloudEnabled, false);
  assert.match(lines[0], /logging.cloud.problem/);
  logger.info('system.startup'); // still works
  assert.equal(lines.length, 2);
});
