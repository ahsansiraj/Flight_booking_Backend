/*******************************************************************************
 * Booking Controller
 * HTTP request handlers for booking operations
 ******************************************************************************/

const bookingService = require('../services/bookingService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

class BookingController {
  /**
   * GET /api/v1/bookings/search
   * Search flights
   */
  searchFlights = asyncHandler(async (req, res) => {
    const searchParams = {
      origin: req.query.origin?.toUpperCase(),
      destination: req.query.destination?.toUpperCase(),
      departureDate: req.query.departureDate,
      returnDate: req.query.returnDate,
      adults: parseInt(req.query.adults) || 1,
      children: parseInt(req.query.children) || 0,
      infants: parseInt(req.query.infants) || 0,
      cabinClass: req.query.cabinClass || 'ECONOMY',
    };

    const result = await bookingService.searchFlights(searchParams);

    return ResponseHandler.success(res, {
      results: result.results,
      totalCount: result.totalCount,
      searchId: result.searchId,
      searchParams,
    }, 'Flights found');
  });

  /**
   * POST /api/v1/bookings
   * Create flight booking
   */
  createBooking = asyncHandler(async (req, res) => {
    const bookingData = {
      agentId: req.user.user_id,
      flightId: req.body.flightId,
      customerId: req.body.customerId,
      travelers: req.body.travelers,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
    };

    const result = await bookingService.createBooking(bookingData, {
      userId: req.user.user_id,
      ipAddress: req.ip,
    });

    return ResponseHandler.created(res, result.data, result.message);
  });

  /**
   * GET /api/v1/bookings/:bookingReference
   * Get booking details
   */
  getBooking = asyncHandler(async (req, res) => {
    const { bookingReference } = req.params;
    const agentId = req.user.user_id;

    const result = await bookingService.getBookingDetails(bookingReference, agentId);

    return ResponseHandler.success(res, result.data, 'Booking details retrieved');
  });

  /**
   * GET /api/v1/bookings
   * Get agent's bookings
   */
  getBookings = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const result = await bookingService.getAgentBookings(agentId, filters, page, limit);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Bookings retrieved'
    );
  });

  /**
   * POST /api/v1/bookings/:bookingId/cancel
   * Cancel booking
   */
  cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const agentId = req.user.user_id;

    const result = await bookingService.cancelBooking(
      parseInt(bookingId),
      agentId,
      reason
    );

    return ResponseHandler.success(res, result.data, result.message);
  });

  // =====================================================================
  // ADMIN ENDPOINTS
  // =====================================================================

  /**
   * GET /api/v1/admin/bookings
   * Get all bookings (admin)
   */
  getAllBookings = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      agentId: req.query.agentId,
      status: req.query.status,
    };

    const result = await bookingService.getAllBookings(filters, page, limit);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'All bookings retrieved'
    );
  });
}

module.exports = new BookingController();