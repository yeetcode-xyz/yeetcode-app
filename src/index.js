console.log('🚀 APP STARTING - Environment loading will begin...');

// In-memory cache for daily problems and group stats
const dailyProblemCache = {
  // Cache for top 2 daily problems (refreshed at 5:30 AM IST)
  topProblems: {
    data: null,
    lastRefreshed: null,
  },
  // Cache for latest daily problem with 2-minute TTL
  latestProblem: {
    data: {},
    timestamp: {},
  },
};

// Cache for group stats with 30-second TTL
const groupStatsCache = {
  data: {},
  timestamp: {},
};

// Helper to check if cache should be refreshed (5:30 AM IST)
const shouldRefreshTopProblemsCache = () => {
  const now = new Date();
  const lastRefreshed = dailyProblemCache.topProblems.lastRefreshed;

  if (!lastRefreshed) return true;

  // Convert to IST (UTC+5:30)
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const istLastRefreshed = new Date(
    lastRefreshed.getTime() + 5.5 * 60 * 60 * 1000
  );

  // Check if we've passed 5:30 AM IST since last refresh
  const todayRefreshTime = new Date(istNow);
  todayRefreshTime.setHours(5, 30, 0, 0);

  const lastRefreshDate = new Date(istLastRefreshed);
  lastRefreshDate.setHours(0, 0, 0, 0);

  const todayDate = new Date(istNow);
  todayDate.setHours(0, 0, 0, 0);

  // If last refresh was before today and it's past 5:30 AM IST
  if (lastRefreshDate < todayDate && istNow >= todayRefreshTime) {
    return true;
  }

  // If last refresh was today but before 5:30 AM and now it's past 5:30 AM
  if (
    lastRefreshDate.getTime() === todayDate.getTime() &&
    istLastRefreshed < todayRefreshTime &&
    istNow >= todayRefreshTime
  ) {
    return true;
  }

  return false;
};

// Helper to check if latest problem cache is expired (2-minute TTL)
const isLatestProblemCacheExpired = username => {
  const cached = dailyProblemCache.latestProblem;
  if (!cached.data[username] || !cached.timestamp[username]) return true;

  const now = Date.now();
  const cacheAge = now - cached.timestamp[username];
  const TWO_MINUTES = 2 * 60 * 1000;

  return cacheAge > TWO_MINUTES;
};

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Notification,
} = require('electron');
const path = require('path');
const electronSquirrelStartup = require('electron-squirrel-startup');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const version = '0.1.2';

// load env file from ../.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ========================================
// MAGIC LINK AUTHENTICATION SYSTEM
// ========================================

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store verification code via FastAPI server
const storeVerificationCode = async (email, code) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/store-verification-code`,
      {
        email: email,
        code: code,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log('[DEBUG][storeVerificationCode] Stored code for:', email);
      return { success: true };
    } else {
      throw new Error(
        response.data.error || 'Failed to store verification code'
      );
    }
  } catch (error) {
    console.error(
      '[ERROR][storeVerificationCode] Failed to store code:',
      error
    );
    throw error;
  }
};

// Clean up expired verification codes
const cleanupExpiredVerificationCodes = async () => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/cleanup-expired-codes`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log('[DEBUG][cleanupExpiredVerificationCodes] Cleanup completed');
    }
  } catch (error) {
    console.error('[ERROR][cleanupExpiredVerificationCodes]', error);
  }
};

