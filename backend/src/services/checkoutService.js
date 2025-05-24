const db = require('../config/knex');
const cartService = require('./cartService');
const walletService = require('./walletService');

class CheckoutService {
  // Process checkout - creates order and handles wallet transaction
  async processCheckout(userId, checkoutData = {}) {
    const trx = await db.transaction();
    
    try {
      // Get user's cart
      const cart = await cartService.getCart(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate total amount
      const totalAmount = cart.items.reduce((total, item) => {
        // Ensure price and quantity are numbers
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity, 10);
        if (isNaN(price) || isNaN(quantity)) {
            console.warn('Invalid price or quantity for item in cart during checkout:', item);
            return total; // skip this item or handle error as appropriate
        }
        return total + (price * quantity);
      }, 0);

      // Check if user has sufficient wallet balance
      const hasSufficientBalance = await walletService.hasSufficientBalance(userId, totalAmount);
      
      if (!hasSufficientBalance) {
        const currentBalance = await walletService.getBalance(userId);
        throw new Error(`Insufficient wallet balance. Required: $${totalAmount.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`);
      }

      // Create order record
      const orderData = {
        user_id: userId,
        total_amount: totalAmount,
        status: 'confirmed',
        shipping_details: JSON.stringify(checkoutData.shippingAddress),
        items: JSON.stringify(cart.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity, 10),
          imageUrl: item.imageUrl,
          total: parseFloat(item.price) * parseInt(item.quantity, 10)
        })))
      };

      const [order] = await trx('orders')
        .insert(orderData)
        .returning(['order_id', 'user_id', 'total_amount', 'status', 'shipping_details', 'items', 'created_at', 'updated_at']);

      // Deduct amount from wallet
      await walletService.deductFunds(
        userId, 
        totalAmount, 
        `Order #${order.order_id} - Purchase`
      );

      // Clear the cart
      await cartService.clearCart(userId);

      await trx.commit();

      // Return order details
      return {
        id: order.order_id,
        user_id: order.user_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        shipping_address: typeof order.shipping_details === 'string' ? JSON.parse(order.shipping_details) : order.shipping_details,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        created_at: order.created_at,
        updated_at: order.updated_at
      };

    } catch (error) {
      await trx.rollback();
      console.error('Checkout process error:', error);
      throw error;
    }
  }

  // Get order by ID
  async getOrderById(orderId, userId) {
    try {
      const order = await db('orders')
        .where({ order_id: orderId, user_id: userId })
        .select(['order_id', 'user_id', 'total_amount', 'status', 'shipping_details', 'items', 'created_at', 'updated_at'])
        .first();

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        id: order.order_id,
        userId: order.user_id,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        shippingAddress: typeof order.shipping_details === 'string' ? JSON.parse(order.shipping_details) : order.shipping_details,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get user's order history
  async getOrderHistory(userId, limit = 20, offset = 0) {
    try {
      const orders = await db('orders')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select(['order_id', 'user_id', 'total_amount', 'status', 'shipping_details', 'items', 'created_at', 'updated_at']);

      const totalOrders = await db('orders')
        .where('user_id', userId)
        .count('order_id as count')
        .first();

      const formattedOrders = orders.map(order => ({
        id: order.order_id,
        user_id: order.user_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        shipping_address: typeof order.shipping_details === 'string' ? JSON.parse(order.shipping_details) : order.shipping_details,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        created_at: order.created_at,
        updated_at: order.updated_at
      }));

      return {
        orders: formattedOrders,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(totalOrders.count / limit),
          totalCount: parseInt(totalOrders.count),
          hasNextPage: offset + limit < totalOrders.count,
          hasPrevPage: offset > 0
        }
      };
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }

  // Calculate checkout summary (before actual checkout)
  async getCheckoutSummary(userId) {
    try {
      const cart = await cartService.getCart(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const subtotal = cart.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Example: Shipping logic (matches cart page hint)
      const shippingCost = subtotal > 50 ? 0 : 5.99;
      
      // Example: Tax logic (e.g., 7% of subtotal)
      const taxAmount = subtotal * 0.07;
      
      const grandTotalAmount = subtotal + shippingCost + taxAmount;

      const currentBalance = await walletService.getBalance(userId);
      const hasSufficientBalance = currentBalance >= grandTotalAmount;

      return {
        items: cart.items,
        totalItems: cart.summary?.totalItems || cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: parseFloat(subtotal.toFixed(2)),
        shipping: parseFloat(shippingCost.toFixed(2)),
        tax: parseFloat(taxAmount.toFixed(2)),
        grandTotal: parseFloat(grandTotalAmount.toFixed(2)),
        currentWalletBalance: parseFloat(currentBalance.toFixed(2)),
        hasSufficientBalance,
        shortfall: hasSufficientBalance ? 0 : parseFloat((grandTotalAmount - currentBalance).toFixed(2))
      };
    } catch (error) {
      console.error('Error calculating checkout summary:', error);
      throw error;
    }
  }
}

module.exports = new CheckoutService(); 