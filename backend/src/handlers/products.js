const productService = require('../services/productService');

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

// Get all products handler
const getProducts = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 20;
    const offset = (page - 1) * limit;
    const category = queryParams.category;
    const search = queryParams.search;
    
    // Get products and count
    const [products, totalCount] = await Promise.all([
      productService.getAllProducts({ limit, offset, category, search }),
      productService.getProductCount({ category, search })
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return createResponse(200, {
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to retrieve products'
    });
  }
};

// Get single product handler
const getProduct = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const productId = event.pathParameters.id;
    
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    const product = await productService.getProductById(productId);
    
    if (!product) {
      return createResponse(404, {
        success: false,
        message: 'Product not found'
      });
    }
    
    return createResponse(200, {
      success: true,
      data: { product }
    });
    
  } catch (error) {
    console.error('Get product error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to retrieve product'
    });
  }
};

// Create product handler
const createProduct = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const { name, description, price, imageUrl, category, stock } = JSON.parse(event.body);
    
    // Validate required fields
    if (!name || !description || !price || !category) {
      return createResponse(400, {
        success: false,
        message: 'Name, description, price, and category are required'
      });
    }
    
    // Validate price
    if (isNaN(price) || price < 0) {
      return createResponse(400, {
        success: false,
        message: 'Price must be a valid positive number'
      });
    }
    
    const product = await productService.createProduct({
      name,
      description,
      price: parseFloat(price),
      imageUrl,
      category,
      stock: parseInt(stock) || 0
    });
    
    return createResponse(201, {
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to create product'
    });
  }
};

// Update product handler
const updateProduct = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const productId = event.pathParameters.id;
    const updateData = JSON.parse(event.body);
    
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Validate price if provided
    if (updateData.price !== undefined && (isNaN(updateData.price) || updateData.price < 0)) {
      return createResponse(400, {
        success: false,
        message: 'Price must be a valid positive number'
      });
    }
    
    const product = await productService.updateProduct(productId, updateData);
    
    if (!product) {
      return createResponse(404, {
        success: false,
        message: 'Product not found'
      });
    }
    
    return createResponse(200, {
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to update product'
    });
  }
};

// Delete product handler
const deleteProduct = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const productId = event.pathParameters.id;
    
    if (!productId) {
      return createResponse(400, {
        success: false,
        message: 'Product ID is required'
      });
    }
    
    const product = await productService.deleteProduct(productId);
    
    if (!product) {
      return createResponse(404, {
        success: false,
        message: 'Product not found'
      });
    }
    
    return createResponse(200, {
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to delete product'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
}; 