const authService = require('../services/authService');

class AuthController {
  
  // POST /api/auth/register - User registration
  async register(req, res) {
    try {
      const { email, password, name } = req.body;
      
      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }
      
      // Password strength validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      
      // Register user
      const user = await authService.registerUser({
        email: email.toLowerCase().trim(),
        password,
        name: name?.trim()
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Error in register:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: error.message
      });
    }
  }
  
  // POST /api/auth/login - User login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      // Login user
      const loginResult = await authService.loginUser(
        email.toLowerCase().trim(),
        password
      );
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: loginResult
      });
    } catch (error) {
      console.error('Error in login:', error);
      
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }
  
  // GET /api/auth/me - Get current user details (requires authentication)
  async getProfile(req, res) {
    try {
      // User info is already available in req.user from auth middleware
      const user = req.user;
      
      // Get fresh user data from database
      const userDetails = await authService.getUserById(user.id);
      
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userDetails.id,
            email: userDetails.email,
            name: userDetails.name,
            walletId: userDetails.wallet_id,
            createdAt: userDetails.created_at,
            updatedAt: userDetails.updated_at
          }
        }
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: error.message
      });
    }
  }
  
  // PUT /api/auth/profile - Update user profile (requires authentication)
  async updateProfile(req, res) {
    try {
      const { name } = req.body;
      const userId = req.user.id;
      
      // Basic validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name is required'
        });
      }
      
      // Update user profile
      const updatedUser = await authService.updateUserProfile(userId, {
        name: name.trim()
      });
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            walletId: updatedUser.wallet_id,
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at
          }
        }
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
  
  // PUT /api/auth/change-password - Change user password (requires authentication)
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      // Basic validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      // New password strength validation
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      // Change password
      const updatedUser = await authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            walletId: updatedUser.wallet_id
          }
        }
      });
    } catch (error) {
      console.error('Error in changePassword:', error);
      
      if (error.message === 'Current password is incorrect' || error.message === 'User not found') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
  
  // POST /api/auth/logout - Logout user (optional endpoint for frontend to clear token)
  async logout(req, res) {
    // Since we're using stateless JWT, logout is handled on the frontend
    // by removing the token. This endpoint can be used for logging purposes.
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController(); 