const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authenticateToken);

// GET /api/wallet - Get wallet details and balance
router.get('/', walletController.getWallet);

// GET /api/wallet/balance - Get wallet balance only
router.get('/balance', walletController.checkBalance);

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions', walletController.getTransactionHistory);

// POST /api/wallet/deposit - Add funds to wallet (for testing)
router.post('/deposit', walletController.addFunds);

// GET /api/wallet/check-balance - Check if sufficient balance for amount
router.get('/check-balance', walletController.checkSufficientBalance);

module.exports = router; 