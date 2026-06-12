/*******************************************************************************
 * Transaction Management
 * Wrapper for database transactions with rollback on error
 ******************************************************************************/

const sql = require('mssql');
const database = require('./connection');
const logger = require('../utils/logger');

class Transaction {
  async executeTransaction(callback) {
    const pool = await database.connect();
    const transaction = new sql.Transaction(pool);

    try {
      logger.debug('Starting transaction');
      await transaction.begin();

      // Execute callback with transaction
      const result = await callback(transaction);

      await transaction.commit();
      logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      logger.error('Transaction error, rolling back:', error);
      try {
        await transaction.rollback();
        logger.debug('Transaction rolled back');
      } catch (rollbackError) {
        logger.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  async executeRequest(transaction, query, parameters = {}) {
    const request = transaction.request();

    Object.keys(parameters).forEach(key => {
      request.input(key, parameters[key]);
    });

    return await request.query(query);
  }
}

module.exports = new Transaction();