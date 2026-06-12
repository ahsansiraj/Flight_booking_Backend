/*******************************************************************************
 * Commission Service
 * Business logic for commission and payout operations
 ******************************************************************************/

const commissionRepository = require('../repositories/commissionRepository');
const logger = require('../utils/logger');

class CommissionService {
  /**
   * Get agent commission summary
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async getCommissionSummary(agentId) {
    try {
      const summary = await commissionRepository.getAgentCommissionSummary(agentId);

      return {
        success: true,
        data: {
          totalEarned: parseFloat(summary.total_earned) || 0,
          pending: parseFloat(summary.pending) || 0,
          availableForPayout: parseFloat(summary.available_for_payout) || 0,
          coolingPeriod: parseFloat(summary.cooling_period) || 0,
          paid: parseFloat(summary.paid) || 0,
          reversed: parseFloat(summary.reversed) || 0,
          pendingCount: summary.pending_count || 0,
          approvedCount: summary.approved_count || 0,
        },
      };
    } catch (error) {
      logger.error('getCommissionSummary error:', error);
      throw error;
    }
  }

  /**
   * Get commission history
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getCommissionHistory(agentId, filters, page, limit) {
    try {
      const result = await commissionRepository.getCommissionHistory(agentId, filters, page, limit);

      return {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      };
    } catch (error) {
      logger.error('getCommissionHistory error:', error);
      throw error;
    }
  }

  /**
   * Request payout
   * @param {number} agentId - Agent ID
   * @param {Object} payoutData - Payout details
   * @returns {Promise<Object>}
   */
  async requestPayout(agentId, payoutData) {
    try {
      // Validate minimum payout
      if (payoutData.amount < 500) {
        throw new Error('Minimum payout amount is ₹500');
      }

      // Create payout request
      const result = await commissionRepository.createPayoutRequest({
        agentId,
        amount: payoutData.amount,
        payoutMethod: payoutData.payoutMethod,
        bankIfsc: payoutData.bankIfsc,
        bankAccountNumber: payoutData.bankAccountNumber,
        upiId: payoutData.upiId,
        remarks: payoutData.remarks,
      });

      return {
        success: true,
        message: 'Payout request submitted successfully',
        data: result,
      };
    } catch (error) {
      logger.error('requestPayout error:', error);
      throw error;
    }
  }

  /**
   * Get agent payout history
   * @param {number} agentId - Agent ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getAgentPayouts(agentId, page, limit) {
    try {
      const result = await commissionRepository.getAgentPayouts(agentId, page, limit);

      return {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      };
    } catch (error) {
      logger.error('getAgentPayouts error:', error);
      throw error;
    }
  }

  /**
   * Admin: Approve/reject payout
   * @param {number} payoutId - Payout ID
   * @param {string} action - APPROVE or REJECT
   * @param {number} adminId - Admin ID
   * @param {string} remarks - Remarks
   * @returns {Promise<Object>}
   */
  async processPayout(payoutId, action, adminId, remarks) {
    try {
      if (!['APPROVE', 'REJECT'].includes(action)) {
        throw new Error('Invalid action');
      }

      await commissionRepository.updatePayoutStatus(payoutId, action, adminId, remarks);

      return {
        success: true,
        message: `Payout ${action.toLowerCase()}d successfully`,
      };
    } catch (error) {
      logger.error('processPayout error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get pending payout requests
   * @returns {Promise<Object>}
   */
  async getPendingPayouts() {
    try {
      const payouts = await commissionRepository.getPendingPayouts();

      return {
        success: true,
        data: payouts,
        count: payouts.length,
      };
    } catch (error) {
      logger.error('getPendingPayouts error:', error);
      throw error;
    }
  }

  /**
   * Admin: Create commission rule
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>}
   */
  async createCommissionRule(ruleData, createdBy) {
    try {
      const pool = await require('../database/connection').connect();
      const result = await pool.request()
        .input('rule_name', sql.NVarChar, ruleData.ruleName)
        .input('rule_code', sql.VarChar, ruleData.ruleCode)
        .input('description', sql.NVarChar, ruleData.description || null)
        .input('agent_tier', sql.VarChar, ruleData.agentTier || null)
        .input('booking_type', sql.VarChar, ruleData.bookingType || null)
        .input('airline_code', sql.VarChar, ruleData.airlineCode || null)
        .input('cabin_class', sql.VarChar, ruleData.cabinClass || null)
        .input('calculation_type', sql.VarChar, ruleData.calculationType)
        .input('commission_percentage', sql.Decimal(5, 2), ruleData.commissionPercentage || null)
        .input('flat_amount', sql.Decimal(10, 2), ruleData.flatAmount || null)
        .input('min_commission', sql.Decimal(10, 2), ruleData.minCommission || 0)
        .input('max_commission', sql.Decimal(10, 2), ruleData.maxCommission || null)
        .input('min_booking_amount', sql.Decimal(15, 2), ruleData.minBookingAmount || 0)
        .input('max_booking_amount', sql.Decimal(15, 2), ruleData.maxBookingAmount || null)
        .input('valid_from', sql.Date, ruleData.validFrom)
        .input('valid_until', sql.Date, ruleData.validUntil || null)
        .input('priority', sql.Int, ruleData.priority || 100)
        .input('created_by', sql.BigInt, createdBy)
        .query(`
          INSERT INTO dbo.commission_rules (
            rule_uuid, rule_name, rule_code, description,
            agent_tier, booking_type, airline_code, cabin_class,
            calculation_type, commission_percentage, flat_amount,
            min_commission, max_commission,
            min_booking_amount, max_booking_amount,
            valid_from, valid_until, priority,
            is_active, created_at, updated_at, created_by
          )
          VALUES (
            NEWUUID(), @rule_name, @rule_code, @description,
            @agent_tier, @booking_type, @airline_code, @cabin_class,
            @calculation_type, @commission_percentage, @flat_amount,
            @min_commission, @max_commission,
            @min_booking_amount, @max_booking_amount,
            @valid_from, @valid_until, @priority,
            1, GETUTCDATE(), GETUTCDATE(), @created_by
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as rule_id;
        `);

      const ruleId = result.recordset[0].rule_id;
      logger.info(`Commission rule created: ${ruleData.ruleCode} (ID: ${ruleId})`);

      return {
        success: true,
        message: 'Commission rule created successfully',
        data: { ruleId, ruleCode: ruleData.ruleCode },
      };
    } catch (error) {
      logger.error('createCommissionRule error:', error);
      throw error;
    }
  }

  /**
   * Run pending commission approval job
   * Should be called via cron job every hour
   * @returns {Promise<number>}
   */
  async approvePendingCommissions() {
    try {
      const count = await commissionRepository.approvePendingCommissions();
      return count;
    } catch (error) {
      logger.error('approvePendingCommissions error:', error);
      throw error;
    }
  }
}

module.exports = new CommissionService();