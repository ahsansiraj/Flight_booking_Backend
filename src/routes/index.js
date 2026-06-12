/*******************************************************************************
 * Main Route Handler
 * Aggregate all API routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const walletRoutes = require('./walletRoutes');

// Route mounting
router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;