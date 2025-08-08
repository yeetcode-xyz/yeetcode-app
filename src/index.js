console.log('🚀 APP STARTING - Environment loading will begin...');

// Server-side caching is now handled by FastAPI
// Frontend caching removed in favor of server-side caching

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Notification,
} = require('electron');
const path = require('path');
const electronSquirrelStartup = require('electron-squirrel-startup');
const fs = require('fs');

// Import utility modules
const config = require('./utils/config');
const { fastApiClient, leetCodeClient } = require('./utils/api');
const {
  normalizeEmail,
  normalizeUsername,
  generateVerificationCode,
} = require('./utils/validation');
const {
  logError,
  logDebug,
  createErrorResponse,
  createSuccessResponse,
} = require('./utils/error-handler');

const isDev = config.isDev || !app.isPackaged;
const version = '0.1.2';

// ========================================
// LEETCODE PROBLEM DETAILS CACHE
// ========================================
// Cache LeetCode problem details to avoid expensive API calls
const problemDetailsCache = new Map();
const PROBLEM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const getCachedProblemDetails = async slug => {
  const cached = problemDetailsCache.get(slug);
  const now = Date.now();

  console.log('[CACHE DEBUG] Checking cache for slug:', slug);
  console.log('[CACHE DEBUG] Cache size:', problemDetailsCache.size);
  console.log('[CACHE DEBUG] Cached entry:', cached ? 'found' : 'not found');

  if (cached && now - cached.timestamp < PROBLEM_CACHE_TTL) {
    const age = (now - cached.timestamp) / 1000;
    console.log('[CACHE DEBUG] Cache hit! Age:', age, 'seconds');
    logDebug('getCachedProblemDetails', 'Cache hit for:', slug);
    return cached.data;
  }

  console.log('[CACHE DEBUG] Cache miss - fetching from LeetCode API');
  logDebug('getCachedProblemDetails', 'Cache miss for:', slug);
  try {
    const details = await fetchLeetCodeProblemDetails(slug);
    problemDetailsCache.set(slug, {
      data: details,
      timestamp: now,
    });
    console.log('[CACHE DEBUG] Cached new entry for:', slug);
    return details;
  } catch (error) {
    logError('getCachedProblemDetails', 'Failed to fetch:', error);
    throw error;
  }
};

// ========================================
// MAGIC LINK AUTHENTICATION SYSTEM
// ========================================

// Store verification code via FastAPI server
const storeVerificationCode = async (email, code) => {
  try {
    const response = await fastApiClient.post('/store-verification-code', {
      email: email,
      code: code,
    });

    logDebug('storeVerificationCode', 'Stored code for:', email);
    return { success: true };
  } catch (error) {
    logError('storeVerificationCode', 'Failed to store code:', error);
    throw error;
  }
};

// Verify code and return user data via FastAPI server
const verifyCodeAndGetUser = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);

  try {
    const response = await fastApiClient.post('/verify-code', {
      email: normalizedEmail,
      code: code,
    });

    logDebug('verifyCodeAndGetUser', 'Code verified for:', email);
    return {
      success: true,
      email: normalizedEmail,
      verified: true,
    };
  } catch (error) {
    logError('verifyCodeAndGetUser', 'Failed to verify code:', error);
    return {
      success: false,
      error: error.message || 'Verification failed',
    };
  }
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  console.log(path.join(__dirname, 'preload.js'));

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
// Register IPC handler for LeetCode username validation
ipcMain.handle('validate-leetcode-username', async (event, username) => {
  try {
    logDebug('validate-leetcode-username', 'Validating username:', username);
    const result = await leetCodeClient.validateUsername(username);
    logDebug('validate-leetcode-username', 'Validation result:', result);
    return result;
  } catch (error) {
    logError('validate-leetcode-username', error);
    return { exists: false, error: error.message };
  }
});