// Verify code and return user data via FastAPI server
const verifyCodeAndGetUser = async (email, code) => {
  const normalizedEmail = email.toLowerCase();

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/verify-code`,
      {
        email: normalizedEmail,
        code: code,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log('[DEBUG][verifyCodeAndGetUser] Code verified for:', email);
      return {
        success: true,
        email: normalizedEmail,
        verified: true,
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Verification failed',
      };
    }
  } catch (error) {
    console.error(
      '[ERROR][verifyCodeAndGetUser] Failed to verify code:',
      error
    );
    throw error;
  }
};

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
    icon: path.join(__dirname, 'yeetcodeicon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/index-vite.html');
    if (
      process.env.NODE_ENV !== 'test' &&
      process.env.OPEN_DEVTOOLS === 'true'
    ) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // In packaged app, built files are in resources/dist/
    const builtHtmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(builtHtmlPath)) {
      mainWindow.loadFile(builtHtmlPath);
    } else {
      // Fallback to src directory if dist not found
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }
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

// Daily challenge notification system
// Removed: lastCheckedDate is no longer needed with new notification system

// Clean notification manager class
class NotificationManager {
  constructor() {
    this.currentAppState = {
      step: 'welcome',
      userData: null,
      dailyData: null,
      lastUpdated: null,
    };
    this.lastDailyProblem = null;
    this.lastAppOpenTime = null;
    this.notificationSentToday = false;
    this.dailyChangeNotificationSent = false;
  }

  updateAppState(step, userData, dailyData) {
    const previousState = this.currentAppState;
    this.currentAppState = {
      step,
      userData,
      dailyData,
      lastUpdated: new Date().toISOString(),
    };

    console.log('[DEBUG][NotificationManager.updateAppState]', {
      step,
      username: userData?.leetUsername,
      dailyComplete: dailyData?.dailyComplete,
      dailyProblem: dailyData?.todaysProblem?.title,
    });

    // Check if this is a new app open (user just opened the app)
    const now = Date.now();
    const isNewAppOpen =
      !this.lastAppOpenTime || now - this.lastAppOpenTime > 30000; // 30 seconds threshold

    if (isNewAppOpen) {
      console.log(
        '[DEBUG][NotificationManager.updateAppState] New app open detected'
      );
      this.lastAppOpenTime = now;
      this.handleAppOpen();
    }

    // Check for daily problem changes
    this.checkForDailyProblemChange(previousState, this.currentAppState);
  }

  clearAppState() {
    this.currentAppState = {
      step: 'welcome',
      userData: null,
      dailyData: null,
      lastUpdated: null,
    };
  }

  async handleAppOpen() {
    console.log('[DEBUG][NotificationManager.handleAppOpen] App opened');

    // Reset daily change notification flag on new day
    const today = new Date().toISOString().split('T')[0];
    if (this.lastDailyProblem?.date !== today) {
      this.dailyChangeNotificationSent = false;
    }

    // Check if user should get "haven't solved daily" notification
    const shouldNotify =
      this.currentAppState.step === 'leaderboard' &&
      this.currentAppState.userData?.leetUsername &&
      this.currentAppState.dailyData?.dailyComplete === false;

    if (shouldNotify) {
      console.log(
        '[DEBUG][NotificationManager.handleAppOpen] Scheduling daily reminder notification'
      );

      // Schedule notification after 1 minute delay
      setTimeout(() => {
        this.sendDailyReminderNotification();
      }, 60000); // 1 minute delay
    }
  }

  async checkForDailyProblemChange(previousState, currentState) {
    // Only check if user is in leaderboard and has daily data
    if (
      currentState.step !== 'leaderboard' ||
      !currentState.dailyData?.todaysProblem
    ) {
      return;
    }

    const currentProblem = currentState.dailyData.todaysProblem;
    const previousProblem = previousState.dailyData?.todaysProblem;

    // Check if daily problem has changed (not first load)
    if (
      previousProblem &&
      currentProblem.slug !== previousProblem.slug &&
      !this.dailyChangeNotificationSent
    ) {
      console.log(
        '[DEBUG][NotificationManager] Daily problem changed from',
        previousProblem.title,
        'to',
        currentProblem.title
      );

      this.sendDailyChangeNotification(currentProblem);
      this.dailyChangeNotificationSent = true;
    }

    // Update last known daily problem
    this.lastDailyProblem = currentProblem;
  }

  sendDailyReminderNotification() {
    // Double-check conditions before sending
    if (
      this.currentAppState.step !== 'leaderboard' ||
      !this.currentAppState.userData?.leetUsername ||
      this.currentAppState.dailyData?.dailyComplete === true
    ) {
      return;
    }

    if (Notification.isSupported()) {
      const problemTitle =
        this.currentAppState.dailyData?.todaysProblem?.title ||
        "today's problem";

      new Notification({
        title: '🎯 Daily Challenge Reminder',
        body: `You haven't solved ${problemTitle} yet!\nComplete it to earn 200 XP and maintain your streak!`,
        icon: path.join(__dirname, 'assets', 'icon.png'),
      }).show();

      console.log(
        '[DEBUG][NotificationManager] Sent daily reminder notification'
      );
    }
  }

  sendDailyChangeNotification(newProblem) {
    if (Notification.isSupported()) {
      new Notification({
        title: '🔄 New Daily Challenge Available!',
        body: `Today's problem: ${newProblem.title}\nEarn 200 XP by solving it!`,
        icon: path.join(__dirname, 'assets', 'icon.png'),
      }).show();

      console.log(
        '[DEBUG][NotificationManager] Sent daily change notification'
      );
    }
  }

  async testNotification() {
    console.log(
      '[DEBUG][NotificationManager.testNotification] Manually triggered'
    );

    if (
      this.currentAppState.step === 'leaderboard' &&
      this.currentAppState.userData?.leetUsername
    ) {
      this.sendDailyReminderNotification();
    }

    return { success: true };
  }
}

// Create global notification manager instance
const notificationManager = new NotificationManager();

