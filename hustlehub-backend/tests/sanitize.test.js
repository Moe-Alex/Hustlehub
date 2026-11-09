// Unit tests for the request sanitiser: NoSQL operators, prototype pollution and HTML are removed before any controller runs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeRequest } = require('../middleware/sanitizeMiddleware');

function run(body, query = {}) {
  const req = { body, query };
  let called = false;
  sanitizeRequest(req, {}, () => { called = true; });
  assert.equal(called, true, 'next() must be called');
  return req;
}

test('removes keys that start with $ or contain a dot (NoSQL operators)', () => {
  const { body } = run({ email: { $gt: '' }, 'a.b': 1, name: 'Ann' });
  assert.deepEqual(body, { email: {}, name: 'Ann' });
});

test('removes __proto__, constructor and prototype keys (prototype pollution)', () => {
  const body = JSON.parse('{"name":"x","__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"nested":{"prototype":1,"ok":2}}');
  const result = run(body).body;
  assert.deepEqual(Object.keys(result).sort(), ['name', 'nested']);
  assert.deepEqual(result.nested, { ok: 2 });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal({}.isAdmin, undefined, 'the global Object prototype must be untouched');
});

test('strips HTML and script blocks from strings but leaves passwords alone', () => {
  const { body } = run({ bio: 'Hi <b>there</b><script>alert(1)</script>', password: 'a<b>c' });
  assert.equal(body.bio, 'Hi there');
  assert.equal(body.password, 'a<b>c');
});

test('cleans the query string and arrays too', () => {
  const { query } = run({}, { tags: ['<i>x</i>', 'y'], $where: '1' });
  assert.deepEqual(query, { tags: ['x', 'y'] });
});
