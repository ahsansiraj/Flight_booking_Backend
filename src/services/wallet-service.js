/*******************************************************************************
 * Wallet Service
 * Business logic for wallet operations
 ******************************************************************************/

const walletRepository = require('../repositories/walletRepository');
const logger = require('../utils/logger');

class WalletService {
  /**
   * Get wallet summary for agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async getWalletSummary(agentId) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check for discrepancies
      const discrepancy = await walletRepository.checkBalanceDiscrepancy(wallet.wallet_id);

      if (discrepancy.hasDiscrepancy) {
        logger.warn(`Balance discrepancy detected for wallet ${wallet.wallet_id}`);
      }

      return {
        success: true,
        data: {
          walletId: wallet.wallet_id,
          currentBalance: wallet.current_balance,
          totalCredited: wallet.total_credited,
          totalDebited: wallet.total_debited,
          status: wallet.status,
          isLowBalance: wallet.isLowBalance(),
          lastTransactionAt: wallet.last_transaction_at,
          lastRechargeAt: wallet.last_recharge_at,
          discrepancyCheck: {
            hasDiscrepancy: discrepancy.hasDiscrepancy,
            difference: discrepancy.difference,
          },
        },
      };
    } catch (error) {
      logger.error('getWalletSummary error:', error);
      throw error;
    }
  }

  /**
   * Process wallet recharge
   * @param {number} agentId - Agent ID
   * @param {number} amount - Recharge amount
   * @param {number} paymentId - Payment ID
   * @param {Object} context - Request context (userId, ipAddress)
   * @returns {Promise<Object>}
   */
  async processRecharge(agentId, amount, paymentId, context = {}) {
    try {
      // Validate amount
      if (amount < 1000) {
        throw new Error('Minimum recharge amount is ₹1,000');
      }

      if (amount > 500000) {
        throw new Error('Maximum recharge amount is ₹5,00,000');
      }

      // Get wallet
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive()) {
        throw new Error('Wallet is not active');
      }

      // Check maximum balance limit
      if ((wallet.current_balance + amount) > 10000000) {
        throw new Error('Recharge exceeds maximum wallet balance limit');
      }

      // Process recharge
      const result = await walletRepository.rechargeWallet(
        agentId,
        amount,
        paymentId,
        `Wallet recharge of ₹${amount}`
      );

      logger.info(`Recharge processed: Agent ${agentId}, Amount: ₹${amount}`);

      return {
        success: true,
        message: 'Recharge processed successfully',
        data: {
          newBalance: result.newBalance,
          amount: amount,
          transactionId: result.transactionId,
        },
      };
    } catch (error) {
      logger.error('processRecharge error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   * @param {number} agentId - Agent ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getTransactionHistory(agentId, page = 1, limit = 20) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const history = await walletRepository.getTransactionHistory(
        wallet.wallet_id,
        page,
        limit
      );

      return {
        success: true,
        data: history.data,
        pagination: {
          page: history.page,
          limit: history.limit,
          total: history.total,
          pages: history.pages,
        },
      };
    } catch (error) {
      logger.error('getTransactionHistory error:', error);
      throw error;
    }
  }

  /**
   * Check wallet balance before booking
   * @param {number} agentId - Agent ID
   * @param {number} requiredAmount - Amount needed
   * @returns {Promise<Object>}
   */
  async checkBalance(agentId, requiredAmount) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const hasSufficientBalance = wallet.hasSufficientBalance(requiredAmount);

      return {
        success: true,
        data: {
          hasSufficientBalance,
          currentBalance: wallet.current_balance,
          requiredAmount: requiredAmount,
          shortfall: Math.max(0, requiredAmount - wallet.current_balance),
        },
      };
    } catch (error) {
      logger.error('checkBalance error:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();