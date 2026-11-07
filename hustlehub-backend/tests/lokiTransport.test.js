// Unit tests for the Grafana Loki transport, run against a small fake Loki server on this computer.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { LokiTransport, normaliseUrl } = require('../utils/lokiTransport');

// Starts a fake Loki. `script` is a list of status codes to answer with, in order (the last one repeats).
function fakeLoki(script = [204]) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      res.statusCode = script[Math.min(requests.length - 1, script.length - 1)];
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ requests, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) });
  }));
}

const entry = (over = {}) => ({ time: new Date('2026-11-07T10:00:00.123Z'), level: 'info', category: 'auth', line: '{"event":"auth.login.success"}', ...over });
const make = (url, extra = {}) => new LokiTransport({ url, user: '123456', token: 'glc_secret', labels: { app: 'hustlehub' }, flushIntervalMs: 60000, ...extra });

test('only accepts https URLs (http is allowed for localhost only) and adds the push path', () => {
  assert.equal(normaliseUrl('https://logs-prod.grafana.net'), 'https://logs-prod.grafana.net/loki/api/v1/push');
  assert.equal(normaliseUrl('https://logs-prod.grafana.net/loki/api/v1/push'), 'https://logs-prod.grafana.net/loki/api/v1/push');
  assert.equal(normaliseUrl('http://localhost:3100'), 'http://localhost:3100/loki/api/v1/push');
  assert.throws(() => normaliseUrl('http://logs.example.com'), /https/);
  assert.throws(() => normaliseUrl('ftp://logs.example.com'), /https/);
});

test('sends a correctly shaped, authenticated push request', async () => {
  const loki = await fakeLoki();
  const transport = make(loki.url);
  transport.push(entry());
  transport.push(entry({ level: 'warn', category: 'security' }));
  await transport.close();
  await loki.close();

  assert.equal(loki.requests.length, 1);
  const [req] = loki.requests;
  assert.equal(req.url, '/loki/api/v1/push');
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('123456:glc_secret').toString('base64')}`);
  assert.equal(req.body.streams.length, 2); // one stream per level/category pair
  const info = req.body.streams.find((s) => s.stream.level === 'info');
  assert.deepEqual(info.stream, { app: 'hustlehub', level: 'info', category: 'auth' });
  assert.equal(info.values[0][0], '1794045600123000000'); // nanoseconds since the epoch, as a string
  assert.equal(info.values[0][1], '{"event":"auth.login.success"}');
});

test('sends a full batch straight away, without waiting for the timer', async () => {
  const loki = await fakeLoki();
  const transport = make(loki.url, { batchSize: 3 });
  for (let i = 0; i < 3; i += 1) transport.push(entry());
  await transport.flush();
  await transport.close();
  await loki.close();
  assert.equal(loki.requests.length, 1);
  assert.equal(loki.requests[0].body.streams[0].values.length, 3);
});

test('retries after a server error and then succeeds', async () => {
  const loki = await fakeLoki([503, 204]);
  const problems = [];
  const transport = make(loki.url, { onError: (m) => problems.push(m) });
  transport.push(entry());
  await transport.flush(); // 503 -> kept for retry
  assert.equal(transport.queue.length, 1);
  await transport.flush(); // 204 -> delivered
  await transport.close();
  await loki.close();
  assert.equal(loki.requests.length, 2);
  assert.equal(transport.queue.length, 0);
  assert.match(problems[0], /503/);
});

test('gives up on a line after the maximum number of attempts', async () => {
  const loki = await fakeLoki([500]);
  const transport = make(loki.url, { maxAttempts: 2, onError: () => {} });
  transport.push(entry());
  await transport.flush();
  await transport.flush();
  await transport.flush();
  await transport.close();
  await loki.close();
  assert.equal(transport.queue.length, 0);
  assert.equal(loki.requests.length, 2);
});

test('drops lines the service rejects for good (wrong credentials) and says so', async () => {
  const loki = await fakeLoki([401]);
  const problems = [];
  const transport = make(loki.url, { onError: (m) => problems.push(m) });
  transport.push(entry());
  await transport.flush();
  await transport.close();
  await loki.close();
  assert.equal(transport.queue.length, 0);
  assert.equal(loki.requests.length, 1);
  assert.match(problems[0], /401.*LOKI_TOKEN/);
  assert.ok(!problems[0].includes('glc_secret'), 'error messages must not contain the token');
});

test('keeps the queue bounded and never throws when Loki is unreachable', async () => {
  const transport = make('http://127.0.0.1:1', { maxQueue: 5, batchSize: 1000, timeoutMs: 500, onError: () => {} });
  for (let i = 0; i < 12; i += 1) transport.push(entry());
  assert.equal(transport.queue.length, 5);
  assert.equal(transport.dropped, 7);
  await transport.flush(); // connection refused -> retry later, no exception
  await transport.close();
  assert.ok(transport.queue.length <= 5);
});
