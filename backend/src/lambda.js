const serverless = require('serverless-http');
const app = require('./app');

// Wrap the Express app for Lambda
const handler = serverless(app, {
  // Binary media types
  binary: ['image/*', 'application/pdf']
});

module.exports = { handler }; 