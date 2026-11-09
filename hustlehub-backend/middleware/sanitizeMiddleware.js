// Sanitises every request body and query string before it reaches validation or a controller.
//   1. NoSQL injection: removes keys that start with "$" or contain "." (e.g. {"email": {"$gt": ""}}).
//   2. Scripting attacks (XSS): strips HTML tags and <script>/<style> blocks from every string.
// The frontend also escapes everything it renders, so this is defence in depth.

const xss = require('xss');

// Passwords are never altered - changing them would break login for passwords containing "<".
const SKIP_FIELDS = new Set(['password']);

const stripHtml = new xss.FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  escapeHtml: (text) => text, // tags are removed; React escapes plain text when rendering
});

// "__proto__", "constructor" and "prototype" are removed too: they can change how an object behaves (prototype pollution).
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isUnsafeKey = (key) => FORBIDDEN_KEYS.has(key) || key.startsWith('$') || key.includes('.');

// Builds a clean copy instead of editing the request object in place: unsafe keys are left out and strings are stripped.
function sanitizeValue(value) {
  if (typeof value === 'string') return stripHtml.process(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') return sanitizeObject(value);
  return value;
}

function sanitizeObject(source) {
  const entries = Object.entries(source)
    .filter(([key]) => !isUnsafeKey(key))
    .map(([key, value]) => [key, SKIP_FIELDS.has(key) ? value : sanitizeValue(value)]);
  return Object.fromEntries(entries);
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeValue(req.query);
  next();
}

module.exports = { sanitizeRequest };