// Start daily challenge checker (simplified - notifications now handled by app state changes)
const startDailyChallengeChecker = () => {
  console.log(
    '[DEBUG][startDailyChallengeChecker] Notification system initialized'
  );
  // Notifications are now handled automatically when app state changes
  // No need for periodic checks since we track state changes directly
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Start the daily challenge notification system
  startDailyChallengeChecker();

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

// LeetCode username validation using GraphQL API
const validateLeetCodeUsername = async username => {
  // Convert username to lowercase for case-insensitive validation
  const normalizedUsername = username.toLowerCase();
  console.log('Validating LeetCode username with:', {
    original: username,
    normalized: normalizedUsername,
  });

  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
        }
      }
    `;

    const variables = {
      username: normalizedUsername,
    };

    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: query,
        variables: variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('GraphQL response status:', response.status);
    console.log(
      'GraphQL response data:',
      JSON.stringify(response.data, null, 2)
    );

    // Check for GraphQL errors
    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors);

      // Handle the specific case where user doesn't exist
      const userNotFoundError = response.data.errors.find(
        error => error.message === 'That user does not exist.'
      );

      if (userNotFoundError) {
        console.log(
          'User not found on LeetCode - this is expected for invalid usernames'
        );
        return {
          exists: false,
          error: 'Username not found on LeetCode',
        };
      }

      // For other GraphQL errors, return failure
      return {
        exists: false,
        error: 'GraphQL query failed',
      };
    }

    const matchedUser = response.data.data?.matchedUser;
    console.log('Matched user:', matchedUser);
    const exists = !!matchedUser && !!matchedUser.username;
    console.log('Username exists:', exists);

    return {
      exists: exists,
      error: exists ? null : 'Username not found on LeetCode',
    };
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

    // Return the result directly - the validateLeetCodeUsername function
    // now handles the GraphQL response properly
    return result;
  } catch (error) {
    console.error('Error validating LeetCode username:', error);
    return { exists: false, error: error.message };
  }
});

// CREATE GROUP
ipcMain.handle('create-group', async (event, username, displayName) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/create-group`,
      {
        username: username,
        display_name: displayName,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return { groupId: response.data.group_id };
    } else {
      throw new Error(response.data.error || 'Failed to create group');
    }
  } catch (error) {
    console.error('[ERROR][create-group]', error);
    throw error;
  }
});

// JOIN GROUP
ipcMain.handle(
  'join-group',
  async (event, username, inviteCode, displayName) => {
    try {
      const axios = require('axios');
      const fastApiUrl = process.env.FASTAPI_URL;
      const apiKey = process.env.YETCODE_API_KEY;

      const response = await axios.post(
        `${fastApiUrl}/join-group`,
        {
          username: username,
          invite_code: inviteCode,
          display_name: displayName,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return { joined: true, groupId: response.data.group_id };
      } else {
        throw new Error(response.data.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('[ERROR][join-group]', error);
      throw error;
    }
  }
);

// GET GROUP STATS
ipcMain.handle('get-stats-for-group', async (event, groupId) => {
  console.log('[DEBUG][get-stats-for-group] Called with groupId:', groupId);

  try {
    // Check if we have cached data for this group
    const cached = groupStatsCache.data[groupId];
    const cacheTimestamp = groupStatsCache.timestamp[groupId];

    if (cached && cacheTimestamp) {
      const now = Date.now();
      const cacheAge = now - cacheTimestamp;
      const THIRTY_SECONDS = 30 * 1000;

      if (cacheAge < THIRTY_SECONDS) {
        console.log(
          '[DEBUG][get-stats-for-group] Returning cached data for group:',
          groupId
        );
        return cached;
      }
    }

    console.log(
      '[DEBUG][get-stats-for-group] Cache miss, fetching from API for group:',
      groupId
    );
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/group-stats/${groupId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      const data = response.data.data || [];

      // Cache the result
      groupStatsCache.data[groupId] = data;
      groupStatsCache.timestamp[groupId] = Date.now();
      console.log(
        '[DEBUG][get-stats-for-group] Cached data for group:',
        groupId
      );

      return data;
    } else {
      throw new Error(response.data.error || 'Failed to get group stats');
    }
  } catch (error) {
    console.error('[ERROR][get-stats-for-group]', error);
    return [];
  }
});

ipcMain.handle('get-user-data', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/user-data/${username}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      return response.data.data || {};
    } else {
      console.error('[ERROR][get-user-data]', response.data.error);
      return {};
    }
  } catch (error) {
    console.error('[ERROR][get-user-data]', error);
    return {};
  }
});

