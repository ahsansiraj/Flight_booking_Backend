/*******************************************************************************
 * Global Error Handler Middleware
 * Catches all errors and returns standardized response
 ******************************************************************************/

const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Duplicate key error (SQL Server specific)
  if (err.number === 2627) {
    err.message = 'Duplicate entry';
    err.statusCode = 409;
  }

  // Foreign key constraint error
  if (err.number === 547) {
    err.message = 'Invalid reference';
    err.statusCode = 400;
  }

  // Log error
  logger.error(`[${err.statusCode}] ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.user_id,
  });

  // Send response
  return ResponseHandler.error(
    res,
    err.message,
    err.statusCode,
    process.env.NODE_ENV === 'development' ? err : null
  );
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
const notFound = (req, res) => {
  logger.warn(`Route not found: ${req.path}`);
  ResponseHandler.notFound(res, `Route ${req.path} not found`);
};

module.exports = {
  ErrorHandler,
  globalErrorHandler,
  asyncHandler,
  notFound,
};