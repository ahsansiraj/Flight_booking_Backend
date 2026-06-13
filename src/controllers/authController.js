/*******************************************************************************
 * Authentication Controller
 * HTTP request handlers for authentication
 ******************************************************************************/

const authService = require('../services/authService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  register = asyncHandler(async (req, res) => {
    const { email, username, password, first_name, last_name, phone, user_type } = req.body;

    // Validate required fields
    if (!email || !username || !password || !first_name || !last_name || !phone) {
      return ResponseHandler.badRequest(res, 'All fields are required');
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return ResponseHandler.badRequest(res, 
        'Password must be at least 8 characters with uppercase, number, and special character'
      );
    }

    const result = await authService.registerUser({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      first_name,
      last_name,
      phone,
      user_type: user_type || 'AGENT',
    });

    return ResponseHandler.created(res, result.user, result.message);
  });

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return ResponseHandler.badRequest(res, 'Email and password are required');
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.login(email.toLowerCase(), password, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send refresh token in response (it's in cookie)
    const response = { ...result };
    delete response.refreshToken;

    return ResponseHandler.success(res, response, result.message);
  });

  /**
   * POST /api/v1/auth/refresh-token
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return ResponseHandler.unauthorized(res, 'Refresh token not found');
    }

    const result = await authService.refreshToken(refreshToken);

    return ResponseHandler.success(res, result, result.message);
  });

  /**
   * POST /api/v1/auth/change-password
   * Change user password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!oldPassword || !newPassword) {
      return ResponseHandler.badRequest(res, 'Old and new password are required');
    }

    const result = await authService.changePassword(userId, oldPassword, newPassword);

    return ResponseHandler.success(res, {}, result.message);
  });

  /**
   * GET /api/v1/auth/me
   * Get current user details
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    return ResponseHandler.success(res, {
      user: req.user,
    }, 'User details retrieved');
  });

  /**
   * POST /api/v1/auth/logout
   * Logout user
   */
  logout = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken');
    logger.info(`User logged out: ${req.user.email}`);

    return ResponseHandler.success(res, {}, 'Logged out successfully');
  });
}

module.exports = new AuthController();