ipcMain.handle('leave-group', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/leave-group`,
      {
        username: username,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return { left: true };
    } else {
      throw new Error(response.data.error || 'Failed to leave group');
    }
  } catch (error) {
    console.error('[ERROR][leave-group]', error);
    throw error;
  }
});

// UPDATE DISPLAY NAME
ipcMain.handle('update-display-name', async (event, username, displayName) => {
  if (!displayName || !displayName.trim()) {
    return { success: false, error: 'No display name provided' };
  }

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.put(
      `${fastApiUrl}/update-display-name`,
      {
        username: username,
        display_name: displayName.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to update display name',
      };
    }
  } catch (error) {
    console.error('[ERROR][update-display-name]', error);
    return { success: false, error: error.message };
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
    categorySlug: '',
    limit: 1000,
    skip: 0,
    filters: {
      difficulty: difficulty,
    },
  };

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: query,
        variables: variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'YeetCode/1.0',
        },
      }
    );

    console.log(
      '[DEBUG][fetch-random-problem] Response status:',
      response.status
    );

    const data = response.data;
    if (data.errors) {
      console.error(
        '[ERROR][fetch-random-problem] GraphQL errors:',
        data.errors
      );
      throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
    }

    const freeProblems = data.data.problemsetQuestionList.questions.filter(
      problem => !problem.paidOnly
    );

    console.log(
      '[DEBUG][fetch-random-problem] Found',
      freeProblems.length,
      'free problems'
    );

    if (freeProblems.length > 0) {
      const randomProblem =
        freeProblems[Math.floor(Math.random() * freeProblems.length)];
      console.log(
        '[DEBUG][fetch-random-problem] Selected:',
        randomProblem.title
      );
      return randomProblem;
    } else {
      throw new Error('No free problems found');
    }
  } catch (error) {
    console.error('[ERROR][fetch-random-problem]', error.message);
    throw error; // Re-throw the error instead of returning fallback
  }
});

// Fetch daily problem data from FastAPI with caching
ipcMain.handle('get-daily-problem', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    // Check if we need to refresh top problems cache
    if (shouldRefreshTopProblemsCache()) {
      console.log('[DEBUG][get-daily-problem] Refreshing top problems cache');
      try {
        // Fetch top 2 problems from FastAPI
        const topProblemsResponse = await axios.get(
          `${fastApiUrl}/top-daily-problems`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (topProblemsResponse.data.success) {
          dailyProblemCache.topProblems.data = topProblemsResponse.data.data;
          dailyProblemCache.topProblems.lastRefreshed = new Date();
          console.log(
            '[DEBUG][get-daily-problem] Top problems cache refreshed'
          );
        }
      } catch (error) {
        console.error(
          '[ERROR][get-daily-problem] Failed to refresh top problems cache:',
          error
        );
      }
    }

    // Check if we have cached data for this user
    if (!isLatestProblemCacheExpired(username)) {
      console.log(
        '[DEBUG][get-daily-problem] Returning cached data for user:',
        username
      );
      return dailyProblemCache.latestProblem.data[username];
    }

    console.log(
      '[DEBUG][get-daily-problem] Cache miss, fetching from API for user:',
      username
    );
    const response = await axios.get(
      `${fastApiUrl}/daily-problem/${username}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      const data = response.data.data;

      // Fetch problem details from LeetCode API if we have a problem
      let problemDetails = null;
      if (data.todaysProblem) {
        try {
          problemDetails = await fetchLeetCodeProblemDetails(
            data.todaysProblem.titleSlug || data.todaysProblem.slug
          );
        } catch (error) {
          console.error(
            '[ERROR][get-daily-problem] Failed to fetch problem details:',
            error
          );
          // Fallback to stored data
          problemDetails = {
            title: data.todaysProblem.title,
            titleSlug: data.todaysProblem.titleSlug || data.todaysProblem.slug,
            frontendQuestionId: data.todaysProblem.frontendId,
            difficulty: 'Unknown',
            content: 'Problem details unavailable',
            topicTags: (
              data.todaysProblem.topicTags ||
              data.todaysProblem.tags ||
              []
            ).map(tag => ({ name: tag })),
          };
        }
      }

      const result = {
        dailyComplete: data.dailyComplete,
        streak: data.streak,
        todaysProblem: problemDetails,
        error: null,
      };

      // Cache the result
      dailyProblemCache.latestProblem.data[username] = result;
      dailyProblemCache.latestProblem.timestamp[username] = Date.now();
      console.log('[DEBUG][get-daily-problem] Cached data for user:', username);

      return result;
    } else {
      throw new Error(response.data.error || 'Failed to get daily problem');
    }
  } catch (error) {
    console.error('[ERROR][get-daily-problem]', error);
    return {
      dailyComplete: false,
      streak: 0,
      todaysProblem: null,
      error: error.message,
    };
  }
});

