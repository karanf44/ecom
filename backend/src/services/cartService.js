const db = require('../config/knex');
const productService = require('./productService');

class CartService {
  
  // Get user's cart
  async getCart(userId) {
    const cart = await db('carts')
      .where('user_id', userId)
      .first();
    
    if (!cart) {
      // Create empty cart if none exists
      return await this.createEmptyCart(userId);
    }
    
    return cart;
  }
  
  // Create empty cart for user
  async createEmptyCart(userId) {
    const [cart] = await db('carts')
      .insert({
        user_id: userId,
        items: JSON.stringify([])
      })
      .returning('*');
    
    return cart;
  }
  
  // Add item to cart
  async addToCart(userId, productId, quantity = 1) {
    // First, verify the product exists and get its details
    const product = await productService.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Check if there's enough stock
    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }
    
    // Get current cart
    const cart = await this.getCart(userId);
    let items = cart.items || [];
    
    // Check if item already exists in cart
    const existingItemIndex = items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newQuantity = items[existingItemIndex].quantity + quantity;
      
      // Check total quantity against stock
      if (product.stock < newQuantity) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }
      
      items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      const cartItem = {
        productId: product.id,
        quantity: quantity,
        name: product.name,
        price: product.price,
        imageUrl: product.image_url
      };
      items.push(cartItem);
    }
    
    // Update cart in database
    const [updatedCart] = await db('carts')
      .where('user_id', userId)
      .update({
        items: JSON.stringify(items),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return updatedCart;
  }
  
  // Update item quantity in cart
  async updateCartItem(userId, productId, quantity) {
    if (quantity <= 0) {
      return await this.removeFromCart(userId, productId);
    }
    
    // Verify the product exists and check stock
    const product = await productService.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }
    
    // Get current cart
    const cart = await this.getCart(userId);
    let items = cart.items || [];
    
    // Find and update the item
    const itemIndex = items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }
    
    // Update the item with fresh product data
    items[itemIndex] = {
      productId: product.id,
      quantity: quantity,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url
    };
    
    // Update cart in database
    const [updatedCart] = await db('carts')
      .where('user_id', userId)
      .update({
        items: JSON.stringify(items),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return updatedCart;
  }
  
  // Remove item from cart
  async removeFromCart(userId, productId) {
    // Get current cart
    const cart = await this.getCart(userId);
    let items = cart.items || [];
    
    // Filter out the item to remove
    items = items.filter(item => item.productId !== productId);
    
    // Update cart in database
    const [updatedCart] = await db('carts')
      .where('user_id', userId)
      .update({
        items: JSON.stringify(items),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return updatedCart;
  }
  
  // Clear entire cart
  async clearCart(userId) {
    const [updatedCart] = await db('carts')
      .where('user_id', userId)
      .update({
        items: JSON.stringify([]),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return updatedCart;
  }
  
  // Get cart summary (total items, total price)
  async getCartSummary(userId) {
    const cart = await this.getCart(userId);
    const items = cart.items || [];
    
    const summary = {
      totalItems: 0,
      totalPrice: 0,
      itemCount: items.length
    };
    
    items.forEach(item => {
      summary.totalItems += item.quantity;
      summary.totalPrice += (item.price * item.quantity);
    });
    
    // Round to 2 decimal places
    summary.totalPrice = Math.round(summary.totalPrice * 100) / 100;
    
    return {
      ...cart,
      summary
    };
  }
  
  // Validate cart items (check if products still exist and have sufficient stock)
  async validateCart(userId) {
    const cart = await this.getCart(userId);
    const items = cart.items || [];
    const validationResults = [];
    
    for (const item of items) {
      const product = await productService.getProductById(item.productId);
      
      const validation = {
        productId: item.productId,
        cartQuantity: item.quantity,
        isValid: true,
        issues: []
      };
      
      if (!product) {
        validation.isValid = false;
        validation.issues.push('Product no longer exists');
      } else {
        if (product.stock < item.quantity) {
          validation.isValid = false;
          validation.issues.push(`Only ${product.stock} items available, but ${item.quantity} requested`);
        }
        
        // Check if price has changed (optional warning)
        if (product.price !== item.price) {
          validation.issues.push(`Price changed from $${item.price} to $${product.price}`);
        }
      }
      
      validationResults.push(validation);
    }
    
    return {
      cart,
      validationResults,
      isValid: validationResults.every(result => result.isValid)
    };
  }
}

module.exports = new CartService(); 