/*******************************************************************************
 * Wallet Controller
 * HTTP request handlers for wallet operations
 ******************************************************************************/

const walletService = require('../services/walletService');
const walletRepository = require('../repositories/walletRepository');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

class WalletController {
  /**
   * GET /api/v1/wallet/summary
   * Get wallet summary for agent
   */
  getWalletSummary = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const result = await walletService.getWalletSummary(agentId);

    return ResponseHandler.success(res, result.data, 'Wallet summary retrieved');
  });

  /**
   * GET /api/v1/wallet/balance
   * Get current wallet balance
   */
  getBalance = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const result = await walletService.checkBalance(agentId, 0);

    return ResponseHandler.success(res, result.data, 'Balance retrieved');
  });

  /**
   * POST /api/v1/wallet/recharge
   * Recharge wallet
   */
  rechargeWallet = asyncHandler(async (req, res) => {
    const { amount, paymentId } = req.body;
    const agentId = req.user.user_id;

    if (!amount || !paymentId) {
      return ResponseHandler.badRequest(res, 'Amount and paymentId are required');
    }

    const result = await walletService.processRecharge(
      agentId,
      parseFloat(amount),
      paymentId,
      {
        userId: req.user.user_id,
        ipAddress: req.ip,
      }
    );

    return ResponseHandler.success(res, result.data, result.message);
  });

  /**
   * GET /api/v1/wallet/transactions
   * Get transaction history (paginated)
   */
  getTransactionHistory = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (limit > 100) {
      return ResponseHandler.badRequest(res, 'Limit cannot exceed 100');
    }

    const result = await walletService.getTransactionHistory(agentId, page, limit);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Transaction history retrieved'
    );
  });

  /**
   * POST /api/v1/wallet/check-balance
   * Check if wallet has sufficient balance for booking
   */
  checkBalance = asyncHandler(async (req, res) => {
    const { requiredAmount } = req.body;
    const agentId = req.user.user_id;

    if (!requiredAmount) {
      return ResponseHandler.badRequest(res, 'Required amount is mandatory');
    }

    const result = await walletService.checkBalance(agentId, parseFloat(requiredAmount));

    return ResponseHandler.success(res, result.data, 'Balance check completed');
  });

  /**
   * GET /api/v1/wallet/reconciliation
   * Check for wallet balance discrepancies
   */
  reconcileBalance = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const wallet = await walletRepository.getWalletByAgentId(agentId);
    if (!wallet) {
      return ResponseHandler.notFound(res, 'Wallet not found');
    }

    const discrepancy = await walletRepository.checkBalanceDiscrepancy(wallet.wallet_id);

    if (discrepancy.hasDiscrepancy) {
      logger.warn(`Balance discrepancy for wallet ${wallet.wallet_id}:`, discrepancy);
    }

    return ResponseHandler.success(res, discrepancy, 'Reconciliation check completed');
  });
}

module.exports = new WalletController();