const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const electronSquirrelStartup = require('electron-squirrel-startup');
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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
  
  // For development purposes, allow validation without API keys
  if (!API_KEY || !API_URL) {
    console.log('API key or URL not configured. Using mock validation for development.');
    // Simple mock validation - accept any non-empty username
    return { 
      exists: username && username.trim().length > 0,
      error: username && username.trim().length > 0 ? null : 'Username cannot be empty'
    };
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: username
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };
    
    const req = https.request(API_URL, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Error parsing response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });
    
    req.write(data);
    req.end();
  });
};

// Register IPC handler for LeetCode username validation
ipcMain.handle('validate-leetcode-username', async (event, username) => {
  try {
    console.log('Validating username:', username);
    const result = await validateLeetCodeUsername(username);
    console.log('Validation result:', result);
    
    // Handle unexpected response format
    if (result.message === 'Internal server error') {
      console.log('Received internal server error, using fallback validation');
      // Fallback to simple validation for development
      return { 
        exists: username && username.trim().length > 0,
        error: null
      };
    }
    
    // Ensure the result has the expected format
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

// Mock group join/create
const mockJoinGroup = async (inviteCode) => {
  await new Promise((r) => setTimeout(r, 500));
  return inviteCode === '12345';
};
const mockCreateGroup = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return '12345';
};

// Mock leaderboard fetch
const mockFetchLeaderboard = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [
    { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
    { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
    { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
  ];
};
