/*******************************************************************************
 * Commission Controller
 ******************************************************************************/

const commissionService = require('../services/commissionService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');

class CommissionController {
  getSummary = asyncHandler(async (req, res) => {
    const result = await commissionService.getCommissionSummary(req.user.user_id);
    return ResponseHandler.success(res, result.data, 'Commission summary retrieved');
  });

  getHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await commissionService.getCommissionHistory(req.user.user_id, page, limit);
    return ResponseHandler.paginated(res, result.data, result.pagination, 'Commission history retrieved');
  });

  requestPayout = asyncHandler(async (req, res) => {
    const result = await commissionService.requestPayout(req.user.user_id, req.body);
    return ResponseHandler.success(res, result.data || null, result.message || 'Payout request submitted');
  });

  getPayoutHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await commissionService.getAgentPayouts(req.user.user_id, page, limit);
    return ResponseHandler.paginated(res, result.data, result.pagination, 'Payout history retrieved');
  });

  // Admin actions
  createRule = asyncHandler(async (req, res) => {
    const result = await commissionService.createCommissionRule(req.body, req.user.user_id);
    return ResponseHandler.success(res, result.data || null, result.message || 'Commission rule created');
  });

  getPendingPayouts = asyncHandler(async (req, res) => {
    const result = await commissionService.getPendingPayouts();
    return ResponseHandler.success(res, result.data || null, 'Pending payouts retrieved');
  });

  processPayout = asyncHandler(async (req, res) => {
    const payoutId = parseInt(req.params.payoutId, 10);
    const { action, remarks } = req.body;
    const result = await commissionService.processPayout(payoutId, action, req.user.user_id, remarks);
    return ResponseHandler.success(res, null, result.message || 'Payout processed');
  });
}

module.exports = new CommissionController();