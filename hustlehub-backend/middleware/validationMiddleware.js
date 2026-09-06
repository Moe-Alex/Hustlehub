// Validates and sanitises all incoming input before it reaches a controller, using express-validator (rejects bad fields, trims/escapes/normalises the rest).

const { body, validationResult } = require('express-validator');

const registerRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required.')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers and underscores.')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Password must contain at least one special character.'),

  body('role')
    .optional()
    .trim()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be either "client" or "freelancer".'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required.'),
];

// Runs after the rules above - returns a clean 400 with field-level messages if anything failed, otherwise passes through to the controller.
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
}

module.exports = { registerRules, loginRules, handleValidationErrors };