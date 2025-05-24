const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/categories - Get all unique categories with product counts
router.get('/', productController.getCategories);

module.exports = router; 