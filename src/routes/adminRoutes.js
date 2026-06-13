/*******************************************************************************
 * Admin Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const commissionController = require('../controllers/commissionController');
const { verifyToken } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/rbac');
const commissionValidators = require('../validators/commissionValidator');

// All admin routes require admin authentication
router.use(verifyToken, isAdmin);

// Booking Management
router.get('/bookings', bookingController.getAllBookings);

// Commission Rules
router.post('/commission-rules',
  ...commissionValidators.createRule,
  commissionController.createRule
);

// Payout Management
router.get('/payouts/pending', commissionController.getPendingPayouts);

router.post('/payouts/:payoutId/process',
  ...commissionValidators.approvePayout,
  commissionController.processPayout
);

module.exports = router;