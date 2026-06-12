/*******************************************************************************
 * Wallet Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/rbac');
const { validators, handleValidationErrors } = require('../middlewares/validator');

// All wallet routes are protected and only for agents
router.use(verifyToken); // Authentication required
router.use(checkRole(['AGENT', 'ADMIN'])); // Authorization check

// Wallet Management
router.get('/summary', walletController.getWalletSummary);

router.get('/balance', walletController.getBalance);

router.post(
  '/recharge',
  validators.amount,
  handleValidationErrors,
  walletController.rechargeWallet
);

router.get(
  '/transactions',
  ...validators.pagination,
  handleValidationErrors,
  walletController.getTransactionHistory
);

router.post(
  '/check-balance',
  validators.amount,
  handleValidationErrors,
  walletController.checkBalance
);

router.get(
  '/reconciliation',
  walletController.reconcileBalance
);

module.exports = router;