const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware for all wallet routes
app.use(authenticateToken);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Wallet handler error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Individual wallet handlers
const getWallet = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/wallet', walletController.getWallet);
  return serverless(app)(event, context);
});

const getTransactionHistory = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/wallet/transactions', walletController.getTransactionHistory);
  return serverless(app)(event, context);
});

const addFunds = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.post('/wallet/deposit', walletController.addFunds);
  return serverless(app)(event, context);
});

const checkBalance = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/wallet/balance', walletController.checkBalance);
  return serverless(app)(event, context);
});

module.exports = {
  getWallet,
  getTransactionHistory,
  addFunds,
  checkBalance
}; 