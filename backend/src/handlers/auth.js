const authService = require('../services/authService');

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

// Register user handler
const register = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const { email, password, name } = JSON.parse(event.body);
    
    // Validate input
    if (!email || !password || !name) {
      return createResponse(400, {
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    // Register user
    const user = await authService.registerUser({ email, password, name });
    
    return createResponse(201, {
      success: true,
      message: 'User registered successfully',
      data: { user }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    return createResponse(400, {
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

// Login user handler
const login = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const { email, password } = JSON.parse(event.body);
    
    // Validate input
    if (!email || !password) {
      return createResponse(400, {
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Login user
    const result = await authService.loginUser(email, password);
    
    return createResponse(200, {
      success: true,
      message: 'Login successful',
      data: result
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    return createResponse(401, {
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

// Get user profile handler
const getProfile = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Extract user ID from path parameters or token
    const userId = event.pathParameters?.id || event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createResponse(401, {
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return createResponse(404, {
        success: false,
        message: 'User not found'
      });
    }
    
    return createResponse(200, {
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Failed to get user profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
}; 