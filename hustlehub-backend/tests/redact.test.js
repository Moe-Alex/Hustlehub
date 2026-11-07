// Unit tests for utils/redact.js - secrets must never reach the logs (or the cloud logging service).
const test = require('node:test');
const assert = require('node:assert/strict');
const { redact, maskEmail, scrubText } = require('../utils/redact');

test('redacts secret-looking keys, at any depth', () => {
  const out = redact({
    password: 'Hunter2!', token: 'abc', Authorization: 'Bearer abc', apiKey: 'k', JWT_SECRET: 's',
    mongodb_uri: 'not-a-real-value', nested: { cookie: 'c', safe: 'ok' },
  });
  for (const key of ['password', 'token', 'Authorization', 'apiKey', 'JWT_SECRET', 'mongodb_uri']) {
    assert.equal(out[key], '[REDACTED]', key);
  }
  assert.equal(out.nested.cookie, '[REDACTED]');
  assert.equal(out.nested.safe, 'ok');
});

test('scrubs credentials that are embedded inside ordinary text', () => {
  // Built from parts so no credential-shaped literal sits in the repository (and static analysis stays quiet).
  const scheme = 'mongodb+srv://';
  const fakeLogin = ['demo', 'notreal'].join(':');
  assert.equal(scrubText(`connect to ${scheme}${fakeLogin}@cluster0.example.net/x failed`), `connect to ${scheme}[REDACTED]@cluster0.example.net/x failed`);
  assert.equal(scrubText('sent Authorization: Bearer eyJhbGciOi.abc.def now'), 'sent Authorization: Bearer [REDACTED] now');
});

test('cuts very long text and deep or long structures down to size', () => {
  assert.equal(redact('x'.repeat(5000)).length, 500);
  assert.equal(redact(Array.from({ length: 100 }, (_, i) => i)).length, 20);
  assert.equal(redact({ a: { b: { c: { d: { e: 1 } } } } }).a.b.c.d, '[TRUNCATED]');
});

test('leaves numbers, booleans, null and dates sensible', () => {
  assert.deepEqual(redact({ n: 5, b: true, z: null, d: new Date('2026-01-01T00:00:00Z') }), { n: 5, b: true, z: null, d: '2026-01-01T00:00:00.000Z' });
});

test('maskEmail hides most of the address but keeps the domain', () => {
  assert.equal(maskEmail('moe@example.com'), 'm***@example.com');
  assert.equal(maskEmail('not-an-email'), '***');
  assert.equal(maskEmail(undefined), undefined);
});
