// Failed-login counter for one login identifier (the email typed on the login form), used to lock an account
// that is being guessed at. It is keyed on what was typed, NOT on whether the account exists, so an attacker
// cannot use "locked" versus "not locked" to find out which emails are registered. Records delete themselves
// (MongoDB TTL index on expireAt), so a lock always ends and no old attempts are kept.

const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true, lowercase: true, trim: true },
  failedCount: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  expireAt: { type: Date, required: true },
});

loginAttemptSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
