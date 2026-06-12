/*******************************************************************************
 * Role-Based Access Control (RBAC) Middleware
 ******************************************************************************/

const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

// Check if user has specific role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      logger.warn(`Authorization failed: ${req.user.email} tried to access ${req.originalUrl}`);
      return ResponseHandler.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

// Check if user has specific permission
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    // Permissions would be fetched from database
    // This is simplified version
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      logger.warn(`Permission denied: ${req.user.email} - ${requiredPermission}`);
      return ResponseHandler.forbidden(res, 'Permission denied');
    }

    next();
  };
};

module.exports = {
  checkRole,
  checkPermission,
  isAdmin: checkRole(['ADMIN']),
  isAgent: checkRole(['AGENT']),
  isCustomer: checkRole(['CUSTOMER']),
  isAgentOrAdmin: checkRole(['AGENT', 'ADMIN']),
};