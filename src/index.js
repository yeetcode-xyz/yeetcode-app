const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const electronSquirrelStartup = require('electron-squirrel-startup');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const AWS = require('aws-sdk');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Hot reload for development (temporarily disabled to prevent multiple windows)
// if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
//   require('electron-reload')(__dirname, {
//     electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
//     hardResetMethod: 'exit',
//   });
// }

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
  console.log('[ENV] AWS_REGION =', process.env.AWS_REGION);
  console.log('[ENV] AWS_ACCESS_KEY_ID =', !!process.env.AWS_ACCESS_KEY_ID);
  console.log(
    '[ENV] AWS_SECRET_ACCESS_KEY =',
    !!process.env.AWS_SECRET_ACCESS_KEY
  );
  console.log('[ENV] USERS_TABLE =', process.env.USERS_TABLE);
  console.log('[ENV] GROUPS_TABLE =', process.env.GROUPS_TABLE);
} else {
  console.log('.env file does not exist');
  dotenv.config();
}

// Debug: Print environment variables (without sensitive values)
console.log('Environment variables loaded:');
console.log('LEETCODE_API_URL exists:', !!process.env.LEETCODE_API_URL);
console.log('LEETCODE_API_KEY exists:', !!process.env.LEETCODE_API_KEY);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  console.log(
    'Creating window with preload script at:',
    path.join(__dirname, 'preload.js')
  );

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  // and load the index.html of the app.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/index-vite.html');
    // Only open DevTools if not in test mode
    if (process.env.NODE_ENV !== 'test') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // Log when the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded successfully');
  });

  // Log any errors
  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    }
  );

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
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
const validateLeetCodeUsername = async username => {
  const API_KEY = process.env.LEETCODE_API_KEY;
  const API_URL = process.env.LEETCODE_API_URL;

  console.log('Validating LeetCode username with:', { username });
  console.log('Using API URL:', API_URL);
  console.log('API key exists:', !!API_KEY);

  // For development purposes, allow validation without API keys
  if (!API_KEY || !API_URL) {
    console.log(
      'API key or URL not configured. Using mock validation for development.'
    );
    // Simple mock validation - accept any non-empty username
    return {
      exists: username && username.trim().length > 0,
      error:
        username && username.trim().length > 0
          ? null
          : 'Username cannot be empty',
    };
  }

  try {
    // Use axios instead of https for consistency
    const config = {
      method: 'get',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        username: username,
      },
    };

    console.log('Making API request with config:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: '(headers with auth)',
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

    // Handle API Gateway response format (contains statusCode and body)
    if (result.statusCode && result.body) {
      console.log('API Gateway response:', result);

      // Check if body is already an object or needs parsing
      let parsedBody;
      if (typeof result.body === 'string') {
        try {
          parsedBody = JSON.parse(result.body);
        } catch (parseError) {
          console.error('Error parsing API response body:', parseError);
          return {
            exists: false,
            error: 'Error parsing API response',
          };
        }
      } else {
        // Body is already an object
        parsedBody = result.body;
      }

      console.log('Parsed API Gateway response:', parsedBody);
      return parsedBody;
    }

    // Handle unexpected response format
    if (result && typeof result.exists === 'undefined') {
      console.log('Unexpected response format, using fallback validation');
      return {
        exists: true, // For development, assume username exists
        error: null,
      };
    }

    return result;
  } catch (error) {
    console.error('Error validating LeetCode username:', error);
    return { exists: false, error: error.message };
  }
});

// Optional: have AWS SDK emit its own debug
AWS.config.logger = console;

