// Load environment variables first
require('dotenv').config();

const knex = require('knex');
const knexConfig = require('../../knexfile');

// Get environment
const environment = process.env.NODE_ENV || 'development';

// Optimized configuration for better performance
const optimizedConfig = {
  ...knexConfig[environment],
  pool: {
    min: environment === 'production' ? 1 : 2, // Keep at least 1 connection in prod
    max: environment === 'production' ? 3 : 10, // Increase max connections
    acquireTimeoutMillis: 60000, // Increase to 60 seconds
    createTimeoutMillis: 30000, // Keep at 30 seconds
    destroyTimeoutMillis: 5000, // Keep destroy timeout
    idleTimeoutMillis: 300000, // Increase idle timeout to 5 minutes
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200, // Increase retry interval
    propagateCreateError: false
  },
  // Add query timeout to prevent long-running queries
  asyncStackTraces: environment === 'development',
  debug: environment === 'development'
};

// Create Knex instance
const db = knex(optimizedConfig);

// Test connection only in development
if (environment === 'development') {
  db.raw('SELECT 1')
    .then(() => {
      console.log('✅ Knex database connection successful');
    })
    .catch((error) => {
      console.error('❌ Knex database connection failed:', error.message);
    });
}

module.exports = db; 