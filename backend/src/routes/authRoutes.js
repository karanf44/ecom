const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - User registration
router.post('/register', authController.register);

// POST /api/auth/login - User login
router.post('/login', authController.login);

// GET /api/auth/me - Get current user profile (requires authentication)
router.get('/me', authenticateToken, authController.getProfile);

// PUT /api/auth/profile - Update user profile (requires authentication)
router.put('/profile', authenticateToken, authController.updateProfile);

// PUT /api/auth/change-password - Change password (requires authentication)
router.put('/change-password', authenticateToken, authController.changePassword);

// POST /api/auth/logout - Logout user (optional)
router.post('/logout', authenticateToken, authController.logout);

module.exports = router; 