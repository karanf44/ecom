const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const checkoutController = require('../controllers/checkoutController');
const { authenticateToken } = require('../middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware for all checkout routes
app.use(authenticateToken);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Checkout handler error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Individual checkout handlers
const processCheckout = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.post('/checkout', checkoutController.processCheckout);
  return serverless(app)(event, context);
});

const getCheckoutSummary = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/checkout/summary', checkoutController.getCheckoutSummary);
  return serverless(app)(event, context);
});

const getOrderHistory = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/checkout/orders', checkoutController.getOrderHistory);
  return serverless(app)(event, context);
});

const getOrder = serverless(async (event, context) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/checkout/orders/:orderId', checkoutController.getOrder);
  return serverless(app)(event, context);
});

module.exports = {
  processCheckout,
  getCheckoutSummary,
  getOrderHistory,
  getOrder
}; 