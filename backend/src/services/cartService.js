const db = require('../config/knex');
const productService = require('./productService');

class CartService {
  
  // Get user's cart
  async getCart(userId) {
    let cart = await db('carts')
      .where('user_id', userId)
      .first();
    
    if (!cart) {
      // Create empty cart if none exists
      return await this.createEmptyCart(userId);
    }
    
    // Parse items if they exist and are a string
    if (cart.items && typeof cart.items === 'string') {
      try {
        cart.items = JSON.parse(cart.items);
      } catch (e) {
        console.error('Failed to parse cart items from JSON for existing cart:', e, { cartItems: cart.items });
        cart.items = []; // Default to empty array on parsing error
      }
    } else if (!Array.isArray(cart.items)) { // Ensure items is an array if null/undefined or not already parsed
      cart.items = [];
    }
    
    return cart;
  }
  
  // Create empty cart for user
  async createEmptyCart(userId) {
    const initialItems = []; // Start with an actual array
    const [insertedCart] = await db('carts')
      .insert({
        user_id: userId,
        items: JSON.stringify(initialItems) // Stringify for DB
      })
      .returning('*');
    
    // Return with items as an array for consistency within the service
    return { ...insertedCart, items: initialItems };
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
    const cart = await this.getCart(userId); // Ensures cart.items is an array
    let items = Array.isArray(cart.items) ? cart.items : [];
    
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
      // Update other product details in case they changed, though less likely for existing item
      items[existingItemIndex].name = product.name;
      items[existingItemIndex].price = product.price;
      items[existingItemIndex].imageUrl = product.thumbnail_small_url || product.primary_image_url || null;
      items[existingItemIndex].category = product.category;
      items[existingItemIndex].stock = product.stock;

    } else {
      // Add new item to cart
      const cartItem = {
        productId: product.id,
        quantity: quantity,
        name: product.name,
        price: product.price,
        imageUrl: product.thumbnail_small_url || product.primary_image_url || null,
        category: product.category,
        stock: product.stock // Add stock here
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
    const cart = await this.getCart(userId); // Ensures cart.items is an array
    let items = Array.isArray(cart.items) ? cart.items : [];
    
    // Find and update the item
    const itemIndex = items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      // If item not found, maybe add it? Or error?
      // Current behavior: if user tries to update quantity of non-existent item.
      // For now, let's follow previous logic of erroring if not found.
      // Consider if this should behave like an "add" if not found.
      throw new Error('Item not found in cart');
    }
    
    // Update the item with fresh product data
    items[itemIndex] = {
      productId: product.id,
      quantity: quantity,
      name: product.name,
      price: product.price,
      imageUrl: product.thumbnail_small_url || product.primary_image_url || null,
      category: product.category,
      stock: product.stock // Add stock here
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
    const items = Array.isArray(cart.items) ? cart.items : [];
    
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