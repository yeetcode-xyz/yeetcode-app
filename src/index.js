const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const electronSquirrelStartup = require('electron-squirrel-startup');
const https = require('https');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const AWS = require('aws-sdk');

dotenv.config();

// Configure DynamoDB DocumentClient
AWS.config.update({ region: process.env.AWS_REGION });
const ddb = new AWS.DynamoDB.DocumentClient();

// Load environment variables
console.log('Loading environment variables...');
const envPath = path.join(__dirname, '..', '.env');
console.log('Checking for .env file at:', envPath);
if (fs.existsSync(envPath)) {
  console.log('.env file exists');
  dotenv.config({ path: envPath });
} else {
  console.log('.env file does not exist');
  dotenv.config();
}

// Debug: Print environment variables (without sensitive values)
console.log('Environment variables loaded:');
console.log('API_URL exists:', !!process.env.API_URL);
console.log('API_KEY exists:', !!process.env.API_KEY);
console.log('LEETCODE_API_URL exists:', !!process.env.LEETCODE_API_URL);
console.log('LEETCODE_API_KEY exists:', !!process.env.LEETCODE_API_KEY);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

const createWindow = () => {
  console.log('Creating window with preload script at:', path.join(__dirname, 'preload.js'));
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  // Log when the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded successfully');
  });
  
  // Log any errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// LeetCode username validation using the API
const validateLeetCodeUsername = async (username) => {
  const API_KEY = process.env.LEETCODE_API_KEY;
  const API_URL = process.env.LEETCODE_API_URL;
  
  console.log('Validating LeetCode username with:', { username });
  console.log('Using API URL:', API_URL);
  console.log('API key exists:', !!API_KEY);
  
  // For development purposes, allow validation without API keys
  if (!API_KEY || !API_URL) {
    console.log('API key or URL not configured. Using mock validation for development.');
    // Simple mock validation - accept any non-empty username
    return { 
      exists: username && username.trim().length > 0,
      error: username && username.trim().length > 0 ? null : 'Username cannot be empty'
    };
  }
  
  try {
    // Use axios instead of https for consistency
    const config = {
      method: 'get',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      data: {
        username: username
      }
    };
    
    console.log('Making API request with config:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: '(headers with auth)'
    });
    
    const response = await axios(config);
    console.log('API response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error validating username:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    throw new Error(`API request error: ${error.message}`);
  }
};

// Register IPC handler for LeetCode username validation
ipcMain.handle('validate-leetcode-username', async (event, username) => {
  try {
    console.log('Validating username:', username);
    const result = await validateLeetCodeUsername(username);
    console.log('Validation result:', result);
    
    // Handle API Gateway response format (contains statusCode and body as string)
    if (result.statusCode && result.body) {
      try {
        // Parse the body string into JSON
        const parsedBody = JSON.parse(result.body);
        console.log('Parsed API Gateway response:', parsedBody);
        
        // Return the parsed body
        return parsedBody;
      } catch (parseError) {
        console.error('Error parsing API response body:', parseError);
        return { 
          exists: false, 
          error: 'Error parsing API response' 
        };
      }
    }
    
    // Handle unexpected response format
    if (result && typeof result.exists === 'undefined') {
      console.log('Unexpected response format, using fallback validation');
      return {
        exists: true, // For development, assume username exists
        error: null
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error validating LeetCode username:', error);
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('join-group', async (event, username, inviteCode) => {
  // Ensure user exists, then set group_id on their item
  await ddb.update({
    TableName: process.env.USERS_TABLE,
    Key: { username },
    UpdateExpression: 'SET group_id = :g',
    ExpressionAttributeValues: { ':g': inviteCode },
    ConditionExpression: 'attribute_exists(username)'
  }).promise();
  return { joined: true, groupId: inviteCode };
});

ipcMain.handle('create-group', async (event, username) => {
  // Generate unique 5-digit code
  function gen5Digit() {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }
  let groupId;
  for (let i = 0; i < 5; i++) {
    const candidate = gen5Digit();
    try {
      await ddb.put({
        TableName: process.env.GROUPS_TABLE,
        Item: { group_id: candidate, created_at: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(group_id)'
      }).promise();
      groupId = candidate;
      break;
    } catch (err) {
      if (err.code !== 'ConditionalCheckFailedException') throw err;
    }
  }
  if (!groupId) throw new Error('Unable to generate unique group code');

  // Assign the new group to the user
  await ddb.update({
    TableName: process.env.USERS_TABLE,
    Key: { username },
    UpdateExpression: 'SET group_id = :g',
    ExpressionAttributeValues: { ':g': groupId }
  }).promise();

  return { groupId };
});

// (Optional) Fetch stats for all users in a group
ipcMain.handle('get-stats-for-group', async (event, groupId) => {
  const res = await ddb.query({
    TableName: process.env.USERS_TABLE,
    IndexName: 'UsersByGroup',          // ensure you created this GSI
    KeyConditionExpression: 'group_id = :g',
    ExpressionAttributeValues: { ':g': groupId }
  }).promise();
  return res.Items; // pass back list of usernames for renderer
});

// Mock group join/create
// const mockJoinGroup = async (inviteCode) => {
//   await new Promise((r) => setTimeout(r, 500));
//   return inviteCode === '12345';
// };
// const mockCreateGroup = async () => {
//   await new Promise((r) => setTimeout(r, 500));
//   return '12345';
// };

// Mock leaderboard fetch
const mockFetchLeaderboard = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [
    { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
    { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
    { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
  ];
};
