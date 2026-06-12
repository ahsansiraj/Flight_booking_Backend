/*******************************************************************************
 * Commission Request Validators
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

const commissionValidators = {
  createRule: [
    body('ruleName')
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage('Rule name is required'),
    body('ruleCode')
      .trim()
      .notEmpty()
      .matches(/^[A-Z_]+$/)
      .withMessage('Rule code must be uppercase with underscores'),
    body('calculationType')
      .isIn(['PERCENTAGE', 'FLAT', 'TIERED'])
      .withMessage('Calculation type must be PERCENTAGE, FLAT, or TIERED'),
    body('commissionPercentage')
      .if(body('calculationType').equals('PERCENTAGE'))
      .isDecimal({ decimal_digits: '0,2' })
      .custom((value) => value > 0 && value <= 50)
      .withMessage('Commission percentage must be between 0 and 50'),
    body('flatAmount')
      .if(body('calculationType').equals('FLAT'))
      .isDecimal({ decimal_digits: '0,2' })
      .custom((value) => value > 0)
      .withMessage('Flat amount must be greater than 0'),
    body('agentTier')
      .optional()
      .isIn(['SILVER', 'GOLD', 'PLATINUM'])
      .withMessage('Invalid agent tier'),
    body('bookingType')
      .optional()
      .isIn(['FLIGHT', 'HOTEL', 'BUS'])
      .withMessage('Invalid booking type'),
    body('validFrom')
      .isISO8601()
      .withMessage('Valid from date is required'),
    body('validUntil')
      .optional()
      .isISO8601()
      .withMessage('Valid until must be a valid date'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Priority must be between 1 and 1000'),
    handleValidationErrors,
  ],

  requestPayout: [
    body('amount')
      .isDecimal({ decimal_digits: '1,2' })
      .custom((value) => value >= 500)
      .withMessage('Minimum payout amount is ₹500'),
    body('payoutMethod')
      .isIn(['BANK_TRANSFER', 'UPI'])
      .withMessage('Payout method must be BANK_TRANSFER or UPI'),
    body('bankAccountNumber')
      .if(body('payoutMethod').equals('BANK_TRANSFER'))
      .trim()
      .notEmpty()
      .withMessage('Bank account number is required'),
    body('bankIfsc')
      .if(body('payoutMethod').equals('BANK_TRANSFER'))
      .trim()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage('Invalid IFSC code format'),
    body('upiId')
      .if(body('payoutMethod').equals('UPI'))
      .trim()
      .isEmail()
      .withMessage('Invalid UPI ID format'),
    handleValidationErrors,
  ],

  approvePayout: [
    param('payoutId')
      .isInt({ min: 1 })
      .withMessage('Valid payout ID is required'),
    body('action')
      .isIn(['APPROVE', 'REJECT'])
      .withMessage('Action must be APPROVE or REJECT'),
    body('remarks')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Remarks max 500 characters'),
    handleValidationErrors,
  ],

  getCommissionReport: [
    query('fromDate')
      .optional()
      .isISO8601()
      .withMessage('From date must be valid'),
    query('toDate')
      .optional()
      .isISO8601()
      .withMessage('To date must be valid'),
    query('status')
      .optional()
      .isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'REVERSED'])
      .withMessage('Invalid status filter'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
};

module.exports = commissionValidators;