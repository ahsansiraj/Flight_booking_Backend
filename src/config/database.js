/*******************************************************************************
 * Database Configuration
 * SQL Server connection with connection pooling
 ******************************************************************************/

require('dotenv').config();
const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      if (!this.pool) {
        this.pool = await sql.connect(config);
        logger.info('✓ Database connected successfully');
        
        // Test connection
        const result = await this.pool.request()
          .query('SELECT 1 AS test');
        
        if (result.recordset[0].test === 1) {
          logger.info('✓ Database connection test passed');
        }
      }
      return this.pool;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        logger.info('✓ Database disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting database:', error);
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async executeQuery(query, parameters = {}) {
    try {
      const pool = this.getPool();
      const request = pool.request();

      // Add input parameters
      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async executeStoredProcedure(spName, parameters = {}, outputs = {}) {
    try {
      const pool = this.getPool();
      const request = pool.request();

      // Add input parameters
      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      // Add output parameters
      Object.keys(outputs).forEach(key => {
        request.output(key, outputs[key]);
      });

      const result = await request.execute(spName);
      return result;
    } catch (error) {
      logger.error(`Stored procedure ${spName} failed:`, error);
      throw error;
    }
  }
}

module.exports = new DatabaseConnection();