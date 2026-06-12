/*******************************************************************************
 * Booking Repository
 * Data Access Layer for Booking operations
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');

class BookingRepository {
  /**
   * Generate unique booking reference
   * @returns {string}
   */
  _generateBookingReference() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return `BKG${dateStr}${random}`;
  }

  /**
   * Create booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>}
   */
  async createBooking(bookingData) {
    try {
      const pool = await database.connect();
      const bookingReference = this._generateBookingReference();

      const result = await pool.request()
        .input('booking_reference', sql.VarChar(20), bookingReference)
        .input('agent_id', sql.BigInt, bookingData.agentId)
        .input('customer_id', sql.BigInt, bookingData.customerId)
        .input('booking_type', sql.VarChar, 'FLIGHT')
        .input('origin_code', sql.VarChar, bookingData.originCode)
        .input('destination_code', sql.VarChar, bookingData.destinationCode)
        .input('journey_type', sql.VarChar, bookingData.journeyType || 'ONE_WAY')
        .input('travel_start_date', sql.DateTime2, new Date(bookingData.departureTime))
        .input('total_travelers', sql.Int, bookingData.totalTravelers)
        .input('adults_count', sql.Int, bookingData.adultsCount || 1)
        .input('children_count', sql.Int, bookingData.childrenCount || 0)
        .input('infants_count', sql.Int, bookingData.infantsCount || 0)
        .input('currency', sql.VarChar, 'INR')
        .input('base_fare', sql.Decimal(15, 2), bookingData.baseFare)
        .input('taxes', sql.Decimal(15, 2), bookingData.taxes || 0)
        .input('platform_fee', sql.Decimal(15, 2), bookingData.platformFee || 0)
        .input('total_amount', sql.Decimal(15, 2), bookingData.totalAmount)
        .input('contact_email', sql.NVarChar, bookingData.contactEmail)
        .input('contact_phone', sql.VarChar, bookingData.contactPhone)
        .input('supplier_code', sql.VarChar, bookingData.supplierCode || null)
        .query(`
          INSERT INTO dbo.bookings (
            booking_reference, agent_id, customer_id, booking_type,
            origin_code, destination_code, journey_type, travel_start_date,
            total_travelers, adults_count, children_count, infants_count,
            currency, base_fare, taxes, platform_fee, total_amount,
            booking_status, payment_status, contact_email, contact_phone,
            supplier_code, booking_date, expires_at, created_at, updated_at
          )
          VALUES (
            @booking_reference, @agent_id, @customer_id, @booking_type,
            @origin_code, @destination_code, @journey_type, @travel_start_date,
            @total_travelers, @adults_count, @children_count, @infants_count,
            @currency, @base_fare, @taxes, @platform_fee, @total_amount,
            'INITIATED', 'PENDING', @contact_email, @contact_phone,
            @supplier_code, GETUTCDATE(), DATEADD(MINUTE, 30, GETUTCDATE()),
            GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as booking_id;
        `);

      const bookingId = result.recordset[0].booking_id;
      
      logger.info(`Booking created: ${bookingReference} (ID: ${bookingId})`);
      
      return {
        bookingId,
        bookingReference,
      };
    } catch (error) {
      logger.error('createBooking error:', error);
      throw error;
    }
  }

  /**
   * Create flight booking details
   * @param {number} bookingId - Booking ID
   * @param {Object} flightData - Flight details
   * @returns {Promise<void>}
   */
  async createFlightBooking(bookingId, flightData) {
    try {
      const pool = await database.connect();

      await pool.request()
        .input('booking_id', sql.BigInt, bookingId)
        .input('airline_code', sql.VarChar, flightData.airlineCode)
        .input('airline_name', sql.NVarChar, flightData.airlineName)
        .input('flight_number', sql.VarChar, flightData.flightNumber)
        .input('origin_airport', sql.VarChar, flightData.origin)
        .input('origin_city', sql.NVarChar, flightData.originCity)
        .input('destination_airport', sql.VarChar, flightData.destination)
        .input('destination_city', sql.NVarChar, flightData.destinationCity)
        .input('departure_datetime', sql.DateTime2, new Date(flightData.departureTime))
        .input('arrival_datetime', sql.DateTime2, new Date(flightData.arrivalTime))
        .input('flight_duration_minutes', sql.Int, flightData.duration)
        .input('cabin_class', sql.VarChar, flightData.cabinClass)
        .input('baggage_allowance', sql.VarChar, flightData.baggage?.checkIn || '15 KG')
        .input('cabin_baggage', sql.VarChar, flightData.baggage?.cabin || '7 KG')
        .input('is_direct', sql.Bit, !flightData.stops || flightData.stops === 0)
        .input('stops_count', sql.Int, flightData.stops || 0)
        .input('supplier_data', sql.NVarChar, JSON.stringify(flightData))
        .query(`
          INSERT INTO dbo.flight_bookings (
            booking_id, airline_code, airline_name, flight_number,
            origin_airport, origin_city, destination_airport, destination_city,
            departure_datetime, arrival_datetime, flight_duration_minutes,
            cabin_class, baggage_allowance, cabin_baggage,
            is_direct, stops_count, supplier_data, created_at, updated_at
          )
          VALUES (
            @booking_id, @airline_code, @airline_name, @flight_number,
            @origin_airport, @origin_city, @destination_airport, @destination_city,
            @departure_datetime, @arrival_datetime, @flight_duration_minutes,
            @cabin_class, @baggage_allowance, @cabin_baggage,
            @is_direct, @stops_count, @supplier_data, GETUTCDATE(), GETUTCDATE()
          )
        `);

      logger.info(`Flight details created for booking ${bookingId}`);
    } catch (error) {
      logger.error('createFlightBooking error:', error);
      throw error;
    }
  }

  /**
   * Add booking travelers
   * @param {number} bookingId - Booking ID
   * @param {Array} travelers - Traveler data array
   * @returns {Promise<void>}
   */
  async addBookingTravelers(bookingId, travelers) {
    try {
      const pool = await database.connect();

      for (const traveler of travelers) {
        // First insert traveler into travelers table
        const travelerResult = await pool.request()
          .input('first_name', sql.NVarChar, traveler.firstName)
          .input('last_name', sql.NVarChar, traveler.lastName)
          .input('date_of_birth', sql.Date, new Date(traveler.dateOfBirth))
          .input('gender', sql.Char, traveler.gender)
          .input('document_type', sql.VarChar, traveler.documentType)
          .input('document_number_encrypted', sql.VarBinary, null) // Encrypt in service layer
          .input('traveler_type', sql.VarChar, traveler.type || 'ADULT')
          .query(`
            INSERT INTO dbo.travelers (
              customer_id, first_name, last_name, date_of_birth, gender,
              document_type, document_number_encrypted, traveler_type,
              is_active, created_at, updated_at
            )
            VALUES (
              NULL, @first_name, @last_name, @date_of_birth, @gender,
              @document_type, @document_number_encrypted, @traveler_type,
              1, GETUTCDATE(), GETUTCDATE()
            );
            SELECT CAST(SCOPE_IDENTITY() as BIGINT) as traveler_id;
          `);

        const travelerId = travelerResult.recordset[0].traveler_id;

        // Link traveler to booking
        await pool.request()
          .input('booking_id', sql.BigInt, bookingId)
          .input('traveler_id', sql.BigInt, travelerId)
          .input('traveler_type', sql.VarChar, traveler.type || 'ADULT')
          .input('meal_preference', sql.VarChar, traveler.mealPreference || null)
          .query(`
            INSERT INTO dbo.booking_travelers (
              booking_id, traveler_id, traveler_type,
              meal_preference, created_at, updated_at
            )
            VALUES (
              @booking_id, @traveler_id, @traveler_type,
              @meal_preference, GETUTCDATE(), GETUTCDATE()
            )
          `);
      }

      logger.info(`${travelers.length} travelers added to booking ${bookingId}`);
    } catch (error) {
      logger.error('addBookingTravelers error:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   * @param {number} bookingId - Booking ID
   * @param {Object} updates - Status updates
   * @returns {Promise<void>}
   */
  async updateBooking(bookingId, updates) {
    try {
      const pool = await database.connect();
      const request = pool.request().input('booking_id', sql.BigInt, bookingId);

      let setClauses = [];

      if (updates.bookingStatus) {
        setClauses.push('booking_status = @booking_status');
        request.input('booking_status', sql.VarChar, updates.bookingStatus);
      }

      if (updates.paymentStatus) {
        setClauses.push('payment_status = @payment_status');
        request.input('payment_status', sql.VarChar, updates.paymentStatus);
      }

      if (updates.paidAmount !== undefined) {
        setClauses.push('paid_amount = @paid_amount');
        request.input('paid_amount', sql.Decimal(15, 2), updates.paidAmount);
      }

      if (updates.pnr) {
        setClauses.push('pnr = @pnr');
        request.input('pnr', sql.VarChar, updates.pnr);
      }

      if (updates.supplierBookingId) {
        setClauses.push('supplier_booking_id = @supplier_booking_id');
        request.input('supplier_booking_id', sql.VarChar, updates.supplierBookingId);
      }

      if (updates.confirmationNumber) {
        setClauses.push('confirmation_number = @confirmation_number');
        request.input('confirmation_number', sql.VarChar, updates.confirmationNumber);
      }

      if (updates.ticketNumbers) {
        setClauses.push('ticket_numbers = @ticket_numbers');
        request.input('ticket_numbers', sql.NVarChar, JSON.stringify(updates.ticketNumbers));
      }

      if (updates.supplierResponse) {
        setClauses.push('supplier_response = @supplier_response');
        request.input('supplier_response', sql.NVarChar, JSON.stringify(updates.supplierResponse));
      }

      if (updates.confirmedAt) {
        setClauses.push('confirmed_at = @confirmed_at');
        request.input('confirmed_at', sql.DateTime2, updates.confirmedAt);
      }

      if (updates.ticketedAt) {
        setClauses.push('ticketed_at = @ticketed_at');
        request.input('ticketed_at', sql.DateTime2, updates.ticketedAt);
      }

      if (updates.cancellationCharges !== undefined) {
        setClauses.push('cancellation_charges = @cancellation_charges');
        request.input('cancellation_charges', sql.Decimal(15, 2), updates.cancellationCharges);
      }

      if (updates.cancelledAt) {
        setClauses.push('cancelled_at = @cancelled_at');
        request.input('cancelled_at', sql.DateTime2, updates.cancelledAt);
      }

      if (updates.refundAmount !== undefined) {
        setClauses.push('refund_amount = @refund_amount');
        request.input('refund_amount', sql.Decimal(15, 2), updates.refundAmount);
      }

      if (updates.refundStatus) {
        setClauses.push('refund_status = @refund_status');
        request.input('refund_status', sql.VarChar, updates.refundStatus);
      }

      if (updates.updatedBy) {
        setClauses.push('updated_by = @updated_by');
        request.input('updated_by', sql.BigInt, updates.updatedBy);
      }

      setClauses.push('updated_at = GETUTCDATE()');

      if (setClauses.length > 0) {
        await request.query(`
          UPDATE dbo.bookings
          SET ${setClauses.join(', ')}
          WHERE booking_id = @booking_id AND is_deleted = 0
        `);

        logger.info(`Booking ${bookingId} updated`);
      }
    } catch (error) {
      logger.error('updateBooking error:', error);
      throw error;
    }
  }

  /**
   * Get booking by reference
   * @param {string} bookingReference - Booking reference
   * @returns {Promise<Object|null>}
   */
  async getBookingByReference(bookingReference) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('booking_reference', sql.VarChar, bookingReference)
        .query(`
          SELECT b.*,
            fb.airline_code, fb.airline_name, fb.flight_number,
            fb.origin_airport, fb.origin_city,
            fb.destination_airport, fb.destination_city,
            fb.departure_datetime, fb.arrival_datetime,
            fb.flight_duration_minutes, fb.cabin_class,
            fb.baggage_allowance, fb.flight_status
          FROM dbo.bookings b
          LEFT JOIN dbo.flight_bookings fb ON b.booking_id = fb.booking_id
          WHERE b.booking_reference = @booking_reference
            AND b.is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      // Get travelers
      const travelersResult = await pool.request()
        .input('booking_id', sql.BigInt, result.recordset[0].booking_id)
        .query(`
          SELECT bt.*, t.first_name, t.last_name, t.date_of_birth,
            t.gender, t.document_type, t.traveler_type
          FROM dbo.booking_travelers bt
          INNER JOIN dbo.travelers t ON bt.traveler_id = t.traveler_id
          WHERE bt.booking_id = @booking_id
        `);

      const booking = result.recordset[0];
      booking.travelers = travelersResult.recordset;

      return booking;
    } catch (error) {
      logger.error('getBookingByReference error:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object|null>}
   */
  async getBookingById(bookingId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('booking_id', sql.BigInt, bookingId)
        .query(`
          SELECT b.*,
            fb.airline_code, fb.airline_name, fb.flight_number,
            fb.origin_airport, fb.origin_city,
            fb.destination_airport, fb.destination_city,
            fb.departure_datetime, fb.arrival_datetime,
            fb.flight_duration_minutes, fb.cabin_class,
            fb.baggage_allowance, fb.flight_status
          FROM dbo.bookings b
          LEFT JOIN dbo.flight_bookings fb ON b.booking_id = fb.booking_id
          WHERE b.booking_id = @booking_id AND b.is_deleted = 0
        `);

      return result.recordset[0] || null;
    } catch (error) {
      logger.error('getBookingById error:', error);
      throw error;
    }
  }

  /**
   * Get agent bookings (paginated)
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getAgentBookings(agentId, filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      // Build WHERE clause
      let whereConditions = ['b.agent_id = @agent_id', 'b.is_deleted = 0'];
      const request = pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit);

      if (filters.status) {
        whereConditions.push('b.booking_status = @status');
        request.input('status', sql.VarChar, filters.status);
      }

      if (filters.paymentStatus) {
        whereConditions.push('b.payment_status = @payment_status');
        request.input('payment_status', sql.VarChar, filters.paymentStatus);
      }

      if (filters.fromDate) {
        whereConditions.push('b.booking_date >= @from_date');
        request.input('from_date', sql.DateTime2, new Date(filters.fromDate));
      }

      if (filters.toDate) {
        whereConditions.push('b.booking_date <= @to_date');
        request.input('to_date', sql.DateTime2, new Date(filters.toDate));
      }

      const whereClause = whereConditions.join(' AND ');

      // Count
      const countResult = await request.query(`
        SELECT COUNT(*) as total
        FROM dbo.bookings b
        WHERE ${whereClause}
      `);

      const total = countResult.recordset[0].total;

      // Get data
      const result = await request.query(`
        SELECT b.booking_id, b.booking_reference, b.booking_status,
          b.payment_status, b.origin_code, b.destination_code,
          b.travel_start_date, b.total_travelers, b.base_fare,
          b.taxes, b.total_amount, b.commission_amount,
          b.booking_date, b.pnr,
          fb.airline_code, fb.airline_name, fb.flight_number,
          fb.cabin_class
        FROM dbo.bookings b
        LEFT JOIN dbo.flight_bookings fb ON b.booking_id = fb.booking_id
        WHERE ${whereClause}
        ORDER BY b.booking_date DESC
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
      logger.error('getAgentBookings error:', error);
      throw error;
    }
  }

  /**
   * Check if booking belongs to agent
   * @param {number} bookingId - Booking ID
   * @param {number} agentId - Agent ID
   * @returns {Promise<boolean>}
   */
  async belongsToAgent(bookingId, agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('booking_id', sql.BigInt, bookingId)
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          SELECT COUNT(*) as count
          FROM dbo.bookings
          WHERE booking_id = @booking_id AND agent_id = @agent_id AND is_deleted = 0
        `);

      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error('belongsToAgent error:', error);
      throw error;
    }
  }

  /**
   * Get all bookings (admin)
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getAllBookings(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      let whereConditions = ['b.is_deleted = 0'];
      const request = pool.request()
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit);

      if (filters.agentId) {
        whereConditions.push('b.agent_id = @agent_id');
        request.input('agent_id', sql.BigInt, filters.agentId);
      }

      if (filters.status) {
        whereConditions.push('b.booking_status = @status');
        request.input('status', sql.VarChar, filters.status);
      }

      const whereClause = whereConditions.join(' AND ');

      const countResult = await request.query(`
        SELECT COUNT(*) as total FROM dbo.bookings b WHERE ${whereClause}
      `);

      const total = countResult.recordset[0].total;

      const result = await request.query(`
        SELECT b.*, 
          u.first_name + ' ' + u.last_name AS agent_name,
          fb.airline_code, fb.flight_number, fb.cabin_class
        FROM dbo.bookings b
        INNER JOIN dbo.users u ON b.agent_id = u.user_id
        LEFT JOIN dbo.flight_bookings fb ON b.booking_id = fb.booking_id
        WHERE ${whereClause}
        ORDER BY b.booking_date DESC
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
      logger.error('getAllBookings error:', error);
      throw error;
    }
  }
}

module.exports = new BookingRepository();