const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// All cart routes require authentication
router.use(authenticateToken);

// GET /api/cart - Get current user's cart
router.get('/', cartController.getCart);

// GET /api/cart/count - Get cart item count (for cart badge)
router.get('/count', cartController.getCartCount);

// GET /api/cart/validate - Validate cart items
router.get('/validate', cartController.validateCart);

// POST /api/cart/add - Add item to cart
router.post('/add', cartController.addToCart);

// POST /api/cart/clear - Clear entire cart
router.post('/clear', cartController.clearCart);

// PUT /api/cart/item/:productId - Update item quantity in cart
router.put('/item/:productId', cartController.updateCartItem);

// DELETE /api/cart/item/:productId - Remove item from cart
router.delete('/item/:productId', cartController.removeFromCart);

module.exports = router; 