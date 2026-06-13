/*******************************************************************************
 * Wallet Repository
 * Data Access Layer for Wallet operations
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');
const Wallet = require('../models/Wallet');

class WalletRepository {
  /**
   * Get wallet by agent ID
   * @param {number} agentId - Agent ID
   * @returns {Promise<Wallet|null>}
   */
  async getWalletByAgentId(agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE agent_id = @agent_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new Wallet(result.recordset[0]);
    } catch (error) {
      logger.error('getWalletByAgentId error:', error);
      throw error;
    }
  }

  /**
   * Get wallet by wallet ID
   * @param {number} walletId - Wallet ID
   * @returns {Promise<Wallet|null>}
   */
  async getWalletById(walletId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE wallet_id = @wallet_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new Wallet(result.recordset[0]);
    } catch (error) {
      logger.error('getWalletById error:', error);
      throw error;
    }
  }

  /**
   * Create wallet for agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Wallet>}
   */
  async createWallet(agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_uuid', sql.UniqueIdentifier, require('uuid').v4())
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          INSERT INTO dbo.wallets (
            wallet_uuid, agent_id, current_balance, total_credited,
            total_debited, status, low_balance_threshold, created_at, updated_at
          )
          VALUES (
            @wallet_uuid, @agent_id, 0, 0, 0, 'ACTIVE', 5000, GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as wallet_id;
        `);

      const walletId = result.recordset[0].wallet_id;
      return await this.getWalletById(walletId);
    } catch (error) {
      logger.error('createWallet error:', error);
      throw error;
    }
  }

  /**
   * Recharge wallet using stored procedure
   * @param {number} agentId - Agent ID
   * @param {number} amount - Recharge amount
   * @param {number} paymentId - Payment ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>}
   */
  async rechargeWallet(agentId, amount, paymentId, description = null) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('amount', sql.Decimal(15, 2), amount)
        .input('payment_id', sql.BigInt, paymentId)
        .input('description', sql.NVarChar, description || `Wallet recharge of ₹${amount}`)
        .input('created_by', sql.BigInt, null) // From token context
        .input('ip_address', sql.VarChar, null) // From request context
        .output('new_balance', sql.Decimal(15, 2))
        .output('transaction_id', sql.BigInt)
        .execute('dbo.sp_WalletRecharge');

      logger.info(`Wallet recharged for agent ${agentId}: ₹${amount}`);

      return {
        success: true,
        newBalance: result.output.new_balance,
        transactionId: result.output.transaction_id,
      };
    } catch (error) {
      logger.error('rechargeWallet error:', error);
      throw error;
    }
  }

  /**
   * Debit wallet for booking
   * @param {number} agentId - Agent ID
   * @param {number} amount - Debit amount
   * @param {number} bookingId - Booking ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>}
   */
  async debitWallet(agentId, amount, bookingId, description = null) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('amount', sql.Decimal(15, 2), amount)
        .input('booking_id', sql.BigInt, bookingId)
        .input('description', sql.NVarChar, description || `Payment for booking`)
        .input('created_by', sql.BigInt, null)
        .input('ip_address', sql.VarChar, null)
        .output('new_balance', sql.Decimal(15, 2))
        .output('transaction_id', sql.BigInt)
        .execute('dbo.sp_WalletDebit');

      logger.info(`Wallet debited for agent ${agentId}: ₹${amount}`);

      return {
        success: true,
        newBalance: result.output.new_balance,
        transactionId: result.output.transaction_id,
      };
    } catch (error) {
      logger.error('debitWallet error:', error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   * @param {number} walletId - Wallet ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
   */
  async getTransactionHistory(walletId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      // Get total count
      const countResult = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT COUNT(*) as total
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
        `);

      const total = countResult.recordset[0].total;

      // Get paginated transactions
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT 
            wallet_transaction_id,
            transaction_type,
            credit_amount,
            debit_amount,
            balance_after,
            description,
            status,
            created_at
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      return {
        data: result.recordset,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('getTransactionHistory error:', error);
      throw error;
    }
  }

  /**
   * Calculate wallet balance from transactions
   * @param {number} walletId - Wallet ID
   * @returns {Promise<number>}
   */
  async calculateBalance(walletId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT 
            ISNULL(SUM(credit_amount) - SUM(debit_amount), 0) as calculated_balance
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
        `);

      return result.recordset[0].calculated_balance;
    } catch (error) {
      logger.error('calculateBalance error:', error);
      throw error;
    }
  }

  /**
   * Check wallet balance discrepancy
   * @param {number} walletId - Wallet ID
   * @returns {Promise<{hasDiscrepancy: boolean, currentBalance: number, calculatedBalance: number}>}
   */
  async checkBalanceDiscrepancy(walletId) {
    try {
      const wallet = await this.getWalletById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const calculatedBalance = await this.calculateBalance(walletId);
      const hasDiscrepancy = Math.abs(wallet.current_balance - calculatedBalance) > 0.01;

      return {
        hasDiscrepancy,
        currentBalance: wallet.current_balance,
        calculatedBalance,
        difference: wallet.current_balance - calculatedBalance,
      };
    } catch (error) {
      logger.error('checkBalanceDiscrepancy error:', error);
      throw error;
    }
  }

  /**
   * Update wallet status
   * @param {number} walletId - Wallet ID
   * @param {string} status - New status
   * @returns {Promise<Wallet>}
   */
  async updateStatus(walletId, status) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .input('status', sql.VarChar, status)
        .query(`
          UPDATE dbo.wallets
          SET status = @status, updated_at = GETUTCDATE()
          WHERE wallet_id = @wallet_id
        `);

      logger.info(`Wallet ${walletId} status updated to ${status}`);
      return await this.getWalletById(walletId);
    } catch (error) {
      logger.error('updateStatus error:', error);
      throw error;
    }
  }

  /**
   * Get low balance wallets (for alerts)
   * @returns {Promise<Wallet[]>}
   */
  async getLowBalanceWallets() {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE current_balance < low_balance_threshold
            AND status = 'ACTIVE'
            AND is_deleted = 0
        `);

      return result.recordset.map(row => new Wallet(row));
    } catch (error) {
      logger.error('getLowBalanceWallets error:', error);
      throw error;
    }
  }
}

module.exports = new WalletRepository();