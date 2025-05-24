# 📸 Image Upload API Documentation

## 🚀 Overview

The E-commerce Backend provides simplified image upload functionality for both **products** and **users**. Images are stored directly in the main tables with automatic optimization and thumbnail generation through secure S3 storage.

## 🔑 Authentication

All image upload endpoints require JWT authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

## 📋 Features

- ✅ **Automatic image optimization** - Images are compressed and optimized
- ✅ **Multiple thumbnail sizes** - Small (150x150), Medium (500x500), Large (1024x1024)
- ✅ **File validation** - Size limits, format checking, security validation
- ✅ **S3 storage** - Secure, scalable cloud storage
- ✅ **Direct table storage** - Images stored directly in products/users tables
- ✅ **Permission controls** - User-based access controls
- ✅ **Automatic cleanup** - Old images automatically deleted when replaced

## 🛍️ Product Image Upload

### Upload Product Image

**Endpoint:** `POST /api/products/images/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `product_id` (required) - Product ID to associate image with
- `image` (required) - Image file

**Example Request:**

```bash
curl -X POST https://your-api.com/api/products/images/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "image=@product-photo.jpg" \
  -F "product_id=product-uuid-here"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Product image uploaded successfully",
  "data": {
    "productId": "product-uuid-here",
    "product": {
      "id": "product-uuid-here",
      "name": "Product Name",
      "primary_image_url": "https://s3-bucket.amazonaws.com/products/original-image.jpg",
      "thumbnail_small_url": "https://s3-bucket.amazonaws.com/products/thumb-small.jpg",
      "thumbnail_medium_url": "https://s3-bucket.amazonaws.com/products/thumb-medium.jpg",
      "thumbnail_large_url": "https://s3-bucket.amazonaws.com/products/thumb-large.jpg",
      "updated_at": "2024-01-24T10:30:00.000Z"
    },
    "urls": {
      "original": "https://s3-bucket.amazonaws.com/products/original-image.jpg",
      "thumbnails": {
        "small": "https://s3-bucket.amazonaws.com/products/thumb-small.jpg",
        "medium": "https://s3-bucket.amazonaws.com/products/thumb-medium.jpg",
        "large": "https://s3-bucket.amazonaws.com/products/thumb-large.jpg"
      }
    },
    "metadata": {
      "originalSize": 2048576,
      "optimizedSize": 1024288,
      "compressionRatio": 50
    }
  }
}
```

### Delete Product Image

**Endpoint:** `DELETE /api/products/{productId}/image`

**Example Request:**

```bash
curl -X DELETE https://your-api.com/api/products/product-uuid-here/image \
  -H "Authorization: Bearer your-jwt-token"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Product image deleted successfully"
}
```

## 👤 User Profile Image Upload

### Upload Profile Image

**Endpoint:** `POST /api/users/profile/image`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `image` (required) - Image file
- `user_id` (optional) - Target user ID (defaults to current user, admins only for other users)

**Example Request:**

```bash
curl -X POST https://your-api.com/api/users/profile/image \
  -H "Authorization: Bearer your-jwt-token" \
  -F "image=@profile-photo.jpg"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "userId": "user-uuid-here",
    "user": {
      "id": "user-uuid-here",
      "email": "user@example.com",
      "name": "User Name",
      "profile_image_url": "https://s3-bucket.amazonaws.com/users/profiles/image.jpg",
      "profile_thumbnail_url": "https://s3-bucket.amazonaws.com/users/profiles/thumb.jpg",
      "updated_at": "2024-01-24T10:30:00.000Z"
    },
    "urls": {
      "original": "https://s3-bucket.amazonaws.com/users/profiles/original.jpg",
      "thumbnail": "https://s3-bucket.amazonaws.com/users/profiles/thumb-medium.jpg",
      "allThumbnails": {
        "small": "https://s3-bucket.amazonaws.com/users/profiles/thumb-small.jpg",
        "medium": "https://s3-bucket.amazonaws.com/users/profiles/thumb-medium.jpg",
        "large": "https://s3-bucket.amazonaws.com/users/profiles/thumb-large.jpg"
      }
    },
    "metadata": {
      "originalSize": 1024576,
      "optimizedSize": 512288,
      "compressionRatio": 50
    }
  }
}
```

### Delete Profile Image

**Endpoint:** `DELETE /api/users/profile/image`

**Query Parameters:**
- `user_id` (optional) - Target user ID (for admins)

**Example Request:**

```bash
curl -X DELETE https://your-api.com/api/users/profile/image \
  -H "Authorization: Bearer your-jwt-token"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Profile image deleted successfully"
}
```

## 📝 File Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

### Size Limits
- **Product Images:** 5MB maximum
- **User Profile Images:** 2MB maximum

### Automatic Processing
- **Optimization:** Images are automatically compressed
- **Thumbnails:** Multiple sizes generated automatically
- **Format:** Output format is optimized (typically JPEG)
- **Cleanup:** Old images automatically deleted when replaced

## 🔒 Security & Permissions

### Product Images
- **Upload:** Product owner or admin
- **Delete:** Product owner or admin
- **View:** Public (via URLs)

### User Images
- **Upload:** User themselves or admin
- **Delete:** User themselves or admin
- **View:** Public (via URLs)

## 🏗️ Database Schema

### Products Table (Image Columns)

```sql
ALTER TABLE products ADD COLUMN primary_image_url VARCHAR(500);
ALTER TABLE products ADD COLUMN primary_image_key VARCHAR(200);
ALTER TABLE products ADD COLUMN thumbnail_small_url VARCHAR(500);
ALTER TABLE products ADD COLUMN thumbnail_small_key VARCHAR(200);
ALTER TABLE products ADD COLUMN thumbnail_medium_url VARCHAR(500);
ALTER TABLE products ADD COLUMN thumbnail_medium_key VARCHAR(200);
ALTER TABLE products ADD COLUMN thumbnail_large_url VARCHAR(500);
ALTER TABLE products ADD COLUMN thumbnail_large_key VARCHAR(200);
ALTER TABLE products ADD COLUMN primary_image_size INTEGER;
ALTER TABLE products ADD COLUMN primary_image_optimized_size INTEGER;
ALTER TABLE products ADD COLUMN primary_image_compression_ratio INTEGER;
ALTER TABLE products ADD COLUMN created_by UUID;
```

### Users Table (Image Columns)

```sql
ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN profile_image_key VARCHAR(200);
ALTER TABLE users ADD COLUMN profile_thumbnail_url VARCHAR(500);
ALTER TABLE users ADD COLUMN profile_thumbnail_key VARCHAR(200);
ALTER TABLE users ADD COLUMN profile_image_size INTEGER;
ALTER TABLE users ADD COLUMN profile_image_optimized_size INTEGER;
ALTER TABLE users ADD COLUMN profile_image_compression_ratio INTEGER;
```

## ⚙️ Environment Configuration

Add these environment variables to your `.env` file:

```bash
# S3 Configuration
S3_BUCKET_NAME=your-ecommerce-images-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Stage-specific S3 buckets (optional)
S3_BUCKET_NAME_dev=ecommerce-images-dev
S3_BUCKET_NAME_staging=ecommerce-images-staging
S3_BUCKET_NAME_prod=ecommerce-images-prod
```

## 🧪 Testing with cURL

### Test Product Image Upload

```bash
# Create a test image file
echo "test image data" > test-image.jpg

