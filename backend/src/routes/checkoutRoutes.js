const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { authenticateToken } = require('../middleware/auth');

// All checkout routes require authentication
router.use(authenticateToken);

// POST /api/checkout - Process checkout and create order
router.post('/', checkoutController.processCheckout);

// GET /api/checkout/summary - Get checkout summary before processing
router.get('/summary', checkoutController.getCheckoutSummary);

// GET /api/checkout/orders - Get user's order history
router.get('/orders', checkoutController.getOrderHistory);

// GET /api/checkout/orders/:orderId - Get specific order by ID
router.get('/orders/:orderId', checkoutController.getOrder);

module.exports = router; 