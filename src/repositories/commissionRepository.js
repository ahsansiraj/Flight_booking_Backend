/*******************************************************************************
 * Commission Repository
 * Data Access Layer for Commission and Payout operations
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');

class CommissionRepository {
  /**
   * Get commission rule for booking
   * @param {Object} params - Booking parameters
   * @returns {Promise<Object|null>}
   */
  async getApplicableRule(params) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_tier', sql.VarChar, params.agentTier || null)
        .input('booking_type', sql.VarChar, params.bookingType)
        .input('base_fare', sql.Decimal(15, 2), params.baseFare)
        .input('airline_code', sql.VarChar, params.airlineCode || null)
        .input('cabin_class', sql.VarChar, params.cabinClass || null)
        .query(`
          SELECT TOP 1 *
          FROM dbo.commission_rules
          WHERE is_active = 1
            AND is_deleted = 0
            AND GETDATE() BETWEEN valid_from AND ISNULL(valid_until, '2099-12-31')
            AND (@base_fare >= min_booking_amount)
            AND (@base_fare <= ISNULL(max_booking_amount, 999999999))
            AND (agent_tier IS NULL OR agent_tier = @agent_tier)
            AND (booking_type IS NULL OR booking_type = @booking_type)
            AND (airline_code IS NULL OR airline_code = @airline_code)
            AND (cabin_class IS NULL OR cabin_class = @cabin_class)
          ORDER BY priority DESC, valid_from DESC
        `);

      return result.recordset[0] || null;
    } catch (error) {
      logger.error('getApplicableRule error:', error);
      throw error;
    }
  }

  /**
   * Create commission record
   * @param {Object} commissionData - Commission data
   * @returns {Promise<number>} - Commission ID
   */
  async createCommission(commissionData) {
    try {
      const pool = await database.connect();

      const result = await pool.request()
        .input('agent_id', sql.BigInt, commissionData.agentId)
        .input('booking_id', sql.BigInt, commissionData.bookingId)
        .input('booking_type', sql.VarChar, commissionData.bookingType)
        .input('base_amount', sql.Decimal(15, 2), commissionData.baseAmount)
        .input('commission_rule_id', sql.BigInt, commissionData.ruleId || null)
        .input('commission_percentage', sql.Decimal(5, 2), commissionData.percentage)
        .input('commission_amount', sql.Decimal(15, 2), commissionData.commissionAmount)
        .input('incentive_amount', sql.Decimal(15, 2), commissionData.incentiveAmount || 0)
        .input('total_commission', sql.Decimal(15, 2), commissionData.totalCommission)
        .input('tds_percentage', sql.Decimal(5, 2), commissionData.tdsPercentage || 5.0)
        .input('tds_amount', sql.Decimal(15, 2), commissionData.tdsAmount || 0)
        .input('net_commission', sql.Decimal(15, 2), commissionData.netCommission)
        .query(`
          INSERT INTO dbo.commissions (
            agent_id, booking_id, booking_type, base_amount,
            commission_rule_id, commission_percentage, commission_amount,
            incentive_amount, incentive_reason, total_commission,
            tds_applicable, tds_percentage, tds_amount, net_commission,
            commission_status, available_for_payout_at,
            calculated_at, created_at
          )
          VALUES (
            @agent_id, @booking_id, @booking_type, @base_amount,
            @commission_rule_id, @commission_percentage, @commission_amount,
            @incentive_amount, NULL, @total_commission,
            1, @tds_percentage, @tds_amount, @net_commission,
            'PENDING', DATEADD(HOUR, 24, GETUTCDATE()),
            GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as commission_id;
        `);

      const commissionId = result.recordset[0].commission_id;
      logger.info(`Commission created: ID ${commissionId} for booking ${commissionData.bookingId}`);
      return commissionId;
    } catch (error) {
      logger.error('createCommission error:', error);
      throw error;
    }
  }

  /**
   * Get agent commission summary
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async getAgentCommissionSummary(agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          SELECT 
            ISNULL(SUM(net_commission), 0) AS total_earned,
            ISNULL(SUM(CASE WHEN commission_status = 'PENDING' THEN net_commission ELSE 0 END), 0) AS pending,
            ISNULL(SUM(CASE WHEN commission_status = 'APPROVED' AND available_for_payout_at <= GETUTCDATE() THEN net_commission ELSE 0 END), 0) AS available_for_payout,
            ISNULL(SUM(CASE WHEN commission_status = 'APPROVED' AND available_for_payout_at > GETUTCDATE() THEN net_commission ELSE 0 END), 0) AS cooling_period,
            ISNULL(SUM(CASE WHEN commission_status = 'PAID' THEN net_commission ELSE 0 END), 0) AS paid,
            ISNULL(SUM(CASE WHEN commission_status = 'CANCELLED' OR commission_status = 'REVERSED' THEN net_commission ELSE 0 END), 0) AS reversed,
            COUNT(CASE WHEN commission_status = 'PENDING' THEN 1 END) AS pending_count,
            COUNT(CASE WHEN commission_status = 'APPROVED' THEN 1 END) AS approved_count
          FROM dbo.commissions
          WHERE agent_id = @agent_id AND is_reversed = 0
        `);

      return result.recordset[0];
    } catch (error) {
      logger.error('getAgentCommissionSummary error:', error);
      throw error;
    }
  }

  /**
   * Get commission history (paginated)
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getCommissionHistory(agentId, filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      let whereConditions = ['c.agent_id = @agent_id', 'c.is_reversed = 0'];
      const request = pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit);

      if (filters.status) {
        whereConditions.push('c.commission_status = @status');
        request.input('status', sql.VarChar, filters.status);
      }

      if (filters.fromDate) {
        whereConditions.push('c.calculated_at >= @from_date');
        request.input('from_date', sql.DateTime2, new Date(filters.fromDate));
      }

      if (filters.toDate) {
        whereConditions.push('c.calculated_at <= @to_date');
        request.input('to_date', sql.DateTime2, new Date(filters.toDate));
      }

      const whereClause = whereConditions.join(' AND ');

      const countResult = await request.query(`
        SELECT COUNT(*) as total FROM dbo.commissions c WHERE ${whereClause}
      `);

      const total = countResult.recordset[0].total;

      const result = await request.query(`
        SELECT c.*, b.booking_reference, b.origin_code, b.destination_code,
          b.total_amount AS booking_amount
        FROM dbo.commissions c
        INNER JOIN dbo.bookings b ON c.booking_id = b.booking_id
        WHERE ${whereClause}
        ORDER BY c.calculated_at DESC
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
      logger.error('getCommissionHistory error:', error);
      throw error;
    }
  }

  /**
   * Reverse commission (on booking cancellation)
   * @param {number} bookingId - Booking ID
   * @param {string} reason - Reversal reason
   * @returns {Promise<void>}
   */
  async reverseCommission(bookingId, reason) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('booking_id', sql.BigInt, bookingId)
        .input('reason', sql.NVarChar, reason)
        .query(`
          UPDATE dbo.commissions
          SET commission_status = 'REVERSED',
              is_reversed = 1,
              reversed_at = GETUTCDATE(),
              reversal_reason = @reason,
              updated_at = GETUTCDATE()
          WHERE booking_id = @booking_id
            AND commission_status NOT IN ('PAID', 'REVERSED')
        `);

      logger.info(`Commission reversed for booking ${bookingId}`);
    } catch (error) {
      logger.error('reverseCommission error:', error);
      throw error;
    }
  }

  /**
   * Approve pending commissions (batch)
   * Runs periodically to move PENDING to APPROVED after cooling period
   * @returns {Promise<number>} - Number of commissions approved
   */
  async approvePendingCommissions() {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .query(`
          UPDATE dbo.commissions
          SET commission_status = 'APPROVED',
              updated_at = GETUTCDATE()
          WHERE commission_status = 'PENDING'
            AND available_for_payout_at <= GETUTCDATE()
            AND is_reversed = 0
        `);

      const count = result.rowsAffected[0];
      if (count > 0) {
        logger.info(`${count} commissions approved`);
      }
      return count;
    } catch (error) {
      logger.error('approvePendingCommissions error:', error);
      throw error;
    }
  }

  // =====================================================================
  // PAYOUT OPERATIONS
  // =====================================================================

  /**
   * Create payout request
   * @param {Object} payoutData - Payout data
   * @returns {Promise<Object>}
   */
  async createPayoutRequest(payoutData) {
    try {
      const pool = await database.connect();
      const payoutReference = `PAYOUT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

      // Get available commission
      const commResult = await pool.request()
        .input('agent_id', sql.BigInt, payoutData.agentId)
        .query(`
          SELECT 
            ISNULL(SUM(net_commission), 0) AS available_commission,
            COUNT(*) AS commission_count
          FROM dbo.commissions
          WHERE agent_id = @agent_id
            AND commission_status = 'APPROVED'
            AND available_for_payout_at <= GETUTCDATE()
            AND is_reversed = 0
        `);

      const availableCommission = commResult.recordset[0].available_commission;
      const commissionCount = commResult.recordset[0].commission_count;

      if (availableCommission < payoutData.amount) {
        throw new Error(
          `Insufficient commission. Available: ₹${availableCommission}, Requested: ₹${payoutData.amount}`
        );
      }

      // Create payout
      const result = await pool.request()
        .input('agent_id', sql.BigInt, payoutData.agentId)
        .input('payout_reference', sql.VarChar, payoutReference)
        .input('commission_amount', sql.Decimal(15, 2), payoutData.amount)
        .input('payout_amount', sql.Decimal(15, 2), payoutData.amount)
        .input('payout_method', sql.VarChar, payoutData.payoutMethod)
        .input('bank_ifsc', sql.VarChar, payoutData.bankIfsc || null)
        .input('upi_id', sql.VarChar, payoutData.upiId || null)
        .input('payout_status', sql.VarChar, 'REQUESTED')
        .input('requested_by', sql.BigInt, payoutData.agentId)
        .input('agent_remarks', sql.NVarChar, payoutData.remarks || null)
        .input('commission_count', sql.Int, commissionCount)
        .query(`
          INSERT INTO dbo.payouts (
            agent_id, payout_reference, commission_amount, payout_amount,
            payout_method, bank_ifsc, upi_id, payout_status,
            requested_by, agent_remarks, commission_count,
            requested_at, created_at, updated_at
          )
          VALUES (
            @agent_id, @payout_reference, @commission_amount, @payout_amount,
            @payout_method, @bank_ifsc, @upi_id, @payout_status,
            @requested_by, @agent_remarks, @commission_count,
            GETUTCDATE(), GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as payout_id;
        `);

      const payoutId = result.recordset[0].payout_id;

      // Lock commissions for this payout
      await pool.request()
        .input('payout_id', sql.BigInt, payoutId)
        .input('agent_id', sql.BigInt, payoutData.agentId)
        .input('amount', sql.Decimal(15, 2), payoutData.amount)
        .query(`
          UPDATE c
          SET c.commission_status = 'LOCKED',
              c.payout_id = @payout_id,
              c.updated_at = GETUTCDATE()
          FROM dbo.commissions c
          WHERE c.agent_id = @agent_id
            AND c.commission_status = 'APPROVED'
            AND c.available_for_payout_at <= GETUTCDATE()
            AND c.is_reversed = 0
            AND c.commission_id IN (
              SELECT TOP 100 commission_id
              FROM dbo.commissions
              WHERE agent_id = @agent_id
                AND commission_status = 'APPROVED'
                AND available_for_payout_at <= GETUTCDATE()
                AND is_reversed = 0
              ORDER BY available_for_payout_at ASC
            )
        `);

      logger.info(`Payout request created: ${payoutReference} for ₹${payoutData.amount}`);

      return {
        payoutId,
        payoutReference,
        amount: payoutData.amount,
        status: 'REQUESTED',
      };
    } catch (error) {
      logger.error('createPayoutRequest error:', error);
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
  async getAgentPayouts(agentId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      const countResult = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          SELECT COUNT(*) as total FROM dbo.payouts WHERE agent_id = @agent_id
        `);

      const total = countResult.recordset[0].total;

      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT *
          FROM dbo.payouts
          WHERE agent_id = @agent_id
          ORDER BY requested_at DESC
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
      logger.error('getAgentPayouts error:', error);
      throw error;
    }
  }

  /**
   * Approve/reject payout (admin)
   * @param {number} payoutId - Payout ID
   * @param {string} action - 'APPROVE' or 'REJECT'
   * @param {number} adminId - Admin user ID
   * @param {string} remarks - Admin remarks
   * @returns {Promise<void>}
   */
  async updatePayoutStatus(payoutId, action, adminId, remarks = null) {
    try {
      const pool = await database.connect();
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      await pool.request()
        .input('payout_id', sql.BigInt, payoutId)
        .input('status', sql.VarChar, newStatus)
        .input('admin_id', sql.BigInt, adminId)
        .input('remarks', sql.NVarChar, remarks)
        .query(`
          UPDATE dbo.payouts
          SET payout_status = @status,
              ${action === 'APPROVE' ? 'approved_by = @admin_id, approved_at = GETUTCDATE()' : 'rejected_by = @admin_id, rejected_at = GETUTCDATE(), rejection_reason = @remarks'},
              admin_remarks = @remarks,
              updated_at = GETUTCDATE()
          WHERE payout_id = @payout_id
            AND payout_status IN ('REQUESTED', 'PENDING_APPROVAL')
        `);

      logger.info(`Payout ${payoutId} ${newStatus} by admin ${adminId}`);
    } catch (error) {
      logger.error('updatePayoutStatus error:', error);
      throw error;
    }
  }

  /**
   * Get pending payout requests (admin)
   * @returns {Promise<Array>}
   */
  async getPendingPayouts() {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .query(`
          SELECT p.*, u.first_name + ' ' + u.last_name AS agent_name,
            u.email AS agent_email
          FROM dbo.payouts p
          INNER JOIN dbo.users u ON p.agent_id = u.user_id
          WHERE p.payout_status IN ('REQUESTED', 'PENDING_APPROVAL')
          ORDER BY p.requested_at ASC
        `);

      return result.recordset;
    } catch (error) {
      logger.error('getPendingPayouts error:', error);
      throw error;
    }
  }
}

module.exports = new CommissionRepository();