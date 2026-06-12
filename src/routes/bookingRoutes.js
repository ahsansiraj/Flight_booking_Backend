/*******************************************************************************
 * Booking Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middlewares/auth');
const { isAgent, isAdmin, isAgentOrAdmin } = require('../middlewares/rbac');
const bookingValidators = require('../validators/bookingValidator');

// All routes require authentication
router.use(verifyToken);

// Agent Routes
router.get('/search',
  isAgent,
  bookingValidators.searchFlight,
  bookingController.searchFlights
);

router.post('/',
  isAgent,
  bookingValidators.createBooking,
  bookingController.createBooking
);

router.get('/:bookingReference',
  isAgent,
  bookingValidators.getBooking,
  bookingController.getBooking
);

router.get('/',
  isAgent,
  bookingValidators.getBookings,
  bookingController.getBookings
);

router.post('/:bookingId/cancel',
  isAgent,
  bookingValidators.cancelBooking,
  bookingController.cancelBooking
);

module.exports = router;