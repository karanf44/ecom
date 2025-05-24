const cartService = require('../services/cartService');
const authService = require('../services/authService');

// Helper function to create response
const createResponse = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  },
  body: JSON.stringify(data)
});

// Helper function to extract user ID from JWT token
const getUserIdFromToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const decoded = authService.verifyToken(token);
  return decoded.userId;
};

// Get cart handler
const getCart = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userId = await getUserIdFromToken(event.headers.Authorization || event.headers.authorization);
    
    const cart = await cartService.getCartSummary(userId);
    
    return createResponse(200, {
      success: true,
      data: { cart }
    });
    
  } catch (error) {
    console.error('Get cart error:', error);
    
    const statusCode = error.message.includes('Authorization') ? 401 : 500;
    
    return createResponse(statusCode, {
      success: false,
      message: error.message || 'Failed to retrieve cart'
    });
  }
};

// Add to cart handler
const addToCart = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userId = await getUserIdFromToken(event.headers.Authorization || event.headers.authorization);
    const { productId, quantity } = JSON.parse(event.body);
    
    // Validate input
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    const qty = parseInt(quantity) || 1;
    if (qty <= 0) {
      return createResponse(400, {
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }
    
    const cart = await cartService.addToCart(userId, productId, qty);
    const cartSummary = await cartService.getCartSummary(userId);
    
    return createResponse(200, {
      success: true,
      message: 'Item added to cart successfully',
      data: { cart: cartSummary }
    });
    
  } catch (error) {
    console.error('Add to cart error:', error);
    
    let statusCode = 500;
    if (error.message.includes('Authorization')) statusCode = 401;
    else if (error.message.includes('not found') || error.message.includes('stock')) statusCode = 400;
    
    return createResponse(statusCode, {
      success: false,
      message: error.message || 'Failed to add item to cart'
    });
  }
};

// Update cart item handler
const updateCartItem = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userId = await getUserIdFromToken(event.headers.Authorization || event.headers.authorization);
    const { productId, quantity } = JSON.parse(event.body);
    
    // Validate input
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return createResponse(400, {
        success: false,
        message: 'Quantity must be a non-negative integer'
      });
    }
    
    const cart = await cartService.updateCartItem(userId, productId, qty);
    const cartSummary = await cartService.getCartSummary(userId);
    
    return createResponse(200, {
      success: true,
      message: 'Cart item updated successfully',
      data: { cart: cartSummary }
    });
    
  } catch (error) {
    console.error('Update cart item error:', error);
    
    let statusCode = 500;
    if (error.message.includes('Authorization')) statusCode = 401;
    else if (error.message.includes('not found') || error.message.includes('stock')) statusCode = 400;
    
    return createResponse(statusCode, {
      success: false,
      message: error.message || 'Failed to update cart item'
    });
  }
};

// Remove from cart handler
const removeFromCart = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userId = await getUserIdFromToken(event.headers.Authorization || event.headers.authorization);
    const { productId } = JSON.parse(event.body);
    
    // Validate input
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    const cart = await cartService.removeFromCart(userId, productId);
    const cartSummary = await cartService.getCartSummary(userId);
    
    return createResponse(200, {
      success: true,
      message: 'Item removed from cart successfully',
      data: { cart: cartSummary }
    });
    
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    const statusCode = error.message.includes('Authorization') ? 401 : 500;
    
    return createResponse(statusCode, {
      success: false,
      message: error.message || 'Failed to remove item from cart'
    });
  }
};

// Clear cart handler
const clearCart = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userId = await getUserIdFromToken(event.headers.Authorization || event.headers.authorization);
    
    const cart = await cartService.clearCart(userId);
    
    return createResponse(200, {
      success: true,
      message: 'Cart cleared successfully',
      data: { cart }
    });
    
  } catch (error) {
    console.error('Clear cart error:', error);
    
    const statusCode = error.message.includes('Authorization') ? 401 : 500;
    
    return createResponse(statusCode, {
      success: false,
      message: error.message || 'Failed to clear cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
}; 