// CREATE GROUP
ipcMain.handle('create-group', async (event, username, displayName) => {
  try {
    const response = await fastApiClient.post('/create-group', {
      username: username,
      display_name: displayName,
    });

    console.log('[DEBUG] create-group response:', response);
    // The response includes the entire data object with success field
    if (response && response.group_id) {
      return { groupId: response.group_id };
    } else {
      throw new Error('Invalid response: missing group_id');
    }
  } catch (error) {
    logError('create-group', error);
    throw error;
  }
});

// JOIN GROUP
ipcMain.handle(
  'join-group',
  async (event, username, inviteCode, displayName) => {
    try {
      const response = await fastApiClient.post('/join-group', {
        username: username,
        invite_code: inviteCode,
        display_name: displayName,
      });

      console.log('[DEBUG] join-group response:', response);
      // The response includes the entire data object with success field
      if (response && response.group_id) {
        return { joined: true, groupId: response.group_id };
      } else {
        throw new Error('Invalid response: missing group_id');
      }
    } catch (error) {
      logError('join-group', error);
      throw error;
    }
  }
);

// GET GROUP STATS
ipcMain.handle('get-stats-for-group', async (event, groupId) => {
  console.log('[DEBUG][get-stats-for-group] Called with groupId:', groupId);

  try {
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
      return response.data.data || [];
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

ipcMain.handle('get-user-by-email', async (event, email) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.get(`${fastApiUrl}/user-by-email/${email}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      return response.data;
    } else {
      console.error('[ERROR][get-user-by-email]', response.data.error);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error('[ERROR][get-user-by-email]', error);
    return null;
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
  try {
    logDebug('fetch-random-problem', 'difficulty:', difficulty);
    const randomProblem = await leetCodeClient.selectRandomProblem(difficulty);
    logDebug('fetch-random-problem', 'Selected:', randomProblem.title);
    return randomProblem;
  } catch (error) {
    logError('fetch-random-problem', error);
    throw error;
  }
});

// Fetch daily problem data from FastAPI
ipcMain.handle('get-daily-problem', async (event, username) => {
  const startTime = Date.now();
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
      const data = response.data.data;

      // Fetch problem details from LeetCode API if we have a problem
      let problemDetails = null;
      if (data.todaysProblem) {
        try {
          const slug = data.todaysProblem.titleSlug || data.todaysProblem.slug;
          console.log('[DAILY DEBUG] Problem slug:', slug);
          console.log(
            '[DAILY DEBUG] Backend cache response time:',
            Date.now() - startTime,
            'ms'
          );
          problemDetails = await getCachedProblemDetails(slug);
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

      return {
        dailyComplete: data.dailyComplete,
        streak: data.streak,
        todaysProblem: problemDetails,
        error: null,
      };
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
ipcMain.handle('get-bounties', async (event, username, refresh = false) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const url = new URL(`${fastApiUrl}/bounties/${username}`);
    if (refresh) {
      url.searchParams.append('refresh', 'true');
    }

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      const bounties = response.data.data || [];

      // Backend now provides all computed fields (userProgress, progressPercent, isActive, isExpired, timeRemaining, daysRemaining)

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

// Get top daily problems (server-side cached)
ipcMain.handle('get-cached-top-problems', async () => {
  console.log(
    '[DEBUG][get-cached-top-problems] Retrieving top problems from server'
  );

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
      return response.data.data || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error(
      '[ERROR][get-cached-top-problems] Failed to fetch top problems:',
      error
    );
    return [];
  }
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

// Create user with specific username and email
ipcMain.handle(
  'create-user-with-username',
  async (event, username, email, displayName, university) => {
    console.log(
      '[DEBUG][create-user-with-username] called for:',
      username,
      'email:',
      email,
      'displayName:',
      displayName,
      'university:',
      university
    );

    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    try {
      const axios = require('axios');
      const fastApiUrl = process.env.FASTAPI_URL;
      const apiKey = process.env.YETCODE_API_KEY;

      const response = await axios.post(
        `${fastApiUrl}/create-user-with-username`,
        {
          username: normalizedUsername,
          email: normalizedEmail,
          display_name: displayName,
          university: university,
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
          '[DEBUG][create-user-with-username] Created user:',
          normalizedUsername
        );
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('[ERROR][create-user-with-username]', error);
      return {
        success: false,
        error: error.message || 'Failed to create user',
      };
    }
  }
);

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

      // Create duel via FastAPI (normalize usernames to lowercase)
      const response = await axios.post(
        `${fastApiUrl}/create-duel`,
        {
          username: challengerUsername.toLowerCase(),
          opponent: challengeeUsername.toLowerCase(),
          problem_slug: randomProblem.titleSlug,
          difficulty: targetDifficulty,
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
        const createdDuel = {
          duelId: response.data.data.duel_id,
          challenger: challengerUsername.toLowerCase(),
          challengee: challengeeUsername.toLowerCase(),
          difficulty: randomProblem.difficulty, // Use actual problem difficulty
          status: 'PENDING',
          problemSlug: randomProblem.titleSlug,
          problemTitle: randomProblem.title,
          createdAt: new Date().toISOString(),
          challengerTime: -1,
          challengeeTime: -1,
        };
        return createdDuel;
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
ipcMain.handle('accept-duel', async (event, duelId, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/accept-duel`,
      {
        duel_id: duelId,
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

// Start a duel (mark as started)
ipcMain.handle('start-duel', async (event, duelId, username) => {
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/start-duel`,
      {
        duel_id: duelId,
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
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.error || 'Failed to start duel');
    }
  } catch (error) {
    console.error('[ERROR][start-duel]', error);
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
    try {
      logDebug(
        'fetch-leetcode-submissions',
        'called for username:',
        username,
        'limit:',
        limit
      );
      const submissions = await leetCodeClient.fetchRecentSubmissions(
        username,
        limit
      );
      logDebug(
        'fetch-leetcode-submissions',
        `Successfully fetched ${submissions.length} submissions for ${username}`
      );
      return submissions;
    } catch (error) {
      logError('fetch-leetcode-submissions', error);
      logDebug(
        'fetch-leetcode-submissions',
        'Returning empty array due to error'
      );
      return [];
    }
  }
);

// Helper function to fetch problem details from LeetCode API
const fetchLeetCodeProblemDetails = async slug => {
  try {
    logDebug('fetchLeetCodeProblemDetails', 'fetching details for:', slug);
    const questionData = await leetCodeClient.fetchProblemDetails(slug);
    logDebug(
      'fetchLeetCodeProblemDetails',
      'Successfully fetched:',
      questionData.title
    );
    return questionData;
  } catch (error) {
    logError('fetchLeetCodeProblemDetails', error);
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

// Clear server cache (for testing)
ipcMain.handle('clear-daily-problem-cache', async () => {
  console.log(
    '[DEBUG][clear-daily-problem-cache] Requesting server cache clear'
  );

  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;

    const response = await axios.post(
      `${fastApiUrl}/cache/clear`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('[ERROR][clear-daily-problem-cache]', error);
    return { success: false, error: error.message };
  }
});

// Test Discord notification (for testing)
ipcMain.handle('test-discord-notification', async () => {
  console.log('[DEBUG][test-discord-notification] Sending test notification');

  // Discord notifications are now handled server-side
  return {
    success: true,
    message: 'Discord notifications handled server-side',
  };
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

// GET UNIVERSITY LEADERBOARD
ipcMain.handle('get-university-leaderboard', async event => {
  console.log('[DEBUG][get-university-leaderboard] Called');
  try {
    const axios = require('axios');
    const fastApiUrl = process.env.FASTAPI_URL;
    const apiKey = process.env.YETCODE_API_KEY;
    const response = await axios.get(`${fastApiUrl}/university-leaderboard`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    if (response.data.success) {
      return response.data.data || [];
    } else {
      throw new Error(
        response.data.error || 'Failed to get university leaderboard'
      );
    }
  } catch (error) {
    console.error('[ERROR][get-university-leaderboard]', error);
    throw error;
  }
});
