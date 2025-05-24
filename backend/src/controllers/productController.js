const productService = require('../services/productService');

class ProductController {
  
  // GET /api/products - Get all products with pagination and filters
  async getAllProducts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        search,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      } = req.query;
      
      const offset = (page - 1) * limit;
      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        category,
        search,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc'
      };
      
      // Use optimized method that combines both queries in a single transaction
      const result = await productService.getProductsWithCount(options);
      
      const totalPages = Math.ceil(result.total / limit);
      
      res.status(200).json({
        success: true,
        data: {
          data: result.products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  }
  
  // GET /api/products/:id - Get a single product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      const product = await productService.getProductById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: { product }
      });
    } catch (error) {
      console.error('Error in getProductById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message
      });
    }
  }
  
  // POST /api/products - Create a new product (Admin only)
  async createProduct(req, res) {
    try {
      const { name, description, price, imageUrl, category, stock } = req.body;
      
      // Basic validation
      if (!name || !price) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required fields'
        });
      }
      
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0'
        });
      }
      
      const productData = {
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category,
        stock: stock ? parseInt(stock) : 0
      };
      
      const product = await productService.createProduct(productData);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
      });
    } catch (error) {
      console.error('Error in createProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    }
  }
  
  // PUT /api/products/:id - Update a product (Admin only)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, imageUrl, category, stock } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      // Check if product exists
      const existingProduct = await productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const productData = {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        imageUrl,
        category,
        stock: stock !== undefined ? parseInt(stock) : undefined
      };
      
      const updatedProduct = await productService.updateProduct(id, productData);
      
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct }
      });
    } catch (error) {
      console.error('Error in updateProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    }
  }
  
  // DELETE /api/products/:id - Delete a product (Admin only)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      const deletedProduct = await productService.deleteProduct(id);
      
      if (!deletedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: { product: deletedProduct }
      });
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message
      });
    }
  }
  
  // GET /api/products/category/:category - Get products by category
  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category is required'
        });
      }
      
      const offset = (page - 1) * limit;
      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        category // Include category in options for the optimized method
      };
      
      // Use optimized method that combines both queries
      const result = await productService.getProductsWithCount(options);
      
      const totalPages = Math.ceil(result.total / limit);
      
      res.status(200).json({
        success: true,
        data: {
          data: result.products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          },
          category
        }
      });
    } catch (error) {
      console.error('Error in getProductsByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products by category',
        error: error.message
      });
    }
  }

  // GET /api/categories - Get all unique categories
  async getCategories(req, res) {
    try {
      const categories = await productService.getCategories();
      
      res.status(200).json({
        success: true,
        data: {
          categories
        }
      });
    } catch (error) {
      console.error('Error in getCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }
}

module.exports = new ProductController(); 