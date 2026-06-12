/*******************************************************************************
 * Flight API Service
 * Integration with third-party flight booking API
 * 
 * NOTE: Replace with actual API provider
 ******************************************************************************/

const logger = require('../utils/logger');

class FlightApiService {
  constructor() {
    this.baseUrl = process.env.FLIGHT_API_URL || 'https://api.flightprovider.com';
    this.apiKey = process.env.FLIGHT_API_KEY || 'test_key';
  }

  /**
   * Search flights
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>}
   */
  async searchFlights(searchParams) {
    try {
      const {
        origin,
        destination,
        departureDate,
        returnDate,
        adults = 1,
        children = 0,
        infants = 0,
        cabinClass = 'ECONOMY',
      } = searchParams;

      // For demo: return mock flights
      // In production, call actual API
      const mockFlights = this._generateMockFlights(origin, destination, departureDate, cabinClass);

      logger.info(`Flight search: ${origin} -> ${destination} on ${departureDate}`);

      return {
        success: true,
        results: mockFlights,
        totalCount: mockFlights.length,
        searchId: `SEARCH_${Date.now()}`,
      };
    } catch (error) {
      logger.error('Flight search error:', error);
      throw new Error('Flight search failed. Please try again.');
    }
  }

  /**
   * Get flight details by ID
   * @param {string} flightId - Flight ID from search results
   * @returns {Promise<Object>}
   */
  async getFlightDetails(flightId) {
    try {
      // Mock response
      const mockFlight = {
        flightId,
        airlineCode: '6E',
        airlineName: 'IndiGo',
        flightNumber: '6E-2345',
        origin: 'DEL',
        originCity: 'Delhi',
        destination: 'BOM',
        destinationCity: 'Mumbai',
        departureTime: '2025-02-15T08:30:00',
        arrivalTime: '2025-02-15T10:45:00',
        duration: 135,
        cabinClass: 'ECONOMY',
        price: {
          baseFare: 4500,
          taxes: 850,
          fees: 350,
          total: 5700,
          currency: 'INR',
        },
        baggage: {
          checkIn: '15 KG',
          cabin: '7 KG',
        },
        seatsAvailable: 12,
        isRefundable: true,
        cancellationCharges: '25%',
        status: 'AVAILABLE',
      };

      return {
        success: true,
        flight: mockFlight,
      };
    } catch (error) {
      logger.error('Get flight details error:', error);
      throw new Error('Failed to get flight details');
    }
  }

  /**
   * Book flight with airline
   * @param {Object} bookingData - Booking details
   * @returns {Promise<Object>}
   */
  async bookFlight(bookingData) {
    try {
      // Mock booking response
      const mockBooking = {
        supplierBookingId: `SUP_${Date.now()}`,
        pnr: `PNR${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'CONFIRMED',
        ticketNumbers: bookingData.travelers.map((_, i) => 
          `TKT${Date.now()}${String(i + 1).padStart(2, '0')}`
        ),
        bookedAt: new Date().toISOString(),
      };

      logger.info(`Flight booked via API: PNR ${mockBooking.pnr}`);

      return {
        success: true,
        booking: mockBooking,
      };
    } catch (error) {
      logger.error('Flight booking error:', error);
      throw new Error('Flight booking failed');
    }
  }

  /**
   * Cancel flight booking
   * @param {string} supplierBookingId - Supplier booking ID
   * @returns {Promise<Object>}
   */
  async cancelFlight(supplierBookingId) {
    try {
      const mockCancellation = {
        supplierBookingId,
        status: 'CANCELLED',
        refundAmount: 4275,
        cancellationCharges: 1425,
        cancelledAt: new Date().toISOString(),
      };

      logger.info(`Flight cancelled via API: ${supplierBookingId}`);

      return {
        success: true,
        cancellation: mockCancellation,
      };
    } catch (error) {
      logger.error('Flight cancellation error:', error);
      throw new Error('Flight cancellation failed');
    }
  }

  /**
   * Generate mock flight data for development
   */
  _generateMockFlights(origin, destination, departureDate, cabinClass) {
    const airlines = [
      { code: '6E', name: 'IndiGo', type: 'LOW_COST' },
      { code: 'AI', name: 'Air India', type: 'FULL_SERVICE' },
      { code: 'SG', name: 'SpiceJet', type: 'LOW_COST' },
      { code: 'UK', name: 'Vistara', type: 'FULL_SERVICE' },
    ];

    const flights = [];

    airlines.forEach((airline, index) => {
      const baseFare = cabinClass === 'ECONOMY' 
        ? 3000 + Math.floor(Math.random() * 5000)
        : cabinClass === 'BUSINESS'
        ? 15000 + Math.floor(Math.random() * 15000)
        : 5000 + Math.floor(Math.random() * 8000);

      const taxes = Math.floor(baseFare * 0.15);
      const fees = 350 + Math.floor(Math.random() * 200);

      flights.push({
        flightId: `FL${Date.now()}${index}`,
        airlineCode: airline.code,
        airlineName: airline.name,
        airlineType: airline.type,
        flightNumber: `${airline.code}-${1000 + Math.floor(Math.random() * 9000)}`,
        origin,
        destination,
        departureTime: `${departureDate}T${6 + index * 2}:${index % 2 === 0 ? '00' : '30'}:00`,
        arrivalTime: `${departureDate}T${8 + index * 2}:${index % 2 === 0 ? '30' : '00'}:00`,
        duration: 120 + Math.floor(Math.random() * 60),
        cabinClass,
        price: {
          baseFare,
          taxes,
          fees,
          total: baseFare + taxes + fees,
          currency: 'INR',
        },
        baggage: {
          checkIn: cabinClass === 'ECONOMY' ? '15 KG' : '25 KG',
          cabin: cabinClass === 'ECONOMY' ? '7 KG' : '12 KG',
        },
        seatsAvailable: 5 + Math.floor(Math.random() * 40),
        isRefundable: Math.random() > 0.3,
        stops: Math.floor(Math.random() * 2),
        status: 'AVAILABLE',
      });
    });

    // Sort by price
    flights.sort((a, b) => a.price.total - b.price.total);

    return flights;
  }
}

module.exports = new FlightApiService();