const multer = require('multer');
const { uploadImage, deleteFromS3 } = require('../utils/s3Upload');
const { extractFiles } = require('../utils/multipartParser');
const db = require('../config/knex');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 primary image per product
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Authenticate user from JWT token
 */
const authenticateUser = async (event) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await db('users').where({ id: decoded.id }).first();
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Check if user has permission to upload images for a product
 */
const checkProductPermission = async (user, productId) => {
  if (!productId) {
    return true; // Creating new product
  }

  // Check if user owns the product or is admin
  const product = await db('products')
    .where({ id: productId })
    .first();

  if (!product) {
    throw new Error('Product not found');
  }

  // Allow if user is admin or owns the product
  if (user.role === 'admin' || product.created_by === user.id) {
    return product;
  }

  throw new Error('Insufficient permissions to upload images for this product');
};

/**
 * Update product with image data
 */
const updateProductImage = async (productId, imageData, userId) => {
  const updateData = {
    primary_image_url: imageData.files.original.url,
    primary_image_key: imageData.files.original.key,
    thumbnail_small_url: imageData.files.thumbnails?.small?.url,
    thumbnail_small_key: imageData.files.thumbnails?.small?.key,
    thumbnail_medium_url: imageData.files.thumbnails?.medium?.url,
    thumbnail_medium_key: imageData.files.thumbnails?.medium?.key,
    thumbnail_large_url: imageData.files.thumbnails?.large?.url,
    thumbnail_large_key: imageData.files.thumbnails?.large?.key,
    primary_image_size: imageData.metadata.originalSize,
    primary_image_optimized_size: imageData.metadata.optimizedSize,
    primary_image_compression_ratio: imageData.metadata.compressionRatio,
    updated_at: new Date()
  };

  // Set created_by if not already set (for new products)
  const existingProduct = await db('products').where({ id: productId }).first();
  if (!existingProduct.created_by) {
    updateData.created_by = userId;
  }

  const [updatedProduct] = await db('products')
    .where({ id: productId })
    .update(updateData)
    .returning('*');

  return updatedProduct;
};

/**
 * Lambda handler for product image upload
 */
const handler = async (event, context) => {
  // Prevent Lambda from reusing connections
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const user = await authenticateUser(event);
    
    logger.info('Product image upload requested', {
      service: 'product-image-upload',
      userId: user.id,
      userRole: user.role
    });

    // Parse multipart form data and extract files
    const fileExtraction = extractFiles(event, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      required: true
    });

    if (!fileExtraction.success) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: fileExtraction.error
        })
      };
    }

    // Get the uploaded file
    const file = fileExtraction.files[0];
    
    // Extract product_id from query parameters or form fields
    const productId = event.queryStringParameters?.product_id || fileExtraction.fields.product_id;

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Product ID is required'
        })
      };
    }

    // Check permissions
    const product = await checkProductPermission(user, productId);

    // Delete existing images from S3 if they exist
    if (product.primary_image_key) {
      await deleteFromS3(product.primary_image_key);
    }
    if (product.thumbnail_small_key) {
      await deleteFromS3(product.thumbnail_small_key);
    }
    if (product.thumbnail_medium_key) {
      await deleteFromS3(product.thumbnail_medium_key);
    }
    if (product.thumbnail_large_key) {
      await deleteFromS3(product.thumbnail_large_key);
    }

    // Upload new image to S3
    const uploadResult = await uploadImage(file, {
      prefix: 'products',
      generateThumbnails: true,
      optimize: true,
      metadata: {
        userId: user.id.toString(),
        productId: productId.toString(),
        uploadedBy: user.email
      }
    });

    // Update product with new image data
    const updatedProduct = await updateProductImage(productId, uploadResult, user.id);

    logger.info('Product image uploaded successfully', {
      service: 'product-image-upload',
      userId: user.id,
      productId,
      originalSize: uploadResult.metadata.originalSize,
      optimizedSize: uploadResult.metadata.optimizedSize
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Product image uploaded successfully',
        data: {
          productId,
          product: updatedProduct,
          urls: {
            original: uploadResult.files.original.url,
            thumbnails: {
              small: uploadResult.files.thumbnails?.small?.url,
              medium: uploadResult.files.thumbnails?.medium?.url,
              large: uploadResult.files.thumbnails?.large?.url
            }
          },
          metadata: uploadResult.metadata
        }
      })
    };

  } catch (error) {
    logger.error('Product image upload failed', error, {
      service: 'product-image-upload',
      userId: event.requestContext?.authorizer?.userId
    });

    const statusCode = error.message.includes('Authentication') ? 401 :
                      error.message.includes('permission') ? 403 :
                      error.message.includes('validation') ? 400 : 500;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Lambda handler for deleting product images
 */
const deleteHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const user = await authenticateUser(event);
    const productId = event.pathParameters?.productId || event.queryStringParameters?.product_id;

    if (!productId) {
      throw new Error('Product ID is required');
    }

    // Get product record
    const product = await db('products')
      .where({ id: productId })
      .first();

    if (!product) {
      throw new Error('Product not found');
    }

    // Check permissions
    await checkProductPermission(user, productId);

    // Delete from S3
    const deletePromises = [
      product.primary_image_key && deleteFromS3(product.primary_image_key),
      product.thumbnail_small_key && deleteFromS3(product.thumbnail_small_key),
      product.thumbnail_medium_key && deleteFromS3(product.thumbnail_medium_key),
      product.thumbnail_large_key && deleteFromS3(product.thumbnail_large_key)
    ].filter(Boolean);

    await Promise.all(deletePromises);

    // Clear image data from product
    await db('products')
      .where({ id: productId })
      .update({
        primary_image_url: null,
        primary_image_key: null,
        thumbnail_small_url: null,
        thumbnail_small_key: null,
        thumbnail_medium_url: null,
        thumbnail_medium_key: null,
        thumbnail_large_url: null,
        thumbnail_large_key: null,
        primary_image_size: null,
        primary_image_optimized_size: null,
        primary_image_compression_ratio: null,
        updated_at: new Date()
      });

    logger.info('Product image deleted successfully', {
      service: 'product-image-upload',
      userId: user.id,
      productId
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Product image deleted successfully'
      })
    };

  } catch (error) {
    logger.error('Product image deletion failed', error, {
      service: 'product-image-upload'
    });

    const statusCode = error.message.includes('Authentication') ? 401 :
                      error.message.includes('permission') ? 403 :
                      error.message.includes('not found') ? 404 : 500;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

module.exports = { 
  handler, 
  deleteHandler,
  upload 
}; 