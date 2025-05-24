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
        return total + (parseFloat(item.price) * item.quantity);
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
        status: 'completed',
        shipping_address: checkoutData.shippingAddress || 'Default Address',
        order_items: JSON.stringify(cart.items.map(item => ({
          productId: item.product_id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          total: parseFloat(item.price) * item.quantity
        })))
      };

      const [order] = await trx('orders')
        .insert(orderData)
        .returning(['id', 'user_id', 'total_amount', 'status', 'shipping_address', 'order_items', 'created_at']);

      // Deduct amount from wallet
      await walletService.deductFunds(
        userId, 
        totalAmount, 
        `Order #${order.id} - Purchase`
      );

      // Clear the cart
      await cartService.clearCart(userId);

      await trx.commit();

      // Return order details
      return {
        orderId: order.id,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        shippingAddress: order.shipping_address,
        items: JSON.parse(order.order_items),
        createdAt: order.created_at
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
        .where({ id: orderId, user_id: userId })
        .select(['id', 'user_id', 'total_amount', 'status', 'shipping_address', 'order_items', 'created_at', 'updated_at'])
        .first();

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        orderId: order.id,
        userId: order.user_id,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        shippingAddress: order.shipping_address,
        items: JSON.parse(order.order_items),
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
        .select(['id', 'total_amount', 'status', 'shipping_address', 'order_items', 'created_at']);

      const totalOrders = await db('orders')
        .where('user_id', userId)
        .count('id as count')
        .first();

      const formattedOrders = orders.map(order => ({
        orderId: order.id,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        shippingAddress: order.shipping_address,
        items: JSON.parse(order.order_items),
        createdAt: order.created_at
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

      const totalAmount = cart.items.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0);

      const currentBalance = await walletService.getBalance(userId);
      const hasSufficientBalance = currentBalance >= totalAmount;

      return {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: totalAmount,
        currentWalletBalance: parseFloat(currentBalance),
        hasSufficientBalance,
        shortfall: hasSufficientBalance ? 0 : totalAmount - currentBalance
      };
    } catch (error) {
      console.error('Error calculating checkout summary:', error);
      throw error;
    }
  }
}

module.exports = new CheckoutService(); 