// Mark daily problem as complete and award XP
ipcMain.handle('complete-daily-problem', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/complete-daily-problem`,
      {
        username: username,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return {
        success: true,
        xpAwarded: 10, // FastAPI awards 10 XP
        error: null,
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to complete daily problem',
        xpAwarded: 0,
      };
    }
  } catch (error) {
    console.error('[ERROR][complete-daily-problem]', error);
    return {
      success: false,
      error: error.message,
      xpAwarded: 0,
    };
  }
});

// Get all bounties
ipcMain.handle('get-bounties', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/bounties/${username}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      const bounties = response.data.data || [];

      // Calculate progress for each bounty if username is provided
      if (username) {
        bounties.forEach(bounty => {
          const userProgress = bounty.users && bounty.users[username];
          if (userProgress && userProgress.N) {
            bounty.userProgress = parseInt(userProgress.N);
            bounty.progressPercent = Math.min(
              (bounty.userProgress / bounty.count) * 100,
              100
            );
          } else {
            bounty.userProgress = 0;
            bounty.progressPercent = 0;
          }

          // Check if bounty is expired
          const now = Math.floor(Date.now() / 1000);
          bounty.isExpired = now > bounty.expirydate;
          bounty.isActive = now >= bounty.startdate && !bounty.isExpired;

          // Calculate time remaining
          if (bounty.isActive) {
            bounty.timeRemaining = bounty.expirydate - now;
            bounty.daysRemaining = Math.ceil(
              bounty.timeRemaining / (24 * 60 * 60)
            );
          }
        });
      }

      return bounties;
    } else {
      throw new Error(response.data.error || 'Failed to get bounties');
    }
  } catch (error) {
    console.error('[ERROR][get-bounties]', error);
    return [];
  }
});

// Manual trigger for daily challenge notification (for testing)
ipcMain.handle('check-daily-notification', async () => {
  return await notificationManager.testNotification();
});

// Get cached top daily problems
ipcMain.handle('get-cached-top-problems', async () => {
  console.log(
    '[DEBUG][get-cached-top-problems] Retrieving cached top problems'
  );

  // If cache is empty or needs refresh, try to fetch it
  if (!dailyProblemCache.topProblems.data || shouldRefreshTopProblemsCache()) {
    try {
      const axios = require('axios');
      const fastApiUrl = process.env.FASTAPI_URL;
      const apiKey = process.env.YETCODE_API_KEY;

      const response = await axios.get(`${fastApiUrl}/top-daily-problems`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data.success) {
        dailyProblemCache.topProblems.data = response.data.data;
        dailyProblemCache.topProblems.lastRefreshed = new Date();
      }
    } catch (error) {
      console.error(
        '[ERROR][get-cached-top-problems] Failed to fetch top problems:',
        error
      );
    }
  }

  return dailyProblemCache.topProblems.data || [];
});

// App state tracking for smart notifications
ipcMain.handle('update-app-state', async (event, step, userData, dailyData) => {
  console.log('[DEBUG][update-app-state] Updating app state:', {
    step,
    username: userData?.leetUsername,
    dailyComplete: dailyData?.dailyComplete,
  });

  notificationManager.updateAppState(step, userData, dailyData);

  return { success: true };
});

ipcMain.handle('clear-app-state', async () => {
  console.log('[DEBUG][clear-app-state] Clearing app state');
  notificationManager.clearAppState();

  return { success: true };
});

// ========================================
// MAGIC LINK AUTH HANDLERS
// ========================================

// Send magic link with verification code
ipcMain.handle('send-magic-link', async (event, email) => {
  console.log('[DEBUG][send-magic-link] called for email:', email);

  if (!email || !email.trim()) {
    return { success: false, error: 'Email is required' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  try {
    const code = generateVerificationCode();

    // Store code in database
    await storeVerificationCode(email, code);

    // Send email via FastAPI server
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    try {
      const response = await axios.post(
        `${fastApiUrl}/send-otp`,
        {
          email: email,
          code: code,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data.success) {
        console.log('[DEBUG][send-magic-link] FastAPI success for:', email);
        return {
          success: true,
          message: 'Verification code sent to your email',
          email: email.toLowerCase(),
        };
      } else {
        throw new Error(response.data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('[ERROR][send-magic-link] FastAPI error:', error);
      throw error;
    }
  } catch (error) {
    console.error('[ERROR][send-magic-link]', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
});

// Verify magic link code
ipcMain.handle('verify-magic-token', async (event, email, code) => {
  console.log(
    '[DEBUG][verify-magic-token] called for email:',
    email,
    'code:',
    code
  );

  if (!email || !code) {
    return { success: false, error: 'Email and code are required' };
  }

  try {
    const result = await verifyCodeAndGetUser(email, code);

    if (!result.success) {
      return result;
    }

    console.log(
      '[DEBUG][verify-magic-token] Verification successful for:',
      email
    );
    return result;
  } catch (error) {
    console.error('[ERROR][verify-magic-token]', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code',
    };
  }
});

// Update user record with email after LeetCode verification
ipcMain.handle('update-user-email', async (event, leetUsername, email) => {
  console.log(
    '[DEBUG][update-user-email] called for:',
    leetUsername,
    'email:',
    email
  );

  const normalizedUsername = leetUsername.toLowerCase();
  const normalizedEmail = email.toLowerCase();

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.put(
      `${fastApiUrl}/user-data/${normalizedUsername}`,
      {
        email: normalizedEmail,
        updated_at: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log(
        '[DEBUG][update-user-email] Email updated for user:',
        normalizedUsername
      );
      return { success: true };
    } else {
      throw new Error(response.data.error || 'Failed to update user email');
    }
  } catch (error) {
    console.error('[ERROR][update-user-email]', error);
    return {
      success: false,
      error: error.message || 'Failed to update user email',
    };
  }
});

// ========================================
// DUEL SYSTEM HANDLERS
// ========================================

// Get all duels for a user
ipcMain.handle('get-user-duels', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/duels/${username}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      const duels = response.data.data || [];
      return duels;
    } else {
      throw new Error(response.data.error || 'Failed to get duels');
    }
  } catch (error) {
    console.error('[ERROR][get-user-duels]', error);
    return [];
  }
});

// Get recent completed duels for a user
ipcMain.handle('get-recent-duels', async (event, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/duels/${username}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      const duels = response.data.data || [];

      // Filter for completed duels and sort by creation date (newest first) and limit to 10
      const completedDuels = duels
        .filter(duel => duel.status === 'COMPLETED')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      return completedDuels;
    } else {
      throw new Error(response.data.error || 'Failed to get recent duels');
    }
  } catch (error) {
    console.error('[ERROR][get-recent-duels]', error);
    return [];
  }
});

// Create a new duel
ipcMain.handle(
  'create-duel',
  async (event, challengerUsername, challengeeUsername, difficulty) => {
    try {
      const axios = require('axios');
      const fastApiUrl = process.env.FASTAPI_URL;
      const apiKey = process.env.YETCODE_API_KEY;

      // Map difficulty to LeetCode API values
      const difficultyMap = {
        Easy: 'EASY',
        Medium: 'MEDIUM',
        Hard: 'HARD',
        Random: ['EASY', 'MEDIUM', 'HARD'][Math.floor(Math.random() * 3)],
      };
      const targetDifficulty = difficultyMap[difficulty] || 'MEDIUM';

      // Fetch a real random problem from LeetCode API
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
        categorySlug: '',
        limit: 1000,
        skip: 0,
        filters: {
          difficulty: targetDifficulty,
        },
      };
      const leetcodeResponse = await axios.post(
        'https://leetcode.com/graphql',
        {
          query: query,
          variables: variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'YeetCode/1.0',
          },
        }
      );
      const data = leetcodeResponse.data;
      if (data.errors) {
        console.error('[ERROR][create-duel] GraphQL errors:', data.errors);
        throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
      }
      const freeProblems = data.data.problemsetQuestionList.questions.filter(
        problem => !problem.paidOnly
      );
      if (freeProblems.length === 0) {
        throw new Error('No free problems found for this difficulty');
      }
      const randomProblem =
        freeProblems[Math.floor(Math.random() * freeProblems.length)];

      // Create duel via FastAPI
      const response = await axios.post(
        `${fastApiUrl}/create-duel`,
        {
          username: challengerUsername,
          opponent: challengeeUsername,
          problem_slug: randomProblem.titleSlug,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return {
          duelId: response.data.data.duel_id,
          challenger: challengerUsername,
          challengee: challengeeUsername,
          difficulty,
          status: 'PENDING',
          problemSlug: randomProblem.titleSlug,
          problemTitle: randomProblem.title,
          createdAt: new Date().toISOString(),
        };
      } else {
        throw new Error(response.data.error || 'Failed to create duel');
      }
    } catch (error) {
      console.error('[ERROR][create-duel]', error);
      throw error;
    }
  }
);

// Accept a duel
ipcMain.handle('accept-duel', async (event, duelId) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/accept-duel`,
      {
        duel_id: duelId,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return {
        duelId: duelId,
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
      };
    } else {
      throw new Error(response.data.error || 'Failed to accept duel');
    }
  } catch (error) {
    console.error('[ERROR][accept-duel]', error);
    throw error;
  }
});

