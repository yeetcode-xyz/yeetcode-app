const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  // FastAPI Configuration
  fastApiUrl: process.env.FASTAPI_URL,
  apiKey: process.env.YETCODE_API_KEY,

  // LeetCode Configuration
  leetCodeGraphQLUrl: 'https://leetcode.com/graphql',

  // App Configuration
  isDev: process.env.NODE_ENV === 'development',
  nodeEnv: process.env.NODE_ENV,

  // API Timeouts (in milliseconds)
  fastApiTimeout: 10000,
  leetCodeTimeout: 10000,

  // User Agent
  userAgent: 'YeetCode/1.0',

  // Validation
  validateRequired() {
    const required = ['fastApiUrl', 'apiKey'];
    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  },
};

// Validate required configuration on load
config.validateRequired();

module.exports = config;
