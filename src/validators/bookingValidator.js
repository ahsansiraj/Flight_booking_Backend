/*******************************************************************************
 * Booking Request Validators
 ******************************************************************************/

const { body, param, query, validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ResponseHandler.badRequest(res, 'Validation error', 400, errors.array());
  }
  next();
};

const bookingValidators = {
  searchFlight: [
    query('origin')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 3 })
      .withMessage('Origin must be a valid 3-letter airport code (e.g., DEL)'),
    query('destination')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 3 })
      .withMessage('Destination must be a valid 3-letter airport code'),
    query('departureDate')
      .trim()
      .notEmpty()
      .isISO8601()
      .withMessage('Departure date must be a valid date (YYYY-MM-DD)')
      .custom((value) => {
        const date = new Date(value);
        if (date < new Date()) {
          throw new Error('Departure date cannot be in the past');
        }
        return true;
      }),
    query('returnDate')
      .optional()
      .isISO8601()
      .withMessage('Return date must be a valid date'),
    query('adults')
      .optional()
      .isInt({ min: 1, max: 9 })
      .withMessage('Adults must be between 1 and 9'),
    query('children')
      .optional()
      .isInt({ min: 0, max: 8 })
      .withMessage('Children must be between 0 and 8'),
    query('infants')
      .optional()
      .isInt({ min: 0, max: 2 })
      .withMessage('Infants must be between 0 and 2'),
    query('cabinClass')
      .optional()
      .isIn(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
      .withMessage('Invalid cabin class'),
    handleValidationErrors,
  ],

  createBooking: [
    body('flightId')
      .trim()
      .notEmpty()
      .withMessage('Flight ID is required'),
    body('customerId')
      .isInt({ min: 1 })
      .withMessage('Valid customer ID is required'),
    body('travelers')
      .isArray({ min: 1 })
      .withMessage('At least one traveler is required'),
    body('travelers.*.firstName')
      .trim()
      .notEmpty()
      .withMessage('Traveler first name is required'),
    body('travelers.*.lastName')
      .trim()
      .notEmpty()
      .withMessage('Traveler last name is required'),
    body('travelers.*.dateOfBirth')
      .isISO8601()
      .withMessage('Valid date of birth is required'),
    body('travelers.*.gender')
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be M, F, or O'),
    body('travelers.*.documentType')
      .isIn(['PASSPORT', 'AADHAAR', 'PAN', 'DRIVING_LICENSE'])
      .withMessage('Valid document type is required'),
    body('travelers.*.documentNumber')
      .trim()
      .notEmpty()
      .withMessage('Document number is required'),
    body('contactEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('contactPhone')
      .trim()
      .notEmpty()
      .withMessage('Contact phone is required'),
    handleValidationErrors,
  ],

  getBooking: [
    param('bookingReference')
      .trim()
      .notEmpty()
      .matches(/^BKG\d{16}$/)
      .withMessage('Invalid booking reference format'),
    handleValidationErrors,
  ],

  cancelBooking: [
    param('bookingId')
      .isInt({ min: 1 })
      .withMessage('Valid booking ID is required'),
    body('reason')
      .trim()
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason is required (max 500 chars)'),
    handleValidationErrors,
  ],

  getBookings: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['INITIATED', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'FAILED'])
      .withMessage('Invalid status filter'),
    query('fromDate')
      .optional()
      .isISO8601()
      .withMessage('From date must be valid'),
    query('toDate')
      .optional()
      .isISO8601()
      .withMessage('To date must be valid'),
    handleValidationErrors,
  ],
};

module.exports = bookingValidators;