// Reject a duel
ipcMain.handle('reject-duel', async (event, duelId) => {
  console.log('[DEBUG][reject-duel] called for duelId:', duelId);

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/reject-duel`,
      {
        duel_id: duelId,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log(
        '[DEBUG][reject-duel] Duel rejected and deleted successfully'
      );
      return { success: true, duelId };
    } else {
      throw new Error(response.data.error || 'Failed to reject duel');
    }
  } catch (error) {
    console.error('[ERROR][reject-duel]', error);
    throw error;
  }
});

// Helper function to record duel submission logic
const recordDuelSubmissionLogic = async (duelId, username, elapsedMs) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/record-duel-submission`,
      {
        duel_id: duelId,
        username: username,
        elapsed_ms: elapsedMs,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(
        response.data.error || 'Failed to record duel submission'
      );
    }
  } catch (error) {
    console.error('[ERROR][recordDuelSubmissionLogic]', error);
    throw error;
  }
};

// Record duel submission
ipcMain.handle(
  'record-duel-submission',
  async (event, duelId, username, elapsedMs) => {
    console.log(
      '[DEBUG][record-duel-submission] duelId:',
      duelId,
      'username:',
      username,
      'elapsedMs:',
      elapsedMs
    );

    try {
      return await recordDuelSubmissionLogic(duelId, username, elapsedMs);
    } catch (error) {
      console.error('[ERROR][record-duel-submission]', error);
      throw error;
    }
  }
);

// Get a specific duel
ipcMain.handle('get-duel', async (event, duelId) => {
  console.log('[DEBUG][get-duel] called for duelId:', duelId);

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/duel/${duelId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('[ERROR][get-duel]', error);
    return null;
  }
});

