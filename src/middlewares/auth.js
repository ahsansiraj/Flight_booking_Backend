/*******************************************************************************
 * Authentication Middleware
 * Validates JWT token and extracts user information
 ******************************************************************************/

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');
const encryption = require('../utils/encryption');

module.exports = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return ResponseHandler.unauthorized(res, 'No token provided');
      }

      const decoded = encryption.verifyAccessToken(token);
      req.user = decoded;
      req.userId = decoded.user_id;
      req.tenantId = decoded.tenant_id;

      logger.debug(`User authenticated: ${decoded.email}`);
      next();
    } catch (error) {
      logger.warn(`Authentication failed: ${error.message}`);
      return ResponseHandler.unauthorized(res, 'Invalid or expired token');
    }
  },

  // Verify refresh token
  verifyRefreshToken: (req, res, next) => {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;

      if (!token) {
        return ResponseHandler.unauthorized(res, 'No refresh token provided');
      }

      const decoded = encryption.verifyRefreshToken(token);
      req.user = decoded;

      next();
    } catch (error) {
      logger.warn(`Refresh token verification failed: ${error.message}`);
      return ResponseHandler.unauthorized(res, 'Invalid refresh token');
    }
  },

  // Optional authentication (doesn't fail if no token)
  optionalAuth: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        const decoded = encryption.verifyAccessToken(token);
        req.user = decoded;
        req.userId = decoded.user_id;
      }

      next();
    } catch (error) {
      logger.debug('Optional auth: No valid token provided');
      next();
    }
  },
};