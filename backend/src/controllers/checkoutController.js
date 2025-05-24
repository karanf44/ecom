const checkoutService = require('../services/checkoutService');

// Process checkout and create order
const processCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shipping_address, notes } = req.body;

    // Basic validation for shipping_address object and its fields
    if (!shipping_address || typeof shipping_address !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Shipping address object is required'
      });
    }

    const requiredFields = ['name', 'address_line_1', 'city', 'state', 'postal_code', 'country'];
    const missingFields = [];
    for (const field of requiredFields) {
      if (!shipping_address[field] || String(shipping_address[field]).trim().length === 0) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required shipping fields: ${missingFields.join(', ')}`
      });
    }

    // Sanitize shipping_address fields
    const sanitizedShippingAddress = {};
    for (const key in shipping_address) {
      if (Object.hasOwnProperty.call(shipping_address, key) && typeof shipping_address[key] === 'string') {
        sanitizedShippingAddress[key] = shipping_address[key].trim();
      } else {
        sanitizedShippingAddress[key] = shipping_address[key];
      }
    }
    
    const checkoutData = {
      shippingAddress: sanitizedShippingAddress,
      notes: notes || ''
    };

    const order = await checkoutService.processCheckout(userId, checkoutData);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
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