const axios = require('axios');

const FASTAPI_URL = 'http://0.0.0.0:6969';

async function testBackendCache(apiKey) {
  console.log('Testing FastAPI backend cache performance...\n');
  
  const username = 'yourcyberworld';
  
  // Test multiple requests
  for (let i = 1; i <= 5; i++) {
    console.log(`Request ${i}:`);
    const start = Date.now();
    
    try {
      const response = await axios.get(
        `${FASTAPI_URL}/daily-problem/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      const elapsed = Date.now() - start;
      console.log(`  Time: ${elapsed}ms`);
      console.log(`  Success: ${response.data.success}`);
      console.log(`  Problem: ${response.data.data?.todaysProblem?.title || 'N/A'}`);
      console.log(`  Streak: ${response.data.data?.streak || 0}`);
      console.log(`  Cached: ${elapsed < 50 ? 'YES (fast response)' : elapsed < 100 ? 'PARTIAL (medium response)' : 'NO (slow response)'}`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    console.log('');
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Read API key from .env file
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const apiKeyMatch = envContent.match(/YETCODE_API_KEY=(.+)/);
  
  if (apiKeyMatch) {
    const apiKey = apiKeyMatch[1].trim();
    console.log('Using API key from .env file\n');
    testBackendCache(apiKey);
  } else {
    console.error('YETCODE_API_KEY not found in .env file');
  }
} catch (error) {
  console.error('Error reading .env file:', error.message);
}