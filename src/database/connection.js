const sql = require('mssql');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      if (!this.pool) {
        this.pool = await sql.connect(dbConfig);
        logger.info('✅ Database connected successfully');
      }
      return this.pool;
    } catch (error) {
      logger.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        logger.info('Database disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting database:', error.message);
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  // Get sql object for parameterized queries
  getSql() {
    return sql;
  }
}

module.exports = new Database();