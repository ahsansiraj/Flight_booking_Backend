/*******************************************************************************
 * Encryption & Hashing Utilities
 * Password hashing, JWT, data encryption
 ******************************************************************************/

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('./logger');

class EncryptionService {
  // ========== PASSWORD HASHING ==========

  async hashPassword(password) {
    try {
      const saltRounds = 12; // Cost factor (higher = more secure but slower)
      const hash = await bcrypt.hash(password, saltRounds);
      return hash;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw error;
    }
  }

  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      throw error;
    }
  }

  // ========== JWT TOKENS ==========

  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '15m',
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Access token generation failed:', error);
      throw error;
    }
  }

  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw error;
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Access token verification failed:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      logger.error('Refresh token verification failed:', error.message);
      throw new Error('Invalid refresh token');
    }
  }

  // ========== DATA ENCRYPTION (AES-256) ==========

  encryptData(data, key = process.env.ENCRYPTION_KEY) {
    try {
      const algorithm = 'aes-256-cbc';
      const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32); // Ensure 32 bytes
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted data (IV needed for decryption)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Data encryption failed:', error);
      throw error;
    }
  }

  decryptData(encryptedData, key = process.env.ENCRYPTION_KEY) {
    try {
      const algorithm = 'aes-256-cbc';
      const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32);
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Data decryption failed:', error);
      throw error;
    }
  }

  // ========== HASH (for API keys, etc) ==========

  hashString(str) {
    return crypto.createHash('AES-256-CBC').update(str).digest('hex');
  }

  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = new EncryptionService();