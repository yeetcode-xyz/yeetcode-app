const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('YeetCode App Environment Setup');
console.log('------------------------------');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('\n.env file already exists. Do you want to overwrite it? (y/n)');
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup canceled. Existing .env file was not modified.');
      rl.close();
      return;
    }
    createEnvFile();
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  console.log('\nPlease enter your API URL:');
  rl.question('> ', (apiUrl) => {
    console.log('\nPlease enter your API key:');
    rl.question('> ', (apiKey) => {
      console.log('\nPlease enter your LeetCode API key (press Enter to skip):');
      rl.question('> ', (leetcodeApiKey) => {
        console.log('\nPlease enter your LeetCode API URL (press Enter to skip):');
        rl.question('> ', (leetcodeApiUrl) => {
          
          const envContent = `# API Configuration
API_URL=${apiUrl}
API_KEY=${apiKey}

# LeetCode API Configuration
LEETCODE_API_KEY=${leetcodeApiKey}
LEETCODE_API_URL=${leetcodeApiUrl}`;
          
          fs.writeFileSync(envPath, envContent);
          console.log('\n.env file created successfully!');
          rl.close();
        });
      });
    });
  });
} 