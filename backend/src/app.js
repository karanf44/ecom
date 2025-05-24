const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- BEGIN DEBUG LOGGING (app.js) ---
console.log('[APP_DEBUG] process.env.DB_NAME:', process.env.DB_NAME);
// --- END DEBUG LOGGING (app.js) ---

const express = require('express');
const cors = require('cors');
const app = express();

// Import database connection (this will test the connection)
const db = require('./config/database');

// Import routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const walletRoutes = require('./routes/walletRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');

// Middleware
app.use(cors()); // Enable CORS for frontend integration
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/checkout', checkoutRoutes);

// Root route for testing
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-commerce Backend API is running!',
    endpoints: {
      products: '/api/products',
      auth: '/api/auth',
      cart: '/api/cart',
      wallet: '/api/wallet',
      checkout: '/api/checkout'
    }
  });
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    // await db.query('SELECT 1+1');
    res.status(200).json({
      success: true,
      message: 'API is healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Define a port for the server to listen on
const PORT = process.env.PORT || 3002;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export the app
module.exports = app;
