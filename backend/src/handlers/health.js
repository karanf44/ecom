const db = require('../config/knex');

const handler = async (event, context) => {
  // Prevent Lambda from reusing connections
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Test database connection
    await db.raw('SELECT 1');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        database: 'Connected'
      })
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

module.exports = { handler }; 