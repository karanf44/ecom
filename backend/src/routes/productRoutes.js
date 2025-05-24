const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - Get all products with pagination and filters
router.get('/', productController.getAllProducts);

// GET /api/products/categories - Get all unique categories
router.get('/categories', productController.getCategories);

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/:id - Get a single product by ID
router.get('/:id', productController.getProductById);

// POST /api/products - Create a new product (Admin only - will add auth middleware later)
router.post('/', productController.createProduct);

// PUT /api/products/:id - Update a product (Admin only - will add auth middleware later)
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id - Delete a product (Admin only - will add auth middleware later)
router.delete('/:id', productController.deleteProduct);

module.exports = router; 