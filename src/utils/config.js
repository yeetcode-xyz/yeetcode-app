const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the correct location
// In packaged apps, .env is in Resources folder
// In development, .env is in project root
const envPath = process.resourcesPath
  ? path.join(process.resourcesPath, '.env') // Packaged app
  : path.join(__dirname, '..', '..', '.env'); // Development

dotenv.config({ path: envPath });

const config = {
  // FastAPI Configuration
  // Remove trailing slash to avoid double slashes in URLs
  fastApiUrl: (process.env.FASTAPI_URL || '').replace(/\/$/, ''),
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
