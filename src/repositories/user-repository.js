/*******************************************************************************
 * User Repository
 * Data Access Layer for User operations
 * All database queries with parameterized statements (SQL injection safe)
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');
const User = require('../models/User');

class UserRepository {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('email', sql.NVarChar, email.trim().toLowerCase())
        .query(`
          SELECT TOP 1 *
          FROM dbo.users
          WHERE email = @email AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<User|null>}
   */
  async findById(userId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('user_id', sql.BigInt, userId)
        .query(`
          SELECT *
          FROM dbo.users
          WHERE user_id = @user_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findById error:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>}
   */
  async findByUsername(username) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('username', sql.VarChar, username.trim())
        .query(`
          SELECT TOP 1 *
          FROM dbo.users
          WHERE username = @username AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findByUsername error:', error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<User>}
   */
  async create(userData) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('user_uuid', sql.UniqueIdentifier, userData.user_uuid)
        .input('email', sql.NVarChar, userData.email.trim().toLowerCase())
        .input('username', sql.VarChar, userData.username.trim())
        .input('password_hash', sql.VarChar, userData.password_hash)
        .input('password_salt', sql.VarChar, userData.password_salt)
        .input('first_name', sql.NVarChar, userData.first_name)
        .input('last_name', sql.NVarChar, userData.last_name)
        .input('phone', sql.VarChar, userData.phone)
        .input('user_type', sql.VarChar, userData.user_type)
        .input('agent_tier', sql.VarChar, userData.agent_tier || 'SILVER')
        .input('status', sql.VarChar, userData.status || 'ACTIVE')
        .query(`
          INSERT INTO dbo.users (
            user_uuid, email, username, password_hash, password_salt,
            first_name, last_name, phone, user_type, agent_tier, status,
            is_email_verified, is_kyc_verified, created_at, updated_at
          )
          VALUES (
            @user_uuid, @email, @username, @password_hash, @password_salt,
            @first_name, @last_name, @phone, @user_type, @agent_tier, @status,
            0, 0, GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as user_id;
        `);

      const userId = result.recordset[0].user_id;
      return await this.findById(userId);
    } catch (error) {
      logger.error('create user error:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>}
   */
  async update(userId, updateData) {
    try {
      const pool = await database.connect();

      // Build dynamic update query
      const allowedFields = [
        'first_name', 'last_name', 'phone', 'agent_tier',
        'status', 'is_email_verified', 'is_kyc_verified'
      ];

      let updateQuery = 'UPDATE dbo.users SET ';
      const request = pool.request().input('user_id', sql.BigInt, userId);

      const updates = [];
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = @${key}`);
          
          if (key === 'first_name' || key === 'last_name') {
            request.input(key, sql.NVarChar, updateData[key]);
          } else if (key === 'phone') {
            request.input(key, sql.VarChar, updateData[key]);
          } else if (key.includes('is_')) {
            request.input(key, sql.Bit, updateData[key]);
          } else {
            request.input(key, sql.VarChar, updateData[key]);
          }
        }
      });

      if (updates.length === 0) {
        return await this.findById(userId);
      }

      updateQuery += updates.join(', ') + ', updated_at = GETUTCDATE() WHERE user_id = @user_id';

      await request.query(updateQuery);

      logger.info(`User ${userId} updated`);
      return await this.findById(userId);
    } catch (error) {
      logger.error('update user error:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('user_id', sql.BigInt, userId)
        .query(`
          UPDATE dbo.users
          SET is_deleted = 1, deleted_at = GETUTCDATE(), updated_at = GETUTCDATE()
          WHERE user_id = @user_id
        `);

      logger.info(`User ${userId} soft deleted`);
      return true;
    } catch (error) {
      logger.error('delete user error:', error);
      throw error;
    }
  }

  /**
   * Get all agents (paginated)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<{data: User[], total: number}>}
   */
  async getAllAgents(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      // Get total count
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as total
        FROM dbo.users
        WHERE user_type = 'AGENT' AND is_deleted = 0
      `);

      const total = countResult.recordset[0].total;

      // Get paginated results
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT *
          FROM dbo.users
          WHERE user_type = 'AGENT' AND is_deleted = 0
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      const users = result.recordset.map(row => new User(row));

      return {
        data: users,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('getAllAgents error:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('email', sql.NVarChar, email.trim().toLowerCase())
        .query(`
          SELECT COUNT(*) as count
          FROM dbo.users
          WHERE email = @email AND is_deleted = 0
        `);

      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error('emailExists error:', error);
      throw error;
    }
  }

  /**
   * Update last login
   * @param {number} userId - User ID
   * @param {string} ipAddress - IP address
   * @returns {Promise<void>}
   */
  async updateLastLogin(userId, ipAddress) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('user_id', sql.BigInt, userId)
        .input('ip_address', sql.VarChar, ipAddress)
        .query(`
          UPDATE dbo.users
          SET last_login_at = GETUTCDATE(), last_login_ip = @ip_address
          WHERE user_id = @user_id
        `);
    } catch (error) {
      logger.error('updateLastLogin error:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();