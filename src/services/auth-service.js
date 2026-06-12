/*******************************************************************************
 * Authentication Service
 * Business logic for authentication and authorization
 ******************************************************************************/

const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const encryption = require('../utils/encryption');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Register new user (agent/admin)
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>}
   */
  async registerUser(userData) {
    try {
      // Check if email exists
      const emailExists = await userRepository.emailExists(userData.email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await encryption.hashPassword(userData.password);

      // Create user
      const newUser = await userRepository.create({
        user_uuid: uuidv4(),
        email: userData.email,
        username: userData.username,
        password_hash: passwordHash,
        password_salt: 'salt', // Bcrypt handles salt internally
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        user_type: userData.user_type || 'AGENT',
        agent_tier: userData.agent_tier || 'SILVER',
      });

      // Create wallet for agents
      if (userData.user_type === 'AGENT') {
        await walletRepository.createWallet(newUser.user_id);
        logger.info(`Wallet created for agent: ${newUser.user_id}`);
      }

      logger.info(`User registered: ${newUser.email}`);

      return {
        success: true,
        message: 'Registration successful',
        user: newUser.toJSON(),
      };
    } catch (error) {
      logger.error('registerUser error:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - Email
   * @param {string} password - Password
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>}
   */
  async login(email, password, ipAddress) {
    try {
      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error(`Account is ${user.status.toLowerCase()}`);
      }

      // Verify password
      const isPasswordValid = await encryption.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const accessToken = encryption.generateAccessToken({
        user_id: user.user_id,
        email: user.email,
        user_type: user.user_type,
        tenant_id: user.user_id, // For single-tenant, user_id as tenant
      });

      const refreshToken = encryption.generateRefreshToken({
        user_id: user.user_id,
        email: user.email,
      });

      // Update last login
      await userRepository.updateLastLogin(user.user_id, ipAddress);

      logger.info(`User logged in: ${email}`);

      return {
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error('login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>}
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = encryption.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = encryption.generateAccessToken({
        user_id: decoded.user_id,
        email: decoded.email,
      });

      logger.info(`Token refreshed for user: ${decoded.user_id}`);

      return {
        success: true,
        message: 'Token refreshed',
        accessToken: newAccessToken,
      };
    } catch (error) {
      logger.error('refreshToken error:', error);
      throw error;
    }
  }

  /**
   * Change password
   * @param {number} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isPasswordValid = await encryption.verifyPassword(oldPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await encryption.hashPassword(newPassword);

      // Update password
      await userRepository.update(userId, {
        password_hash: newPasswordHash,
      });

      logger.info(`Password changed for user: ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      logger.error('changePassword error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   * @param {number} userId - User ID
   * @returns {Promise<Object>}
   */
  async verifyEmail(userId) {
    try {
      await userRepository.update(userId, {
        is_email_verified: 1,
      });

      logger.info(`Email verified for user: ${userId}`);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      logger.error('verifyEmail error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();