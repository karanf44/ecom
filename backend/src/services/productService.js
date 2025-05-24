const db = require('../config/knex');

class ProductService {
  
  // Get all products with optional pagination and filtering
  async getAllProducts(options = {}) {
    const { limit = 20, offset = 0, category, search } = options;
    
    let query = db('products');
    
    // Add category filter if provided
    if (category) {
      query = query.where('category', category);
    }
    
    // Add search filter if provided
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    
    // Add ordering and pagination
    const products = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return products;
  }
  
  // Get a single product by ID
  async getProductById(productId) {
    const product = await db('products')
      .where('id', productId)
      .first();
    
    return product || null;
  }
  
  // Create a new product
  async createProduct(productData) {
    const { name, description, price, imageUrl, category, stock = 0 } = productData;
    
    const [product] = await db('products')
      .insert({
        name,
        description,
        price,
        image_url: imageUrl,
        category,
        stock
      })
      .returning('*');
    
    return product;
  }
  
  // Update a product
  async updateProduct(productId, productData) {
    const { name, description, price, imageUrl, category, stock } = productData;
    
    // Build update object only with provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = stock;
    
    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      return await this.getProductById(productId);
    }
    
    updateData.updated_at = db.fn.now();
    
    const [product] = await db('products')
      .where('id', productId)
      .update(updateData)
      .returning('*');
    
    return product || null;
  }
  
  // Delete a product
  async deleteProduct(productId) {
    const [product] = await db('products')
      .where('id', productId)
      .del()
      .returning('*');
    
    return product || null;
  }
  
  // Get products by category
  async getProductsByCategory(category, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    const products = await db('products')
      .where('category', category)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return products;
  }
  
  // Get product count for pagination
  async getProductCount(options = {}) {
    const { category, search } = options;
    
    let query = db('products');
    
    if (category) {
      query = query.where('category', category);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    
    const result = await query.count('* as total');
    return parseInt(result[0].total);
  }
  
  // Update product stock (useful for inventory management)
  async updateProductStock(productId, stockChange) {
    const [product] = await db('products')
      .where('id', productId)
      .update({
        stock: db.raw('stock + ?', [stockChange]),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return product || null;
  }
  
  // Get products with low stock (utility method)
  async getLowStockProducts(threshold = 10) {
    const products = await db('products')
      .where('stock', '<=', threshold)
      .orderBy('stock', 'asc');
    
    return products;
  }
  
  // Get products by multiple categories
  async getProductsByCategories(categories, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    const products = await db('products')
      .whereIn('category', categories)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return products;
  }
}

module.exports = new ProductService(); 