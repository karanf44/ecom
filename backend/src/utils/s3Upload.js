const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configuration
const CONFIG = {
  bucket: process.env.S3_BUCKET_NAME || 'devtestecom',
  region: process.env.AWS_REGION || 'us-east-1',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  imageOptimization: {
    quality: 85,
    maxWidth: 2048,
    maxHeight: 2048,
  },
  thumbnailSizes: {
    small: { width: 150, height: 150 },
    medium: { width: 500, height: 500 },
    large: { width: 1024, height: 1024 },
  }
};

/**
 * Validate image file
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimetype - File mime type
 * @param {number} size - File size in bytes
 * @returns {Object} Validation result
 */
function validateImage(buffer, mimetype, size) {
  const errors = [];

  // Check file size
  if (size > CONFIG.maxFileSize) {
    errors.push(`File size exceeds maximum allowed size of ${CONFIG.maxFileSize / 1024 / 1024}MB`);
  }

  // Check mime type
  if (!CONFIG.allowedMimeTypes.includes(mimetype)) {
    errors.push(`Invalid file type. Allowed types: ${CONFIG.allowedMimeTypes.join(', ')}`);
  }

  // Check if buffer is valid image
  try {
    sharp(buffer);
  } catch (error) {
    errors.push('Invalid image file or corrupted data');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Optimize image using Sharp
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} Optimized image buffer
 */
async function optimizeImage(buffer, options = {}) {
  const {
    quality = CONFIG.imageOptimization.quality,
    maxWidth = CONFIG.imageOptimization.maxWidth,
    maxHeight = CONFIG.imageOptimization.maxHeight,
    format = 'jpeg'
  } = options;

  try {
    return await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();
  } catch (error) {
    logger.error('Image optimization failed', error, { service: 's3-upload' });
    throw new Error('Failed to optimize image');
  }
}

/**
 * Generate thumbnail
 * @param {Buffer} buffer - Original image buffer
 * @param {string} size - Thumbnail size (small, medium, large)
 * @returns {Promise<Buffer>} Thumbnail buffer
 */
async function generateThumbnail(buffer, size = 'medium') {
  const dimensions = CONFIG.thumbnailSizes[size] || CONFIG.thumbnailSizes.medium;
  
  try {
    return await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
  } catch (error) {
    logger.error('Thumbnail generation failed', error, { service: 's3-upload' });
    throw new Error('Failed to generate thumbnail');
  }
}

/**
 * Generate secure file name
 * @param {string} originalName - Original file name
 * @param {string} prefix - File prefix (e.g., 'products', 'users')
 * @param {string} suffix - File suffix (e.g., 'thumb', 'original')
 * @returns {string} Secure file name
 */
function generateFileName(originalName, prefix = '', suffix = '') {
  const ext = originalName.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const uuid = uuidv4();
  const parts = [prefix, timestamp, uuid, suffix].filter(Boolean);
  return `${parts.join('-')}.${ext}`;
}

/**
 * Upload file to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key
 * @param {string} contentType - File content type
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result
 */
async function uploadToS3(buffer, key, contentType, metadata = {}) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      uploadedAt: new Date().toISOString(),
      ...metadata
    },
    CacheControl: 'max-age=31536000', // 1 year cache
  });

  try {
    const result = await s3Client.send(command);
    const url = `https://${CONFIG.bucket}.s3.${CONFIG.region}.amazonaws.com/${key}`;
    
    logger.info('File uploaded to S3', {
      service: 's3-upload',
      bucket: CONFIG.bucket,
      key,
      url,
      etag: result.ETag
    });

    return {
      success: true,
      url,
      key,
      etag: result.ETag,
      bucket: CONFIG.bucket
    };
  } catch (error) {
    logger.error('S3 upload failed', error, {
      service: 's3-upload',
      bucket: CONFIG.bucket,
      key
    });
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
async function deleteFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
  });

  try {
    await s3Client.send(command);
    logger.info('File deleted from S3', {
      service: 's3-upload',
      bucket: CONFIG.bucket,
      key
    });
    return true;
  } catch (error) {
    logger.error('S3 delete failed', error, {
      service: 's3-upload',
      bucket: CONFIG.bucket,
      key
    });
    return false;
  }
}

/**
 * Main upload function with optimization and thumbnails
 * @param {Object} file - File object with buffer, originalname, mimetype, size
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URLs
 */
async function uploadImage(file, options = {}) {
  const {
    prefix = 'images',
    generateThumbnails = true,
    optimize = true,
    metadata = {}
  } = options;

  try {
    // Validate image
    const validation = validateImage(file.buffer, file.mimetype, file.size);
    if (!validation.isValid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    const results = {};
    
    // Process original image
    let processedBuffer = file.buffer;
    if (optimize) {
      processedBuffer = await optimizeImage(file.buffer);
    }

    // Upload original
    const originalKey = generateFileName(file.originalname, prefix, 'original');
    results.original = await uploadToS3(
      processedBuffer,
      originalKey,
      'image/jpeg',
      { ...metadata, type: 'original' }
    );

    // Generate and upload thumbnails
    if (generateThumbnails) {
      results.thumbnails = {};
      
      for (const [sizeName, _] of Object.entries(CONFIG.thumbnailSizes)) {
        const thumbnailBuffer = await generateThumbnail(file.buffer, sizeName);
        const thumbnailKey = generateFileName(file.originalname, prefix, `thumb-${sizeName}`);
        
        results.thumbnails[sizeName] = await uploadToS3(
          thumbnailBuffer,
          thumbnailKey,
          'image/jpeg',
          { ...metadata, type: 'thumbnail', size: sizeName }
        );
      }
    }

    logger.info('Image upload completed successfully', {
      service: 's3-upload',
      originalSize: file.size,
      optimizedSize: processedBuffer.length,
      thumbnailCount: generateThumbnails ? Object.keys(CONFIG.thumbnailSizes).length : 0
    });

    return {
      success: true,
      files: results,
      metadata: {
        originalSize: file.size,
        optimizedSize: processedBuffer.length,
        compressionRatio: Math.round((1 - processedBuffer.length / file.size) * 100)
      }
    };

  } catch (error) {
    logger.error('Image upload failed', error, {
      service: 's3-upload',
      fileName: file.originalname,
      fileSize: file.size
    });

    throw error;
  }
}

/**
 * Get presigned URL for direct upload (alternative method)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUploadUrl(key, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Failed to generate presigned URL', error, {
      service: 's3-upload',
      key
    });
    throw new Error('Failed to generate upload URL');
  }
}

module.exports = {
  uploadImage,
  deleteFromS3,
  getPresignedUploadUrl,
  validateImage,
  optimizeImage,
  generateThumbnail,
  CONFIG
}; 