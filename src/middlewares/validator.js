/*******************************************************************************
 * Request Validation Middleware
 * Uses express-validator for input validation
 ******************************************************************************/

const { body, query, param, validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
    return ResponseHandler.badRequest(
      res,
      'Validation error',
      400,
      errors.array()
    );
  }

  next();
};

// Custom validators
const validators = {
  // Email validation
  email: body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  // Password validation (min 8 chars, 1 uppercase, 1 number, 1 special char)
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, number, and special character'),

  // Numeric ID validation
  numericId: param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID format'),

  // UUID validation
  uuid: param('id')
    .isUUID()
    .withMessage('Invalid UUID format'),

  // Amount validation (for financial)
  amount: body('amount')
    .isDecimal({ decimal_digits: '1,2' })
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),

  // Phone validation (India format)
  phone: body('phone')
    .matches(/^(\+91)?[6-9]\d{9}$/)
    .withMessage('Invalid phone number'),

  // URL validation
  url: body('url')
    .isURL()
    .withMessage('Invalid URL'),

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

module.exports = {
  validators,
  handleValidationErrors,
};