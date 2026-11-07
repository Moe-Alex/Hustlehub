// Handles registration, login, logout and the profile. Input is already validated and sanitised before it reaches here.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/redact');
const { secondsLocked, recordFailure, clearFailures } = require('../utils/accountLockout');
const { ROLES } = require('../config/constants');
const { formatWaitMinutes } = require('../utils/wait');

const SALT_ROUNDS = 12;

// A real bcrypt hash of a throw-away value. Login compares against it when the email is unknown,
// so "unknown email" and "wrong password" take the same time and cannot be told apart.
const DUMMY_HASH = '$2a$12$Og9h8pnqwRF6tbhvgcq0o.p6XBr6vXgTUN2IeVZ/yBEuRvkH5xQ9y';

function generateToken(user) {
  // Payload stays minimal - never put passwords in a JWT, it's only base64 encoded, not encrypted.
  // "tv" is the token version: logging out raises the user's version and so ends every older token.
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, tv: user.tokenVersion || 0 },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn }
  );
}

// POST /api/auth/register
async function registerUser(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    if (await User.exists({ email })) {
      logger.warn('auth.register.blocked', { requestId: req.id, reason: 'email_in_use', email: maskEmail(email) });
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }

    if (await User.exists({ usernameLower: username.toLowerCase() })) {
      logger.warn('auth.register.blocked', { requestId: req.id, reason: 'username_taken' });
      return res.status(409).json({ success: false, message: 'That username is already taken.' });
    }

    // Never store plain text passwords.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await User.create({ username, email, password: hashedPassword, role: role || ROLES.CLIENT });

    logger.info('auth.register.success', { requestId: req.id, userId: newUser.id, role: newUser.role });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    // Locked accounts are refused before any password is checked, so a guesser learns nothing more by trying.
    const lockedFor = await secondsLocked(email);
    if (lockedFor > 0) {
      logger.warn('auth.login.blocked', { requestId: req.id, reason: 'account_locked', email: maskEmail(email), retryAfterSeconds: lockedFor });
      return res.set('Retry-After', String(lockedFor)).status(429).json({
        success: false,
        message: `Too many failed attempts for this account. It is locked for ${formatWaitMinutes(lockedFor)}.`,
        retryAfterSeconds: lockedFor,
      });
    }

    const user = await User.findOne({ email }).select('+password');

    // Same generic message for "no such user" and "wrong password" - stops attackers figuring out which emails are registered.
    const invalidCredentials = () => res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordMatches) {
      const failure = await recordFailure(email);
      logger.warn('auth.login.failure', { requestId: req.id, reason: user ? 'wrong_password' : 'unknown_email', email: maskEmail(email), ip: req.ip });
      if (failure.locked) {
        logger.warn('security.account.locked', { requestId: req.id, email: maskEmail(email), minutes: config.lockout.minutes });
      }
      return invalidCredentials();
    }

    await clearFailures(email);
    const token = generateToken(user);
    logger.info('auth.login.success', { requestId: req.id, userId: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/logout - ends the session on the server too, not just in the browser.
// Raising the token version makes every token issued so far invalid, including one that was stolen.
async function logoutUser(req, res, next) {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    logger.info('auth.logout', { requestId: req.id, userId: req.user.id, role: req.user.role });
    return res.status(200).json({ success: true, message: 'Logged out. Your sessions have ended.' });
  } catch (err) {
    return next(err);
  }
}

// GET /api/auth/profile (protected route - proves JWT is checked beyond login)
async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({
      success: true,
      data: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { registerUser, loginUser, logoutUser, getProfile };
