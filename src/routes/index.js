/*******************************************************************************
 * Main Route Handler
 * Aggregate all API routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const walletRoutes = require('./walletRoutes');
const bookingRoutes = require('./bookingRoutes');
const commissionRoutes = require('./commissionRoutes');
const adminRoutes = require('./adminRoutes');

// Public Routes
router.use('/auth', authRoutes);

// Protected Routes (Agent)
router.use('/wallet', walletRoutes);
router.use('/bookings', bookingRoutes);
router.use('/commissions', commissionRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;