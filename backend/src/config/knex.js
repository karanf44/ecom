// Load environment variables first
require('dotenv').config();

const knex = require('knex');
const knexConfig = require('../../knexfile');

// Get environment
const environment = process.env.NODE_ENV || 'development';

// Lambda-optimized configuration
const lambdaConfig = {
  ...knexConfig[environment],
  pool: {
    min: 0, // No minimum connections for Lambda
    max: 1, // Single connection per Lambda instance
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false
  }
};

// Create Knex instance
const db = knex(lambdaConfig);

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