// Fetch LeetCode submissions for polling
ipcMain.handle(
  'fetch-leetcode-submissions',
  async (event, username, limit = 5) => {
    console.log(
      '[DEBUG][fetch-leetcode-submissions] called for username:',
      username,
      'limit:',
      limit
    );

    try {
      // Use real LeetCode GraphQL API
      const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
          timestamp
        }
      }
    `;

      const variables = {
        username: username,
        limit: limit,
      };

      console.log(
        '[DEBUG][fetch-leetcode-submissions] Making GraphQL request to LeetCode...'
      );

      const response = await axios.post(
        'https://leetcode.com/graphql',
        {
          query: query,
          variables: variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'YeetCode/1.0',
          },
        }
      );

      console.log(
        '[DEBUG][fetch-leetcode-submissions] Response status:',
        response.status
      );

      const data = response.data;
      if (data.errors) {
        console.error(
          '[ERROR][fetch-leetcode-submissions] GraphQL errors:',
          data.errors
        );
        throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
      }

      const submissions = data.data.recentAcSubmissionList || [];

      // Convert timestamp to readable format and add additional fields for compatibility
      const formattedSubmissions = submissions.map(sub => ({
        titleSlug: sub.titleSlug,
        timestamp: new Date(parseInt(sub.timestamp) * 1000).toISOString(), // Convert Unix timestamp to ISO string
        statusDisplay: 'Accepted', // All submissions from this endpoint are accepted
        lang: 'unknown', // LeetCode API doesn't provide language in this endpoint
      }));

      console.log(
        `[DEBUG][fetch-leetcode-submissions] Successfully fetched ${formattedSubmissions.length} submissions for ${username}`
      );
      return formattedSubmissions;
    } catch (error) {
      console.error('[ERROR][fetch-leetcode-submissions]', error);

      // Return empty array on error so duels continue working
      console.log(
        '[DEBUG][fetch-leetcode-submissions] Returning empty array due to error'
      );
      return [];
    }
  }
);

// Helper function to fetch problem details from LeetCode API
const fetchLeetCodeProblemDetails = async slug => {
  console.log(
    '[DEBUG][fetchLeetCodeProblemDetails] fetching details for:',
    slug
  );

  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        titleSlug
        questionFrontendId
        difficulty
        content
        topicTags {
          name
        }
        hints
        sampleTestCase
      }
    }
  `;

  const variables = {
    titleSlug: slug,
  };

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: query,
        variables: variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'YeetCode/1.0',
        },
      }
    );

    console.log(
      '[DEBUG][fetchLeetCodeProblemDetails] Response status:',
      response.status
    );

    const data = response.data;
    if (data.errors) {
      console.error(
        '[ERROR][fetchLeetCodeProblemDetails] GraphQL errors:',
        data.errors
      );
      throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
    }

    const questionData = data.data.question;
    if (!questionData) {
      throw new Error('Question not found');
    }

    console.log(
      '[DEBUG][fetchLeetCodeProblemDetails] Successfully fetched:',
      questionData.title
    );
    return questionData;
  } catch (error) {
    console.error('[ERROR][fetchLeetCodeProblemDetails]', error.message);
    throw error;
  }
};

// Export helper function for internal use
exports.getDailyProblemStatus = async username => {
  // This is a simplified version of get-daily-problem for internal use
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(
      `${fastApiUrl}/daily-problem/${username}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      return { streak: response.data.data.streak || 0 };
    } else {
      return { streak: 0 };
    }
  } catch (error) {
    console.error('[ERROR][getDailyProblemStatus]', error);
    return { streak: 0 };
  }
};

// Clean up expired duels
const cleanupExpiredDuels = async () => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/cleanup-expired-duels`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log('[DEBUG][cleanupExpiredDuels] Cleanup completed');
    }
  } catch (error) {
    console.error('[ERROR][cleanupExpiredDuels]', error);
  }
};

// Set up periodic cleanup tasks
const setupCleanupTasks = () => {
  // Clean up expired verification codes every 5 minutes
  setInterval(cleanupExpiredVerificationCodes, 5 * 60 * 1000);

  // Clean up expired duels every 10 minutes
  setInterval(cleanupExpiredDuels, 10 * 60 * 1000);

  console.log('[DEBUG][setupCleanupTasks] Cleanup tasks scheduled');
};

// Set up cleanup tasks
setupCleanupTasks();

// Helper to send Discord webhook
const sendDiscordNotification = async (message, color = 3447003) => {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    console.log('[DEBUG][Discord] No webhook URL configured');
    return;
  }

  try {
    const axios = require('axios');
    await axios.post(discordWebhookUrl, {
      embeds: [
        {
          title: 'YeetCode Cache Notification',
          description: message,
          color: color,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'YeetCode Cache System',
          },
        },
      ],
    });
    console.log('[DEBUG][Discord] Notification sent successfully');
  } catch (error) {
    console.error(
      '[ERROR][Discord] Failed to send notification:',
      error.message
    );
  }
};

