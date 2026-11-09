// Makes log entries safe to store and to send to a third-party logging service:
//   - secrets (passwords, tokens, keys, cookies, connection strings) are replaced before anything is written
//   - long text is cut short so one request cannot flood the logs
//   - email addresses can be masked so logs show which account was targeted without exposing the full address

const SECRET_KEY = /pass(word|wd)?|secret|token|authorization|cookie|api[-_]?key|jwt|credential|mongodb_uri|connection/i;
const MAX_TEXT = 500;
const MAX_DEPTH = 4;

// "moe@example.com" -> "m***@example.com"
function maskEmail(email) {
  if (typeof email !== 'string') return undefined;
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

// Replaces credentials embedded in text, such as "mongodb+srv://user:pass@host" or "Bearer eyJ...".
function scrubText(text) {
  return text
    .replace(/([a-z][a-z0-9+.-]{0,30}:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .slice(0, MAX_TEXT);
}

function redact(value, depth = 0) {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));

  // Object.fromEntries defines each key as a plain own property, so a hostile key such as "__proto__" cannot change the prototype.
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : redact(inner, depth + 1)])
  );
}

module.exports = { redact, maskEmail, scrubText };
