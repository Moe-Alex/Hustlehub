// Handles registration and login. Input is already validated by validationMiddleware before it reaches here.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const config = require('../config/config');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

function generateToken(user) {
  // Payload stays minimal - never put passwords in a JWT, it's only base64 encoded, not encrypted.
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// POST /api/auth/register
async function registerUser(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    if (userModel.findByEmail(email)) {
      logger.warn(`Registration blocked - email already in use: ${email}`);
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }

    if (userModel.findByUsername(username)) {
      logger.warn(`Registration blocked - username already taken: ${username}`);
      return res.status(409).json({ success: false, message: 'That username is already taken.' });
    }

    // Never store plain-text passwords.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = userModel.createUser({ username, email, hashedPassword, role });

    logger.info(`New user registered: ${newUser.email} (role: ${newUser.role})`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = userModel.findByEmail(email);

    // Same generic message for "no such user" and "wrong password" -
    // stops attackers figuring out which emails are registered.
    const invalidCredentials = () =>
      res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (!user) {
      logger.warn(`Login attempt for non-existent email: ${email}`);
      return invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      logger.warn(`Failed login attempt for: ${email}`);
      return invalidCredentials();
    }

    const token = generateToken(user);
    logger.info(`Successful login: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/profile (protected route - proves JWT is checked beyond login)
function getProfile(req, res, next) {
  try {
    const user = userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      data: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerUser, loginUser, getProfile };