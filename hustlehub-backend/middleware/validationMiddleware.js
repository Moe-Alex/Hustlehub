// Validates all incoming input before it reaches a controller, using express-validator.
// Every text field must be a real string first, so objects/arrays sent to bypass checks are rejected.

const { body, param, query, validationResult } = require('express-validator');
const { SELF_REGISTER_ROLES, GIG_CATEGORIES } = require('../config/constants');
const { TAX_TABLES, AGE_GROUPS } = require('../config/taxTables');

const registerRules = [
  body('username')
    .isString().withMessage('Username is required.').bail()
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers and underscores.')
    .escape(),

  body('email')
    .isString().withMessage('A valid email address is required.').bail()
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password is required.').bail()
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character.'),

  // Only client and freelancer may self-register. "admin" is rejected here.
  body('role')
    .optional()
    .isString().withMessage('Role must be either "client" or "freelancer".').bail()
    .trim()
    .isIn(SELF_REGISTER_ROLES).withMessage('Role must be either "client" or "freelancer".'),
];

const loginRules = [
  body('email')
    .isString().withMessage('A valid email address is required.').bail()
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password is required.').bail()
    .notEmpty().withMessage('Password is required.'),
];

const gigRules = [
  body('title')
    .isString().withMessage('Title is required.').bail()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters.'),

  body('description')
    .isString().withMessage('Description is required.').bail()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters.'),

  body('category')
    .isString().withMessage('Category is required.').bail()
    .isIn(GIG_CATEGORIES).withMessage(`Category must be one of: ${GIG_CATEGORIES.join(', ')}.`),

  body('price')
    .isFloat({ min: 1, max: 100000 }).withMessage('Price must be a number between R1 and R100 000.')
    .toFloat(),

  body('deliveryDays')
    .isInt({ min: 1, max: 90 }).withMessage('Delivery time must be a whole number of days between 1 and 90.')
    .toInt(),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false.')
    .toBoolean(),
];

const bookingRules = [
  body('gigId')
    .isString().withMessage('A valid gig is required.').bail()
    .isMongoId().withMessage('A valid gig is required.'),

  body('notes')
    .optional({ values: 'falsy' })
    .isString().withMessage('Notes must be text.').bail()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer.'),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid id.')];

const gigListQueryRules = [
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('page must be a positive whole number.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50.').toInt(),
  query('q').optional().isString().withMessage('Search text is invalid.').bail().trim().isLength({ max: 100 }).withMessage('Search text is too long.'),
  query('category').optional().isIn(GIG_CATEGORIES).withMessage('Unknown category.'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a number.').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a number.').toFloat(),
  query('sort').optional().isIn(['newest', 'price_asc', 'price_desc']).withMessage('Unknown sort option.'),
];

const pageQueryRules = [
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('page must be a positive whole number.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.').toInt(),
];

// Options for the income and tax estimate. All are optional; the defaults are the current tax year, under 65, no expenses.
const incomeQueryRules = [
  query('taxYear').optional().isIn(Object.keys(TAX_TABLES)).withMessage('Unknown tax year.').toInt(),
  query('ageGroup').optional().isIn(AGE_GROUPS).withMessage('Unknown age group.'),
  query('expenses').optional().isFloat({ min: 0, max: 100000000 }).withMessage('Expenses must be zero or more.').toFloat(),
];

// Runs after the rules above - returns a clean 400 with field-level messages if anything failed.
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  return next();
}

module.exports = {
  registerRules,
  loginRules,
  gigRules,
  bookingRules,
  idParamRule,
  gigListQueryRules,
  pageQueryRules,
  incomeQueryRules,
  handleValidationErrors,
};