// CREATE GROUP
ipcMain.handle('create-group', async (event, username) => {
  console.log('[DEBUG][create-group] called for username:', username);
  console.log('[DEBUG][create-group] ENV tables:', {
    USERS_TABLE: process.env.USERS_TABLE,
    GROUPS_TABLE: process.env.GROUPS_TABLE,
  });

  function gen5Digit() {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  let groupId;
  for (let i = 0; i < 5; i++) {
    const candidate = gen5Digit();
    const putParams = {
      TableName: process.env.GROUPS_TABLE,
      Item: {
        group_id: candidate,
        created_at: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(group_id)',
    };

    console.log(
      '[DEBUG][create-group] about to call ddb.put with:',
      JSON.stringify(putParams, null, 2)
    );
    try {
      const putRes = await ddb.put(putParams).promise();
      console.log(
        '[DEBUG][create-group] ddb.put response:',
        JSON.stringify(putRes, null, 2)
      );
      groupId = candidate;
      break;
    } catch (err) {
      console.error('[ERROR][create-group] ddb.put error:', err);
      if (err.code !== 'ConditionalCheckFailedException') {
        throw err;
      }
      // collision, will retry
    }
  }

  if (!groupId) {
    throw new Error('Unable to generate unique group code');
  }

  const updateParams = {
    TableName: process.env.USERS_TABLE,
    Key: { username },
    UpdateExpression: 'SET group_id = :g',
    ExpressionAttributeValues: { ':g': groupId },
  };

  console.log(
    '[DEBUG][create-group] about to call ddb.update with:',
    JSON.stringify(updateParams, null, 2)
  );
  try {
    const updateRes = await ddb.update(updateParams).promise();
    console.log(
      '[DEBUG][create-group] ddb.update response:',
      JSON.stringify(updateRes, null, 2)
    );
  } catch (err) {
    console.error('[ERROR][create-group] ddb.update error:', err);
    throw err;
  }

  return { groupId };
});

// JOIN GROUP
ipcMain.handle('join-group', async (event, username, inviteCode) => {
  console.log(
    '[DEBUG][join-group] called for username:',
    username,
    'inviteCode:',
    inviteCode
  );
  console.log('[DEBUG][join-group] ENV USERS_TABLE:', process.env.USERS_TABLE);

  const updateParams = {
    TableName: process.env.USERS_TABLE,
    Key: { username },
    UpdateExpression: 'SET group_id = :g',
    ExpressionAttributeValues: { ':g': inviteCode },
    // removed ConditionExpression so this will upsert
  };

  console.log(
    '[DEBUG][join-group] about to call ddb.update with:',
    JSON.stringify(updateParams, null, 2)
  );
  try {
    const updateRes = await ddb.update(updateParams).promise();
    console.log(
      '[DEBUG][join-group] ddb.update response:',
      JSON.stringify(updateRes, null, 2)
    );
  } catch (err) {
    console.error('[ERROR][join-group] ddb.update error:', err);
    throw err;
  }

  return { joined: true, groupId: inviteCode };
});

// index.js
ipcMain.handle('get-stats-for-group', async (event, groupId) => {
  console.log('[DEBUG][get-stats-for-group] groupId =', groupId);

  let items = [];

  // 1️⃣ Try querying via GSI
  const queryParams = {
    TableName: process.env.USERS_TABLE,
    IndexName: 'group_id-index', // your GSI name
    KeyConditionExpression: 'group_id = :g',
    ExpressionAttributeValues: { ':g': groupId },
  };

  try {
    const result = await ddb.query(queryParams).promise();
    items = result.Items || [];
    console.log('[DEBUG][get-stats-for-group] items from query:', items);
  } catch (err) {
    console.error('[ERROR][get-stats-for-group] GSI query failed:', err);

    // 2️⃣ Fall back to a full scan + filter
    console.log(
      '[DEBUG][get-stats-for-group] falling back to scan on USERS_TABLE'
    );
    const scanParams = {
      TableName: process.env.USERS_TABLE,
      FilterExpression: 'group_id = :g',
      ExpressionAttributeValues: { ':g': groupId },
    };

    try {
      const scanResult = await ddb.scan(scanParams).promise();
      items = scanResult.Items || [];
      console.log('[DEBUG][get-stats-for-group] items from scan:', items);
    } catch (scanErr) {
      console.error('[ERROR][get-stats-for-group] scan failed:', scanErr);
      // give up and return empty list
      return [];
    }
  }

  // 3️⃣ Map to leaderboard shape
  const leaderboard = items.map(item => ({
    username: item.username,
    name: item.username,
    easy: item.easy ?? 0,
    medium: item.medium ?? 0,
    hard: item.hard ?? 0,
    today: item.today ?? 0,
  }));
  console.log(
    '[DEBUG][get-stats-for-group] returning leaderboard:',
    leaderboard
  );
  return leaderboard;
});

ipcMain.handle('get-user-data', async (event, username) => {
  console.log('[DEBUG][get-user-data] fetching for', username);

  const params = {
    TableName: process.env.USERS_TABLE,
    Key: { username },
  };

  try {
    const result = await ddb.get(params).promise();
    console.log('[DEBUG][get-user-data] result:', result.Item);
    return result.Item || {};
  } catch (err) {
    console.error('[ERROR][get-user-data]', err);
    return {};
  }
});

ipcMain.handle('leave-group', async (event, username) => {
  console.log('[DEBUG][leave-group] called for username:', username);

  const params = {
    TableName: process.env.USERS_TABLE,
    Key: { username },
    // remove the group_id attribute
    UpdateExpression: 'REMOVE group_id',
  };

  try {
    await ddb.update(params).promise();
    console.log('[DEBUG][leave-group] success');
    return { left: true };
  } catch (err) {
    console.error('[ERROR][leave-group]', err);
    throw err;
  }
});

// Add handler to open URLs in system browser
ipcMain.handle('open-external-url', async (event, url) => {
  console.log('[DEBUG][open-external-url] opening:', url);
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    console.error('[ERROR][open-external-url]', err);
    throw err;
  }
});

// Add handler to fetch random problems from LeetCode GraphQL
ipcMain.handle('fetch-random-problem', async (event, difficulty) => {
  console.log('[DEBUG][fetch-random-problem] difficulty:', difficulty);
  
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          title
          titleSlug
          difficulty
          frontendQuestionId: questionFrontendId
          paidOnly: isPaidOnly
          topicTags {
            name
          }
        }
      }
    }
  `;

  const variables = {
    categorySlug: "",
    limit: 1000,
    skip: 0,
    filters: {
      difficulty: difficulty
    }
  };

  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query: query,
      variables: variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'YeetCode/1.0'
      }
    });

    console.log('[DEBUG][fetch-random-problem] Response status:', response.status);
    
    const data = response.data;
    if (data.errors) {
      console.error('[ERROR][fetch-random-problem] GraphQL errors:', data.errors);
      throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
    }

    const freeProblems = data.data.problemsetQuestionList.questions.filter(
      problem => !problem.paidOnly
    );

    console.log('[DEBUG][fetch-random-problem] Found', freeProblems.length, 'free problems');

    if (freeProblems.length > 0) {
      const randomProblem = freeProblems[Math.floor(Math.random() * freeProblems.length)];
      console.log('[DEBUG][fetch-random-problem] Selected:', randomProblem.title);
      return randomProblem;
    } else {
      throw new Error('No free problems found');
    }
  } catch (error) {
    console.error('[ERROR][fetch-random-problem]', error.message);
    throw error; // Re-throw the error instead of returning fallback
  }
});
