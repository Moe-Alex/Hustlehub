// Account lockout: after too many wrong passwords for one email, logins for that email are refused for a while,
// even if the correct password is then entered. This stops password guessing that is spread across many
// IP addresses, which the per-IP rate limiter (middleware/rateLimiters.js) cannot see.
// Settings: LOCKOUT_MAX_ATTEMPTS (default 5) and LOCKOUT_MINUTES (default 15) in .env.

const LoginAttempt = require('../models/LoginAttempt');
const config = require('../config/config');

const lockMs = () => config.lockout.minutes * 60 * 1000;

// Seconds left on an active lock, or 0 when the account is free to try.
async function secondsLocked(identifier) {
  const record = await LoginAttempt.findOne({ identifier });
  if (!record || !record.lockedUntil) return 0;
  return Math.max(0, Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000));
}

// Counts a failed attempt. Returns { locked, retryAfterSeconds } - locked is true on the attempt that trips the lock.
async function recordFailure(identifier) {
  const now = Date.now();
  const windowEnd = new Date(now + lockMs());
  // $inc is atomic, so two simultaneous wrong guesses are both counted.
  const record = await LoginAttempt.findOneAndUpdate(
    { identifier },
    { $inc: { failedCount: 1 }, $set: { expireAt: windowEnd } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const alreadyLocked = record.lockedUntil && record.lockedUntil.getTime() > now;
  if (record.failedCount >= config.lockout.maxAttempts && !alreadyLocked) {
    await LoginAttempt.updateOne({ identifier }, { $set: { lockedUntil: windowEnd, failedCount: 0, expireAt: windowEnd } });
    return { locked: true, retryAfterSeconds: Math.ceil(lockMs() / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

// A correct login wipes the counter.
async function clearFailures(identifier) {
  await LoginAttempt.deleteOne({ identifier });
}

module.exports = { secondsLocked, recordFailure, clearFailures };