// Schedule cache refresh at 5:30 AM IST daily
const scheduleDailyCacheRefresh = () => {
  const checkAndRefresh = async () => {
    if (shouldRefreshTopProblemsCache()) {
      console.log(
        '[DEBUG][scheduleDailyCacheRefresh] Time to refresh cache at 5:30 AM IST'
      );

      try {
        const axios = require('axios');
        const fastApiUrl = process.env.FASTAPI_URL;
        const apiKey = process.env.YETCODE_API_KEY;

        const topProblemsResponse = await axios.get(
          `${fastApiUrl}/top-daily-problems`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (topProblemsResponse.data.success) {
          dailyProblemCache.topProblems.data = topProblemsResponse.data.data;
          dailyProblemCache.topProblems.lastRefreshed = new Date();
          console.log(
            '[DEBUG][scheduleDailyCacheRefresh] Cache refreshed successfully'
          );

          // Send Discord notification
          const problemCount = topProblemsResponse.data.data.length;
          const problems = topProblemsResponse.data.data
            .map(p => `• ${p.title} (${p.date})`)
            .join('\n');
          await sendDiscordNotification(
            `✅ Daily cache refreshed at 5:30 AM IST\n\nCached ${problemCount} problems:\n${problems}`,
            5763719 // Green color
          );
        }
      } catch (error) {
        console.error(
          '[ERROR][scheduleDailyCacheRefresh] Failed to refresh cache:',
          error
        );
        await sendDiscordNotification(
          `❌ Failed to refresh daily cache: ${error.message}`,
          15158332 // Red color
        );
      }
    }
  };

  // Check every minute if we need to refresh
  setInterval(checkAndRefresh, 60 * 1000);

  // Also check immediately on startup
  checkAndRefresh();

  console.log(
    '[DEBUG][scheduleDailyCacheRefresh] Daily cache refresh scheduled'
  );
};

// Start the daily cache refresh scheduler
scheduleDailyCacheRefresh();

// IPC handlers for manual cleanup (for testing)
ipcMain.handle('cleanup-expired-verification-codes', async () => {
  console.log(
    '[DEBUG][cleanup-expired-verification-codes] Manual cleanup triggered'
  );
  await cleanupExpiredVerificationCodes();
  return { success: true };
});

ipcMain.handle('cleanup-expired-duels', async () => {
  console.log('[DEBUG][cleanup-expired-duels] Manual cleanup triggered');
  await cleanupExpiredDuels();
  return { success: true };
});

// Clear daily problem cache (for testing)
ipcMain.handle('clear-daily-problem-cache', async () => {
  console.log('[DEBUG][clear-daily-problem-cache] Clearing all caches');
  dailyProblemCache.topProblems = {
    data: null,
    lastRefreshed: null,
  };
  dailyProblemCache.latestProblem = {
    data: {},
    timestamp: {},
  };
  groupStatsCache.data = {};
  groupStatsCache.timestamp = {};
  return { success: true, message: 'All caches cleared' };
});

// Test Discord notification (for testing)
ipcMain.handle('test-discord-notification', async () => {
  console.log('[DEBUG][test-discord-notification] Sending test notification');

  const topProblems = dailyProblemCache.topProblems.data || [];
  const cacheStatus =
    topProblems.length > 0
      ? `📊 Current cache contains ${topProblems.length} problems:\n${topProblems.map(p => `• ${p.title} (${p.date})`).join('\n')}`
      : '📭 Cache is currently empty';

  await sendDiscordNotification(
    `🧪 Test Notification\n\n${cacheStatus}\n\nLast refreshed: ${dailyProblemCache.topProblems.lastRefreshed || 'Never'}`,
    16776960 // Yellow color for test
  );

  return { success: true, message: 'Test notification sent' };
});

// System notification for duel events
ipcMain.handle(
  'notify-duel-event',
  (event, { type, opponent, problemTitle }) => {
    if (!Notification.isSupported()) return;
    let title = '';
    let body = '';
    switch (type) {
      case 'sent':
        title = '⚔️ Duel Challenge Sent!';
        body = `You challenged ${opponent} to a duel!`;
        break;
      case 'won':
        title = '🏆 Duel Won!';
        body = `You defeated ${opponent} in a duel${problemTitle ? ` on "${problemTitle}"` : ''}!`;
        break;
      case 'lost':
        title = '💀 Duel Lost';
        body = `You lost to ${opponent} in a duel${problemTitle ? ` on "${problemTitle}"` : ''}. Try again!`;
        break;
      case 'received':
        title = '⚔️ New Duel Challenge!';
        body = `${opponent} challenged you to a duel${problemTitle ? ` on "${problemTitle}"` : ''}!`;
        break;
      default:
        return;
    }
    new Notification({
      title,
      body,
      icon: path.join(__dirname, 'assets', 'icon.png'),
    }).show();
  }
);
