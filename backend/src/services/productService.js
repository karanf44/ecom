const db = require('../config/knex');
const { executeDbQuery } = require('../utils/circuitBreaker');
const { retryDatabaseOperation } = require('../utils/retryMechanism');
const logger = require('../utils/logger');

class ProductService {
  
  // Get all products with optional pagination and filtering
  async getAllProducts(options = {}) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { limit = 20, offset = 0, category, search } = options;
        
        logger.debug('Getting all products', {
          service: 'product-service',
          operation: 'getAllProducts',
          options: { limit, offset, category, search }
        });
        
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
        
        // Add ordering and pagination with performance optimization
        const products = await query
          .select('*') // Explicit select for better performance
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset);
        
        logger.debug('Successfully retrieved products', {
          service: 'product-service',
          operation: 'getAllProducts',
          count: products.length
        });
        
        return products;
      }, 'getAllProducts');
    }, 'getAllProducts');
  }
  
  // Get a single product by ID
  async getProductById(productId) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.debug('Getting product by ID', {
          service: 'product-service',
          operation: 'getProductById',
          productId
        });
        
        const product = await db('products')
          .where('id', productId)
          .first();
        
        if (product) {
          logger.debug('Product found', {
            service: 'product-service',
            operation: 'getProductById',
            productId,
            productName: product.name
          });
        } else {
          logger.warn('Product not found', {
            service: 'product-service',
            operation: 'getProductById',
            productId
          });
        }
        
        return product || null;
      }, 'getProductById');
    }, 'getProductById');
  }
  
  // Create a new product
  async createProduct(productData) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { name, description, price, imageUrl, category, stock = 0 } = productData;
        
        logger.info('Creating new product', {
          service: 'product-service',
          operation: 'createProduct',
          productData: { name, category, price, stock }
        });
        
        // Validate required fields
        if (!name || !description || !price || !category) {
          const error = new Error('Missing required fields: name, description, price, category');
          error.status = 400;
          throw error;
        }
        
        if (price <= 0) {
          const error = new Error('Price must be greater than 0');
          error.status = 400;
          throw error;
        }
        
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
        
        logger.info('Product created successfully', {
          service: 'product-service',
          operation: 'createProduct',
          productId: product.id,
          productName: product.name
        });
        
        return product;
      }, 'createProduct');
    }, 'createProduct');
  }
  
  // Update a product
  async updateProduct(productId, productData) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { name, description, price, imageUrl, category, stock } = productData;
        
        logger.info('Updating product', {
          service: 'product-service',
          operation: 'updateProduct',
          productId,
          updateFields: Object.keys(productData)
        });
        
        // Build update object only with provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) {
          if (price <= 0) {
            const error = new Error('Price must be greater than 0');
            error.status = 400;
            throw error;
          }
          updateData.price = price;
        }
        if (imageUrl !== undefined) updateData.image_url = imageUrl;
        if (category !== undefined) updateData.category = category;
        if (stock !== undefined) {
          if (stock < 0) {
            const error = new Error('Stock cannot be negative');
            error.status = 400;
            throw error;
          }
          updateData.stock = stock;
        }
        
        // Only update if there's data to update
        if (Object.keys(updateData).length === 0) {
          logger.debug('No update data provided, returning existing product', {
            service: 'product-service',
            operation: 'updateProduct',
            productId
          });
          return await this.getProductById(productId);
        }
        
        updateData.updated_at = db.fn.now();
        
        const [product] = await db('products')
          .where('id', productId)
          .update(updateData)
          .returning('*');
        
        if (product) {
          logger.info('Product updated successfully', {
            service: 'product-service',
            operation: 'updateProduct',
            productId,
            productName: product.name
          });
        } else {
          logger.warn('Product not found for update', {
            service: 'product-service',
            operation: 'updateProduct',
            productId
          });
        }
        
        return product || null;
      }, 'updateProduct');
    }, 'updateProduct');
  }
  
  // Delete a product
  async deleteProduct(productId) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.info('Deleting product', {
          service: 'product-service',
          operation: 'deleteProduct',
          productId
        });
        
        const [product] = await db('products')
          .where('id', productId)
          .del()
          .returning('*');
        
        if (product) {
          logger.info('Product deleted successfully', {
            service: 'product-service',
            operation: 'deleteProduct',
            productId,
            productName: product.name
          });
        } else {
          logger.warn('Product not found for deletion', {
            service: 'product-service',
            operation: 'deleteProduct',
            productId
          });
        }
        
        return product || null;
      }, 'deleteProduct');
    }, 'deleteProduct');
  }
  
  // Get products by category
  async getProductsByCategory(category, options = {}) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { limit = 20, offset = 0 } = options;
        
        logger.debug('Getting products by category', {
          service: 'product-service',
          operation: 'getProductsByCategory',
          category,
          limit,
          offset
        });
        
        const products = await db('products')
          .where('category', category)
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset);
        
        logger.debug('Successfully retrieved products by category', {
          service: 'product-service',
          operation: 'getProductsByCategory',
          category,
          count: products.length
        });
        
        return products;
      }, 'getProductsByCategory');
    }, 'getProductsByCategory');
  }
  
  // Get product count with the same filtering logic
  async getProductCount(options = {}) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { category, search } = options;
        
        logger.debug('Getting product count', {
          service: 'product-service',
          operation: 'getProductCount',
          options: { category, search }
        });
        
        let query = db('products');
        
        // Apply same filters as getAllProducts
        if (category) {
          query = query.where('category', category);
        }
        
        if (search) {
          query = query.where(function() {
            this.where('name', 'ilike', `%${search}%`)
                .orWhere('description', 'ilike', `%${search}%`);
          });
        }
        
        // Use count() for better performance
        const result = await query.count('* as total').first();
        const total = parseInt(result.total, 10);
        
        logger.debug('Product count retrieved', {
          service: 'product-service',
          operation: 'getProductCount',
          total: total
        });
        
        return total;
      }, 'getProductCount');
    }, 'getProductCount');
  }
  
  // OPTIMIZED: Get products and count in a single transaction
  async getProductsWithCount(options = {}) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { 
          limit = 20, 
          offset = 0, 
          category, 
          search,
          minPrice,      // Destructure minPrice
          maxPrice,      // Destructure maxPrice
          sortBy = 'created_at', // Destructure sortBy with default
          sortOrder = 'desc'   // Destructure sortOrder with default
        } = options;
        
        logger.debug('Getting products with count (optimized)', {
          service: 'product-service',
          operation: 'getProductsWithCount',
          options: { limit, offset, category, search, minPrice, maxPrice, sortBy, sortOrder } // Added to logger
        });

        // Use a transaction to ensure consistency and potentially better performance
        const result = await db.transaction(async (trx) => {
          let baseQuery = trx('products');
          
          // Apply filters
          if (category) {
            baseQuery = baseQuery.where('category', category);
          }
          
          if (search) {
            baseQuery = baseQuery.where(function() {
              this.where('name', 'ilike', `%${search}%`)
                  .orWhere('description', 'ilike', `%${search}%`);
            });
          }

          // Add minPrice filter
          if (typeof minPrice === 'number' && !isNaN(minPrice)) {
            baseQuery = baseQuery.where('price', '>=', minPrice);
          }

          // Add maxPrice filter
          if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
            baseQuery = baseQuery.where('price', '<=', maxPrice);
          }

          // Get both products and count in parallel within the transaction
          const [products, countResult] = await Promise.all([
            baseQuery.clone()
              .select('*')
              .orderBy(sortBy, sortOrder) // Use dynamic sortBy and sortOrder
              .limit(limit)
              .offset(offset),
            baseQuery.clone().count('* as total').first()
          ]);

          return {
            products,
            total: parseInt(countResult.total, 10)
          };
        });

        logger.debug('Successfully retrieved products with count', {
          service: 'product-service',
          operation: 'getProductsWithCount',
          count: result.products.length,
          total: result.total
        });

        return result;
      }, 'getProductsWithCount');
    }, 'getProductsWithCount');
  }
  
  // Update product stock (useful for inventory management)
  async updateProductStock(productId, stockChange) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.info('Updating product stock', {
          service: 'product-service',
          operation: 'updateProductStock',
          productId,
          stockChange
        });
        
        // Validate stock change
        if (typeof stockChange !== 'number') {
          const error = new Error('Stock change must be a number');
          error.status = 400;
          throw error;
        }
        
        const [product] = await db('products')
          .where('id', productId)
          .update({
            stock: db.raw('stock + ?', [stockChange]),
            updated_at: db.fn.now()
          })
          .returning('*');
        
        if (product) {
          logger.info('Product stock updated successfully', {
            service: 'product-service',
            operation: 'updateProductStock',
            productId,
            newStock: product.stock,
            stockChange
          });
          
          // Log warning for low stock
          if (product.stock <= 10) {
            logger.warn('Low stock warning', {
              service: 'product-service',
              operation: 'updateProductStock',
              productId,
              productName: product.name,
              stock: product.stock
            });
          }
        } else {
          logger.warn('Product not found for stock update', {
            service: 'product-service',
            operation: 'updateProductStock',
            productId
          });
        }
        
        return product || null;
      }, 'updateProductStock');
    }, 'updateProductStock');
  }
  
  // Get products with low stock (utility method)
  async getLowStockProducts(threshold = 10) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.debug('Getting low stock products', {
          service: 'product-service',
          operation: 'getLowStockProducts',
          threshold
        });
        
        const products = await db('products')
          .where('stock', '<=', threshold)
          .orderBy('stock', 'asc');
        
        logger.info('Low stock products retrieved', {
          service: 'product-service',
          operation: 'getLowStockProducts',
          count: products.length,
          threshold
        });
        
        return products;
      }, 'getLowStockProducts');
    }, 'getLowStockProducts');
  }
  
  // Get products by multiple categories
  async getProductsByCategories(categories, options = {}) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        const { limit = 20, offset = 0 } = options;
        
        logger.debug('Getting products by categories', {
          service: 'product-service',
          operation: 'getProductsByCategories',
          categories,
          limit,
          offset
        });
        
        if (!Array.isArray(categories) || categories.length === 0) {
          const error = new Error('Categories must be a non-empty array');
          error.status = 400;
          throw error;
        }
        
        const products = await db('products')
          .whereIn('category', categories)
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset);
        
        logger.debug('Successfully retrieved products by categories', {
          service: 'product-service',
          operation: 'getProductsByCategories',
          categories,
          count: products.length
        });
        
        return products;
      }, 'getProductsByCategories');
    }, 'getProductsByCategories');
  }
  
  // Bulk operations with transaction support
  async bulkUpdateProducts(updates) {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.info('Starting bulk product updates', {
          service: 'product-service',
          operation: 'bulkUpdateProducts',
          updateCount: updates.length
        });
        
        if (!Array.isArray(updates) || updates.length === 0) {
          const error = new Error('Updates must be a non-empty array');
          error.status = 400;
          throw error;
        }
        
        return await db.transaction(async (trx) => {
          const results = [];
          
          for (const update of updates) {
            const { id, ...updateData } = update;
            
            if (!id) {
              const error = new Error('Each update must include an id');
              error.status = 400;
              throw error;
            }
            
            const [product] = await trx('products')
              .where('id', id)
              .update({
                ...updateData,
                updated_at: trx.fn.now()
              })
              .returning('*');
            
            if (product) {
              results.push(product);
            }
          }
          
          logger.info('Bulk product updates completed', {
            service: 'product-service',
            operation: 'bulkUpdateProducts',
            successCount: results.length,
            requestedCount: updates.length
          });
          
          return results;
        });
      }, 'bulkUpdateProducts');
    }, 'bulkUpdateProducts');
  }

  // Get all unique categories with product counts
  async getCategories() {
    return executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        logger.debug('Getting all categories', {
          service: 'product-service',
          operation: 'getCategories'
        });

        const categories = await db('products')
          .select('category')
          .count('* as product_count')
          .whereNotNull('category')
          .groupBy('category')
          .orderBy('product_count', 'desc');

        // Transform the results to a cleaner format
        const formattedCategories = categories.map(cat => ({
          name: cat.category,
          count: parseInt(cat.product_count, 10)
        }));

        logger.debug('Successfully retrieved categories', {
          service: 'product-service',
          operation: 'getCategories',
          categoriesCount: formattedCategories.length,
          categories: formattedCategories.map(c => `${c.name} (${c.count})`)
        });

        return formattedCategories;
      }, 'getCategories');
    }, 'getCategories');
  }
}

module.exports = new ProductService(); 