# Upload product image
curl -X POST http://localhost:3003/api/products/images/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test-image.jpg" \
  -F "product_id=your-product-id"
```

### Test User Profile Image Upload

```bash
# Upload profile image
curl -X POST http://localhost:3003/api/users/profile/image \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@profile-photo.jpg"
```

### Test Image Deletion

```bash
# Delete product image
curl -X DELETE http://localhost:3003/api/products/your-product-id/image \
  -H "Authorization: Bearer your-jwt-token"

# Delete profile image
curl -X DELETE http://localhost:3003/api/users/profile/image \
  -H "Authorization: Bearer your-jwt-token"
```

## 🔧 Frontend Integration Examples

### JavaScript/React Example

```javascript
// Upload product image
const uploadProductImage = async (file, productId) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('product_id', productId);

  try {
    const response = await fetch('/api/products/images/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      // Access product data: result.data.product
      // Access URLs: result.data.urls
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Upload profile image
const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/api/users/profile/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Profile image uploaded:', result.data);
      // Access user data: result.data.user
      // Access URLs: result.data.urls
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Profile image upload failed:', error);
    throw error;
  }
};

// Delete product image
const deleteProductImage = async (productId) => {
  try {
    const response = await fetch(`/api/products/${productId}/image`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
};

// Delete profile image
const deleteProfileImage = async () => {
  try {
    const response = await fetch('/api/users/profile/image', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
};
```

## 🚨 Error Handling

### Common Error Responses

```json
// Authentication Error
{
  "success": false,
  "error": "Authentication failed: Invalid token",
  "timestamp": "2024-01-24T10:30:00.000Z"
}

// File Validation Error
{
  "success": false,
  "error": "File validation failed: File size exceeds maximum allowed size of 5MB"
}

// Permission Error
{
  "success": false,
  "error": "Insufficient permissions to upload images for this product"
}

// Missing File Error
{
  "success": false,
  "error": "No files found in request"
}

// Missing Product ID Error
{
  "success": false,
  "error": "Product ID is required"
}
```

## 📊 Performance Considerations

### Image Optimization
- **Compression:** Automatic JPEG compression at 85% quality
- **Resizing:** Images larger than 2048x2048 are automatically resized
- **Format Conversion:** All images converted to JPEG for consistency

### Thumbnail Generation
- **Small:** 150x150px (for icons, avatars)
- **Medium:** 500x500px (for cards, previews)  
- **Large:** 1024x1024px (for detailed views)

### Database Efficiency
- **Direct Storage:** Images stored directly in main tables (no JOINs needed)
- **Automatic Cleanup:** Old images deleted when replaced (no orphaned files)
- **Metadata Tracking:** File sizes and compression ratios stored for optimization

### CDN Integration
All S3 URLs can be easily integrated with CloudFront CDN for improved performance:

```javascript
const cdnUrl = 'https://your-cloudfront-domain.com';
const imageUrl = result.data.urls.original.replace('https://your-s3-bucket.amazonaws.com', cdnUrl);
```

## 🔄 Migration from Separate Tables

If you previously used separate `product_images` and `user_images` tables, here's how to migrate:

```sql
-- Migrate product images (keep only primary image)
UPDATE products 
SET primary_image_url = (
  SELECT original_url FROM product_images 
  WHERE product_images.product_id = products.id 
  AND is_primary = true 
  LIMIT 1
);

-- Migrate user profile images
UPDATE users 
SET profile_image_url = (
  SELECT original_url FROM user_images 
  WHERE user_images.user_id = users.id 
  AND image_type = 'profile' 
  LIMIT 1
);

-- Drop old tables after migration
DROP TABLE product_images;
DROP TABLE user_images;
```

---

**🎯 This simplified image upload system provides the same enterprise-grade functionality with reduced complexity and improved performance!** 