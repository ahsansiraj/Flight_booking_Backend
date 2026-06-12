/*******************************************************************************
 * Booking Service
 * Business logic for flight booking operations
 ******************************************************************************/

const bookingRepository = require('../repositories/bookingRepository');
const walletRepository = require('../repositories/walletRepository');
const commissionRepository = require('../repositories/commissionRepository');
const flightApiService = require('./flightApiService');
const logger = require('../utils/logger');

class BookingService {
  /**
   * Search flights
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>}
   */
  async searchFlights(searchParams) {
    try {
      // Validate search parameters
      if (searchParams.origin === searchParams.destination) {
        throw new Error('Origin and destination cannot be the same');
      }

      const result = await flightApiService.searchFlights(searchParams);
      return result;
    } catch (error) {
      logger.error('searchFlights error:', error);
      throw error;
    }
  }

  /**
   * Create flight booking
   * Full booking flow:
   * 1. Validate wallet balance
   * 2. Create booking record
   * 3. Book with airline API
   * 4. Debit wallet
   * 5. Calculate commission
   * 6. Update booking status
   * 
   * @param {Object} bookingData - Complete booking data
   * @param {Object} context - Request context
   * @returns {Promise<Object>}
   */
  async createBooking(bookingData, context = {}) {
    try {
      const { agentId, flightId, customerId, travelers, contactEmail, contactPhone } = bookingData;

      // =====================================================
      // STEP 1: Get flight details and check wallet balance
      // =====================================================
      const flightResult = await flightApiService.getFlightDetails(flightId);
      if (!flightResult.success) {
        throw new Error('Flight not found or unavailable');
      }

      const flight = flightResult.flight;
      const totalAmount = flight.price.total;

      // Check wallet balance
      const balanceCheck = await walletRepository.getWalletByAgentId(agentId);
      if (!balanceCheck) {
        throw new Error('Wallet not found');
      }

      if (!balanceCheck.hasSufficientBalance(totalAmount)) {
        throw new Error(
          `Insufficient wallet balance. Available: ₹${balanceCheck.current_balance}, Required: ₹${totalAmount}`
        );
      }

      // =====================================================
      // STEP 2: Create booking record
      // =====================================================
      const bookingResult = await bookingRepository.createBooking({
        agentId,
        customerId,
        originCode: flight.origin,
        destinationCode: flight.destination,
        journeyType: 'ONE_WAY',
        departureTime: flight.departureTime,
        totalTravelers: travelers.length,
        adultsCount: travelers.filter(t => t.type === 'ADULT').length,
        childrenCount: travelers.filter(t => t.type === 'CHILD').length,
        infantsCount: travelers.filter(t => t.type === 'INFANT').length,
        baseFare: flight.price.baseFare,
        taxes: flight.price.taxes,
        platformFee: flight.price.fees,
        totalAmount,
        contactEmail,
        contactPhone,
        supplierCode: 'MOCK_API',
      });

      const { bookingId, bookingReference } = bookingResult;

      // =====================================================
      // STEP 3: Create flight details
      // =====================================================
      await bookingRepository.createFlightBooking(bookingId, flight);

      // =====================================================
      // STEP 4: Add travelers
      // =====================================================
      await bookingRepository.addBookingTravelers(bookingId, travelers);

      // =====================================================
      // STEP 5: Book with airline API
      // =====================================================
      let supplierResponse;
      try {
        supplierResponse = await flightApiService.bookFlight({
          bookingReference,
          flight,
          travelers,
          contact: { email: contactEmail, phone: contactPhone },
        });

        if (supplierResponse.success) {
          await bookingRepository.updateBooking(bookingId, {
            bookingStatus: 'CONFIRMED',
            confirmedAt: new Date(),
            pnr: supplierResponse.booking.pnr,
            supplierBookingId: supplierResponse.booking.supplierBookingId,
            confirmationNumber: supplierResponse.booking.pnr,
            ticketNumbers: supplierResponse.booking.ticketNumbers,
            supplierResponse: supplierResponse.booking,
          });

          // Mark as ticketed
          await bookingRepository.updateBooking(bookingId, {
            bookingStatus: 'TICKETED',
            ticketedAt: new Date(),
            paymentStatus: 'PAID',
            paidAmount: totalAmount,
          });
        }
      } catch (apiError) {
        // If airline booking fails, update status
        await bookingRepository.updateBooking(bookingId, {
          bookingStatus: 'FAILED',
          supplierResponse: { error: apiError.message },
        });
        throw new Error(`Booking failed with airline: ${apiError.message}`);
      }

      // =====================================================
      // STEP 6: Debit wallet
      // =====================================================
      const debitResult = await walletRepository.debitWallet(
        agentId,
        totalAmount,
        bookingId,
        `Payment for booking ${bookingReference}`
      );

      logger.info(`Wallet debited: ₹${totalAmount} for booking ${bookingReference}`);

      // =====================================================
      // STEP 7: Calculate and record commission
      // =====================================================
      let commissionResult = null;
      try {
        commissionResult = await this._calculateAndRecordCommission(
          bookingId,
          agentId,
          flight
        );
      } catch (commError) {
        // Commission failure is not critical - log and continue
        logger.error('Commission calculation failed (non-critical):', commError.message);
      }

      // =====================================================
      // STEP 8: Return booking confirmation
      // =====================================================
      const booking = await bookingRepository.getBookingById(bookingId);

      return {
        success: true,
        message: 'Booking confirmed successfully',
        data: {
          bookingId,
          bookingReference,
          pnr: supplierResponse?.booking?.pnr,
          ticketNumbers: supplierResponse?.booking?.ticketNumbers,
          flight: {
            airline: flight.airlineName,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            cabinClass: flight.cabinClass,
          },
          travelers: travelers.length,
          pricing: {
            baseFare: flight.price.baseFare,
            taxes: flight.price.taxes,
            fees: flight.price.fees,
            totalAmount,
          },
          commission: commissionResult ? {
            percentage: commissionResult.percentage,
            amount: commissionResult.netCommission,
            availableAfter: commissionResult.availableAfter,
          } : null,
          wallet: {
            debited: totalAmount,
            newBalance: debitResult.newBalance,
          },
        },
      };
    } catch (error) {
      logger.error('createBooking error:', error);
      throw error;
    }
  }

