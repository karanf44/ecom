const checkoutService = require('../services/checkoutService');

// Process checkout and create order
const processCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, notes } = req.body;

    // Basic validation
    if (!shippingAddress || shippingAddress.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    const checkoutData = {
      shippingAddress: shippingAddress.trim(),
      notes: notes || ''
    };

    const order = await checkoutService.processCheckout(userId, checkoutData);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Checkout process error:', error);
    
    // Handle specific error cases
    if (error.message.includes('Cart is empty')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot checkout with an empty cart'
      });
    }
    
    if (error.message.includes('Insufficient wallet balance')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Checkout failed'
    });
  }
};

// Get checkout summary (before actual checkout)
const getCheckoutSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const summary = await checkoutService.getCheckoutSummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get checkout summary error:', error);
    
    if (error.message.includes('Cart is empty')) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get checkout summary'
    });
  }
};

// Get order by ID
const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await checkoutService.getOrderById(orderId, userId);

    res.status(200).json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    
    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order'
    });
  }
};

// Get user's order history
const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await checkoutService.getOrderHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        orders: result.orders,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order history'
    });
  }
};

module.exports = {
  processCheckout,
  getCheckoutSummary,
  getOrder,
  getOrderHistory
}; 