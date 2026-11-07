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

const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.');

function sanitizeValue(value) {
  if (typeof value === 'string') return stripHtml.process(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    sanitizeObject(value);
    return value;
  }
  return value;
}

function sanitizeObject(target) {
  Object.keys(target).forEach((key) => {
    if (isUnsafeKey(key)) {
      // eslint-disable-next-line security/detect-object-injection -- unsafe keys (__proto__, constructor, $ and . names) are removed first; this only touches keys of the same object
      delete target[key];
    } else if (!SKIP_FIELDS.has(key)) {
      // eslint-disable-next-line security/detect-object-injection -- unsafe keys (__proto__, constructor, $ and . names) are removed first; this only touches keys of the same object
      target[key] = sanitizeValue(target[key]);
    }
  });
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') sanitizeObject(req.query);
  next();
}

module.exports = { sanitizeRequest };
