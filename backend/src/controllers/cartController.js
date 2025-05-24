const cartService = require('../services/cartService');

class CartController {
  
  // GET /api/cart - Get current user's cart
  async getCart(req, res) {
    try {
      const userId = req.user.id;
      
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      res.status(200).json({
        success: true,
        data: { cart: cartWithSummary }
      });
    } catch (error) {
      console.error('Error in getCart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cart',
        error: error.message
      });
    }
  }
  
  // POST /api/cart/add - Add item to cart
  async addToCart(req, res) {
    try {
      const userId = req.user.id;
      const { productId, quantity = 1 } = req.body;
      
      // Basic validation
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer'
        });
      }
      
      const updatedCart = await cartService.addToCart(userId, productId, quantity);
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: { cart: cartWithSummary }
      });
    } catch (error) {
      console.error('Error in addToCart:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('stock')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to add item to cart',
        error: error.message
      });
    }
  }
  
  // PUT /api/cart/item/:productId - Update item quantity in cart
  async updateCartItem(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { quantity } = req.body;
      
      // Basic validation
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      if (quantity < 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a non-negative integer'
        });
      }
      
      const updatedCart = await cartService.updateCartItem(userId, productId, quantity);
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      const message = quantity === 0 ? 'Item removed from cart' : 'Cart item updated successfully';
      
      res.status(200).json({
        success: true,
        message,
        data: { cart: cartWithSummary }
      });
    } catch (error) {
      console.error('Error in updateCartItem:', error);
      
      if (error.message === 'Product not found' || error.message === 'Item not found in cart') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('stock')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update cart item',
        error: error.message
      });
    }
  }
  
  // DELETE /api/cart/item/:productId - Remove item from cart
  async removeFromCart(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      
      // Basic validation
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      const updatedCart = await cartService.removeFromCart(userId, productId);
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        data: { cart: cartWithSummary }
      });
    } catch (error) {
      console.error('Error in removeFromCart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove item from cart',
        error: error.message
      });
    }
  }
  
  // POST /api/cart/clear - Clear entire cart
  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      
      const clearedCart = await cartService.clearCart(userId);
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: { cart: cartWithSummary }
      });
    } catch (error) {
      console.error('Error in clearCart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cart',
        error: error.message
      });
    }
  }
  
  // GET /api/cart/validate - Validate cart items (check stock, prices, etc.)
  async validateCart(req, res) {
    try {
      const userId = req.user.id;
      
      const validation = await cartService.validateCart(userId);
      
      res.status(200).json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error in validateCart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate cart',
        error: error.message
      });
    }
  }
  
  // GET /api/cart/count - Get cart item count (useful for cart icon badge)
  async getCartCount(req, res) {
    try {
      const userId = req.user.id;
      
      const cartWithSummary = await cartService.getCartSummary(userId);
      
      res.status(200).json({
        success: true,
        data: {
          totalItems: cartWithSummary.summary.totalItems,
          itemCount: cartWithSummary.summary.itemCount
        }
      });
    } catch (error) {
      console.error('Error in getCartCount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cart count',
        error: error.message
      });
    }
  }
}

module.exports = new CartController(); 