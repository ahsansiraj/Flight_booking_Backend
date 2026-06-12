/*******************************************************************************
 * Commission Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const commissionController = require('../controllers/commissionController');
const { verifyToken } = require('../middlewares/auth');
const { isAgent, isAdmin } = require('../middlewares/rbac');
const commissionValidators = require('../validators/commissionValidator');

// All routes require authentication
router.use(verifyToken);

// Agent Routes
router.get('/summary',
  isAgent,
  commissionController.getSummary
);

router.get('/history',
  isAgent,
  commissionValidators.getCommissionReport,
  commissionController.getHistory
);

router.post('/payout/request',
  isAgent,
  commissionValidators.requestPayout,
  commissionController.requestPayout
);

router.get('/payout/history',
  isAgent,
  commissionController.getPayoutHistory
);

module.exports = router;