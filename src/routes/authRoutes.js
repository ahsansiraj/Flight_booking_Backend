/*******************************************************************************
 * Authentication Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyToken, verifyRefreshToken } = require('../middlewares/auth');
const { validators, handleValidationErrors } = require('../middlewares/validator');
const { loginLimiter } = require('../config/security');

// Public Routes
router.post(
  '/register',
  validators.email,
  validators.password,
  validators.phone,
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  validators.email,
  handleValidationErrors,
  authController.login
);

router.post(
  '/refresh-token',
  verifyRefreshToken,
  authController.refreshToken
);

// Protected Routes
router.get('/me', verifyToken, authController.getCurrentUser);

router.post(
  '/change-password',
  verifyToken,
  validators.password,
  handleValidationErrors,
  authController.changePassword
);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;