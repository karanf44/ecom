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
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile pictures
    files: 1 // Only allow 1 file for profile pictures
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
 * Check if user has permission to upload/modify user images
 */
const checkUserPermission = async (user, targetUserId) => {
  // Users can only upload their own profile pictures unless they're admin
  if (user.role === 'admin' || user.id.toString() === targetUserId?.toString()) {
    return true;
  }

  throw new Error('Insufficient permissions to upload images for this user');
};

/**
 * Update user profile image in database
 */
const updateUserProfileImage = async (userId, imageData) => {
  const updateData = {
    profile_image_url: imageData.files.original.url,
    profile_image_key: imageData.files.original.key,
    profile_thumbnail_url: imageData.files.thumbnails?.medium?.url,
    profile_thumbnail_key: imageData.files.thumbnails?.medium?.key,
    profile_image_size: imageData.metadata.originalSize,
    profile_image_optimized_size: imageData.metadata.optimizedSize,
    profile_image_compression_ratio: imageData.metadata.compressionRatio,
    updated_at: new Date()
  };

  const [updatedUser] = await db('users')
    .where({ id: userId })
    .update(updateData)
    .returning(['id', 'email', 'name', 'profile_image_url', 'profile_thumbnail_url', 'updated_at']);

  return updatedUser;
};

/**
 * Lambda handler for user profile image upload
 */
const uploadProfileImage = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const user = await authenticateUser(event);
    
    // Get target user ID (default to current user)
    const targetUserId = event.queryStringParameters?.user_id || user.id;
    
    // Check permissions
    await checkUserPermission(user, targetUserId);
    
    logger.info('User profile image upload requested', {
      service: 'user-image-upload',
      userId: user.id,
      targetUserId,
      userRole: user.role
    });

    // Parse multipart form data and extract files
    const fileExtraction = extractFiles(event, {
      maxSize: 2 * 1024 * 1024, // 2MB for profile images
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

    // Delete old profile image if exists
    const existingUser = await db('users').where({ id: targetUserId }).first();
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.profile_image_key) {
      await deleteFromS3(existingUser.profile_image_key);
    }
    if (existingUser.profile_thumbnail_key) {
      await deleteFromS3(existingUser.profile_thumbnail_key);
    }

    // Upload new image to S3
    const uploadResult = await uploadImage(file, {
      prefix: 'users/profiles',
      generateThumbnails: true,
      optimize: true,
      metadata: {
        userId: user.id.toString(),
        targetUserId: targetUserId.toString(),
        uploadedBy: user.email,
        imageType: 'profile'
      }
    });

    // Update user record with new profile image
    const updatedUser = await updateUserProfileImage(targetUserId, uploadResult);

    logger.info('User profile image uploaded successfully', {
      service: 'user-image-upload',
      userId: user.id,
      targetUserId,
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
        message: 'Profile image uploaded successfully',
        data: {
          userId: targetUserId,
          user: updatedUser,
          urls: {
            original: uploadResult.files.original.url,
            thumbnail: uploadResult.files.thumbnails?.medium?.url,
            allThumbnails: {
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
    logger.error('User profile image upload failed', error, {
      service: 'user-image-upload',
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
 * Lambda handler for deleting user profile images
 */
const deleteHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const user = await authenticateUser(event);
    const targetUserId = event.pathParameters?.userId || event.queryStringParameters?.user_id || user.id;

    // Check permissions
    await checkUserPermission(user, targetUserId);

    const existingUser = await db('users').where({ id: targetUserId }).first();
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Delete from S3
    if (existingUser.profile_image_key) {
      await deleteFromS3(existingUser.profile_image_key);
    }
    if (existingUser.profile_thumbnail_key) {
      await deleteFromS3(existingUser.profile_thumbnail_key);
    }

    // Clear profile image data from user record
    await db('users')
      .where({ id: targetUserId })
      .update({
        profile_image_url: null,
        profile_image_key: null,
        profile_thumbnail_url: null,
        profile_thumbnail_key: null,
        profile_image_size: null,
        profile_image_optimized_size: null,
        profile_image_compression_ratio: null,
        updated_at: new Date()
      });

    logger.info('User profile image deleted successfully', {
      service: 'user-image-upload',
      userId: user.id,
      targetUserId
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Profile image deleted successfully'
      })
    };

  } catch (error) {
    logger.error('User image deletion failed', error, {
      service: 'user-image-upload'
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
  uploadProfileImage,
  deleteHandler,
  upload 
}; 