  /**
   * Cancel booking
   * @param {number} bookingId - Booking ID
   * @param {number} agentId - Agent ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelBooking(bookingId, agentId, reason) {
    try {
      // Verify booking belongs to agent
      const belongs = await bookingRepository.belongsToAgent(bookingId, agentId);
      if (!belongs) {
        throw new Error('Booking not found or does not belong to you');
      }

      const booking = await bookingRepository.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if booking can be cancelled
      if (booking.booking_status === 'CANCELLED') {
        throw new Error('Booking is already cancelled');
      }

      if (booking.booking_status === 'FAILED') {
        throw new Error('Cannot cancel a failed booking');
      }

      // Cancel with airline API
      let cancellationResult;
      try {
        cancellationResult = await flightApiService.cancelFlight(booking.supplier_booking_id);
      } catch (apiError) {
        logger.warn('Airline cancellation failed, proceeding with internal cancellation:', apiError.message);
      }

      // Calculate refund
      const cancellationCharges = booking.total_amount * 0.10; // 10% cancellation fee
      const refundAmount = booking.total_amount - cancellationCharges;

      // Update booking
      await bookingRepository.updateBooking(bookingId, {
        bookingStatus: 'CANCELLED',
        cancellationCharges,
        cancelledAt: new Date(),
        refundAmount,
        refundStatus: 'PENDING',
      });

      // Refund to wallet
      const refundResult = await walletRepository.rechargeWallet(
        agentId,
        refundAmount,
        0, // Payment ID for refund
        `Refund for cancelled booking ${booking.booking_reference} (Charges: ₹${cancellationCharges})`
      );

      // Reverse commission
      await commissionRepository.reverseCommission(bookingId, reason);

      return {
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          bookingId,
          bookingReference: booking.booking_reference,
          cancellationCharges,
          refundAmount,
          walletNewBalance: refundResult.newBalance,
        },
      };
    } catch (error) {
      logger.error('cancelBooking error:', error);
      throw error;
    }
  }

  /**
   * Get booking details
   * @param {string} bookingReference - Booking reference
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async getBookingDetails(bookingReference, agentId) {
    try {
      const booking = await bookingRepository.getBookingByReference(bookingReference);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify belongs to agent
      if (booking.agent_id !== agentId) {
        throw new Error('Access denied');
      }

      return {
        success: true,
        data: {
          bookingId: booking.booking_id,
          bookingReference: booking.booking_reference,
          pnr: booking.pnr,
          bookingStatus: booking.booking_status,
          paymentStatus: booking.payment_status,
          flight: {
            airline: booking.airline_name,
            airlineCode: booking.airline_code,
            flightNumber: booking.flight_number,
            origin: booking.origin_airport,
            originCity: booking.origin_city,
            destination: booking.destination_airport,
            destinationCity: booking.destination_city,
            departureTime: booking.departure_datetime,
            arrivalTime: booking.arrival_datetime,
            duration: booking.flight_duration_minutes,
            cabinClass: booking.cabin_class,
          },
          pricing: {
            baseFare: booking.base_fare,
            taxes: booking.taxes,
            totalAmount: booking.total_amount,
            commissionAmount: booking.commission_amount,
          },
          travelers: booking.travelers || [],
          dates: {
            bookedAt: booking.booking_date,
            travelDate: booking.travel_start_date,
          },
        },
      };
    } catch (error) {
      logger.error('getBookingDetails error:', error);
      throw error;
    }
  }

  /**
   * Get agent bookings
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getAgentBookings(agentId, filters, page, limit) {
    try {
      const result = await bookingRepository.getAgentBookings(agentId, filters, page, limit);
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
      logger.error('getAgentBookings error:', error);
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
  async getAllBookings(filters, page, limit) {
    try {
      const result = await bookingRepository.getAllBookings(filters, page, limit);
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
      logger.error('getAllBookings error:', error);
      throw error;
    }
  }

  // =====================================================================
  // PRIVATE METHODS
  // =====================================================================

  /**
   * Calculate and record commission for a booking
   * @private
   */
  async _calculateAndRecordCommission(bookingId, agentId, flight) {
    try {
      // Get agent tier
      const userRepository = require('../repositories/userRepository');
      const user = await userRepository.findById(agentId);
      const agentTier = user?.agent_tier || 'SILVER';

      // Find applicable commission rule
      const rule = await commissionRepository.getApplicableRule({
        agentTier,
        bookingType: 'FLIGHT',
        baseFare: flight.price.baseFare,
        airlineCode: flight.airlineCode,
        cabinClass: flight.cabinClass,
      });

      let percentage = 2.0; // Default 2%
      let ruleId = null;

      if (rule) {
        percentage = rule.commission_percentage || 2.0;
        ruleId = rule.rule_id;
      }

      // Calculate commission
      const commissionAmount = flight.price.baseFare * (percentage / 100);

      // Tier bonus
      let incentiveAmount = 0;
      if (agentTier === 'GOLD') {
        incentiveAmount = commissionAmount * 0.10; // 10% bonus
      } else if (agentTier === 'PLATINUM') {
        incentiveAmount = commissionAmount * 0.20; // 20% bonus
      }

      const totalCommission = commissionAmount + incentiveAmount;

      // TDS (5%)
      const tdsPercentage = 5.0;
      const tdsAmount = totalCommission * (tdsPercentage / 100);
      const netCommission = totalCommission - tdsAmount;

      // Record commission
      const commissionId = await commissionRepository.createCommission({
        agentId,
        bookingId,
        bookingType: 'FLIGHT',
        baseAmount: flight.price.baseFare,
        ruleId,
        percentage,
        commissionAmount,
        incentiveAmount,
        totalCommission,
        tdsPercentage,
        tdsAmount,
        netCommission,
      });

      // Update booking with commission
      await bookingRepository.updateBooking(bookingId, {
        updatedBy: agentId,
      });

      const availableAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return {
        commissionId,
        percentage,
        commissionAmount,
        incentiveAmount,
        tdsAmount,
        netCommission,
        availableAfter,
      };
    } catch (error) {
      logger.error('_calculateAndRecordCommission error:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();