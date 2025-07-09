import './index.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Local storage keys
const STORAGE_KEYS = {
  USER_DATA: 'yeetcode_user_data',
  APP_STATE: 'yeetcode_app_state',
};

// Local storage utilities
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

function App() {
  // Core state
  const [step, setStep] = useState('welcome');
  const [userData, setUserData] = useState({ name: '', leetUsername: '' });
  const [groupData, setGroupData] = useState({ code: '', joined: false });
  const [leaderboard, setLeaderboard] = useState([]);

  // UI state
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [refreshIn, setRefreshIn] = useState(60);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const savedUserData = loadFromStorage(STORAGE_KEYS.USER_DATA);
    const savedAppState = loadFromStorage(STORAGE_KEYS.APP_STATE);

    if (savedUserData) {
      setUserData(savedUserData);
      console.log('Loaded saved user data:', savedUserData);
    }

    if (savedAppState) {
      setStep(savedAppState.step || 'welcome');
      setGroupData(savedAppState.groupData || { code: '', joined: false });
      console.log('Loaded saved app state:', savedAppState);
    }
  }, []);

  // Development helpers - updated whenever state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.devHelpers = {
        // Navigation
        goToWelcome: () => navigateToStep('welcome'),
        goToOnboarding: () => navigateToStep('onboarding'),
        goToGroup: () => navigateToStep('group'),
        goToLeaderboard: () => navigateToStep('leaderboard'),

        // Data setup with proper state updates
        setTestUser: (name = 'Test User', leetUser = 'testuser123') => {
          const newUserData = { name, leetUsername: leetUser };
          setUserData(newUserData);
          saveToStorage(STORAGE_KEYS.USER_DATA, newUserData);
          console.log(`🎯 Set test user: ${name} (${leetUser})`);
        },

        setTestGroup: (code = 'TEST123') => {
          const newGroupData = { code, joined: true };
          setGroupData(newGroupData);
          saveAppState('leaderboard', newGroupData);
          console.log(`🎯 Set test group: ${code}`);
        },

        // Skip group functionality (for AWS issues)
        skipGroup: () => {
          const newGroupData = { code: 'DEV-SKIP', joined: true };
          setGroupData(newGroupData);
          navigateToStep('leaderboard');
          console.log('🎯 Skipped group setup - going to leaderboard');
        },

        // Quick test scenarios
        testOnboarding: () => {
          window.devHelpers.setTestUser();
          navigateToStep('onboarding');
        },

        testLeaderboard: () => {
          window.devHelpers.setTestUser();
          window.devHelpers.setTestGroup();
          navigateToStep('leaderboard');
        },

        // Utilities - now captures current state
        showState: () => {
          console.log('🎯 Current app state:', {
            step,
            userData,
            groupData,
            error,
            validating,
            refreshIn,
            showSuccess,
            animationClass,
          });
        },

        clearStorage: () => {
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          localStorage.removeItem(STORAGE_KEYS.APP_STATE);
          setUserData({ name: '', leetUsername: '' });
          setGroupData({ code: '', joined: false });
          setStep('welcome');
          console.log('🎯 Cleared all saved data');
        },

        clearError: () => {
          setError('');
          console.log('🎯 Cleared error state');
        },
      };
    }
  }, [
    step,
    userData,
    groupData,
    error,
    validating,
    refreshIn,
    showSuccess,
    animationClass,
  ]);

  // Show dev helpers info only once
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`
🚀 YeetCode Development Helpers Available!

Navigation:
• devHelpers.goToWelcome() - Go to welcome screen
• devHelpers.goToOnboarding() - Go to onboarding screen  
• devHelpers.goToGroup() - Go to group screen
• devHelpers.goToLeaderboard() - Go to leaderboard screen

Data Setup:
• devHelpers.setTestUser(name, leetUser) - Set test user data
• devHelpers.setTestGroup(code) - Set test group data
• devHelpers.skipGroup() - Skip group setup (for AWS issues)

Quick Test Scenarios:
• devHelpers.testOnboarding() - Jump to onboarding with test data
• devHelpers.testLeaderboard() - Jump to leaderboard with test data

Utilities:
• devHelpers.showState() - Show current app state
• devHelpers.clearStorage() - Clear all saved data
• devHelpers.clearError() - Clear error messages

Example: devHelpers.testLeaderboard()
      `);
    }
  }, []);

  // Save user data when it changes
  useEffect(() => {
    if (userData.name || userData.leetUsername) {
      saveToStorage(STORAGE_KEYS.USER_DATA, userData);
    }
  }, [userData]);

  // Save app state when it changes
  useEffect(() => {
    if (step !== 'welcome' || groupData.joined) {
      saveAppState(step, groupData);
    }
  }, [step, groupData]);

  // Handle leaderboard refresh
  useEffect(() => {
    if (step !== 'leaderboard' || !groupData.joined || !groupData.code) {
      return;
    }

    // First load right away, and reset the counter
    fetchLeaderboard();
    setRefreshIn(60);

    // Then tick every second: when it hits 1, fetch again & reset
    const countdown = setInterval(() => {
      setRefreshIn(r => {
        if (r <= 1) {
          fetchLeaderboard();
          return 60;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [step, groupData.joined, groupData.code]);

  // Helper functions
  const saveAppState = (currentStep, currentGroupData) => {
    saveToStorage(STORAGE_KEYS.APP_STATE, {
      step: currentStep,
      groupData: currentGroupData,
    });
  };

  const navigateToStep = newStep => {
    setAnimationClass('fade-out');
    setTimeout(() => {
      setStep(newStep);
      setAnimationClass('fade-in');
    }, 300);
  };

  const fetchLeaderboard = async () => {
    if (!groupData.code) return;

    try {
      // 1) IPC into main, DynamoDB GSI or scan
      const items = await window.electronAPI.getStatsForGroup(groupData.code);

      // 2) Normalize + compute totals
      const normalized = items.map(item => ({
        username: item.username,
        name: item.username,
        easy: item.easy ?? 0,
        medium: item.medium ?? 0,
        hard: item.hard ?? 0,
        today: item.today ?? 0,
      }));

      setLeaderboard(normalized);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const handleStartOnboarding = () => {
    navigateToStep('onboarding');
  };

  const handleValidateLeet = async () => {
    setError('');

    if (!userData.leetUsername.trim()) {
      setError('Please enter your LeetCode username');
      return;
    }
    if (!userData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setValidating(true);
    try {
      // 1) Validate username via API or mock
      let result = { exists: true, error: null };
      if (window.electronAPI) {
        console.log(
          'Calling validateLeetCodeUsername with:',
          userData.leetUsername
        );
        result = await window.electronAPI.validateLeetCodeUsername(
          userData.leetUsername
        );
        console.log('Validation result:', result);
      }

      // 2) Handle API Gateway format
      if (result.statusCode && result.body) {
        try {
          result = JSON.parse(result.body);
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          result = { exists: false, error: 'Error parsing API response' };
        }
      }

      if (!result.exists) {
        // Validation failed
        setError(
          result.error
            ? `Username validation failed: ${result.error}`
            : 'Username validation failed. Please try again.'
        );
        return;
      }

      // 3) On success, show indicator then fetch & navigate once
      setShowSuccess(true);

      // Fetch saved user data now
      const userRecord = await window.electronAPI.getUserData(
        userData.leetUsername
      );
      console.log('🛠 getUserData returned:', userRecord);

      // After 2s, hide success and navigate appropriately
      setTimeout(() => {
        setShowSuccess(false);
        if (userRecord.group_id) {
          setGroupData({ code: userRecord.group_id, joined: true });
          navigateToStep('leaderboard');
        } else {
          navigateToStep('group');
        }
      }, 2000);
    } catch (err) {
      console.error('Error in validation:', err);
      setError(`Error: ${err.message || 'Failed to validate username'}`);
    } finally {
      setValidating(false);
    }
  };

  const handleJoinGroup = async () => {
    setError('');

    if (!groupData.code.trim()) {
      setError('Please enter a group code');
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.joinGroup(
          userData.leetUsername,
          groupData.code
        );
      } else {
        // Mock join for development
        console.log('Mock joining group:', groupData.code);
      }

      const newGroupData = { ...groupData, joined: true };
      setGroupData(newGroupData);
      navigateToStep('leaderboard');
    } catch (err) {
      console.error('Error joining group:', err);
      setError(
        err.message ||
          'Failed to join group. Try using devHelpers.skipGroup() for development.'
      );
    }
  };

  const handleCreateGroup = async () => {
    setError('');

    try {
      let groupId =
        'DEV-' + Math.random().toString(36).substr(2, 5).toUpperCase();

      if (window.electronAPI) {
        const result = await window.electronAPI.createGroup(
          userData.leetUsername
        );
        groupId = result.groupId;
      } else {
        console.log('Mock creating group:', groupId);
      }

      const newGroupData = { code: groupId, joined: true };
      setGroupData(newGroupData);
      navigateToStep('leaderboard');
    } catch (err) {
      console.error('Error creating group:', err);
      setError(
        err.message ||
          'Failed to create group. Try using devHelpers.skipGroup() for development.'
      );
    }
  };

  const handleLeaveGroup = async () => {
    setError('');
    try {
      await window.electronAPI.leaveGroup(userData.leetUsername);
      // locally clear it too:
      setGroupData({ code: '', joined: false });
      navigateToStep('group');
    } catch (err) {
      console.error('Error leaving group:', err);
      setError('Could not leave group. Please try again.');
    }
  };

  // UI
  return (
    <div
      className={`w-full ${step === 'leaderboard' ? 'max-w-7xl' : 'max-w-md'} mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black ${step === 'leaderboard' ? 'min-h-[700px]' : 'min-h-[400px]'} flex flex-col gap-6`}
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <h1 className="text-2xl font-bold mb-2 text-center border-b-4 border-black pb-2">
        YeetCode
      </h1>

      {step === 'welcome' && (
        <div className={`flex flex-col gap-6 ${animationClass}`}>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Welcome to YeetCode! 🚀</h2>
            <p className="text-sm mb-4">
              The ultimate competitive coding platform that makes LeetCode
              practice fun and social!
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Connect your LeetCode account</li>
                <li>• Join or create a study group</li>
                <li>• Compete with friends on the leaderboard</li>
                <li>• Track your progress in real-time</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <h3 className="font-bold text-green-800 mb-2">
                Leaderboard Features:
              </h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Real-time ranking updates</li>
                <li>• Easy/Medium/Hard problem tracking</li>
                <li>• Daily progress monitoring</li>
                <li>• Group competition and motivation</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleStartOnboarding}
            className="px-6 py-3 bg-yellow-300 hover:bg-yellow-500 border-2 border-black rounded-lg font-bold text-black btn-3d"
          >
            Get Started! 🎯
          </button>

          {/* Show continue option if user has saved data */}
          {(userData.name || userData.leetUsername) && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Welcome back, {userData.name || 'User'}!
              </p>
              <button
                onClick={() =>
                  navigateToStep(groupData.joined ? 'leaderboard' : 'group')
                }
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 border-2 border-black rounded-lg font-bold text-black btn-3d"
              >
                Continue Where You Left Off
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'onboarding' && (
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Let's get you set up!</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Your Name</label>
              <input
                className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Enter your first name"
                value={userData.name}
                onChange={e =>
                  setUserData({ ...userData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                LeetCode Username
              </label>
              <div className="flex gap-2">
                <input
                  className="border-2 border-black rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Your LeetCode username"
                  value={userData.leetUsername}
                  onChange={e =>
                    setUserData({ ...userData, leetUsername: e.target.value })
                  }
                />
                <button
                  onClick={handleValidateLeet}
                  disabled={validating}
                  className={`px-4 py-2 ${validating ? 'bg-gray-400 text-gray-200' : 'bg-yellow-300 hover:bg-yellow-500 text-black'} border-2 border-black rounded-lg font-bold ${!validating ? 'btn-3d' : 'cursor-not-allowed'}`}
                >
                  {validating ? 'Checking...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {showSuccess && (
            <div className="relative overflow-hidden">
              <div className="bg-orange-500 p-6 border-4 border-black rounded-xl text-center animate-pulse shadow-2xl">
                <div className="space-y-3">
                  <div className="text-4xl animate-bounce">🎉</div>
                  <div className="text-white font-bold text-xl">
                    CODER VERIFIED!
                  </div>
                  <div className="text-black text-sm">
                    Welcome to the competition arena
                  </div>
                  <div className="flex justify-center items-center gap-2 text-black">
                    <span>⚡</span>
                    <span className="font-bold">Initializing dashboard...</span>
                    <span>⚡</span>
                  </div>
                </div>
                {/* Animated background effects */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-4 text-yellow-200 animate-ping">
                    ✨
                  </div>
                  <div className="absolute top-6 right-6 text-yellow-200 animate-ping delay-200">
                    ✨
                  </div>
                  <div className="absolute bottom-4 left-8 text-yellow-200 animate-ping delay-500">
                    ✨
                  </div>
                  <div className="absolute bottom-2 right-4 text-yellow-200 animate-ping delay-700">
                    ✨
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'group' && (
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Join or Create a Group</h2>
            <p className="text-sm text-gray-600">
              Connect with friends and start competing!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                Join Existing Group
              </label>
              <div className="flex gap-2">
                <input
                  className="border-2 border-black rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter invite code"
                  value={groupData.code}
                  onChange={e =>
                    setGroupData({ ...groupData, code: e.target.value })
                  }
                />
                <button
                  onClick={handleJoinGroup}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-black border-2 border-black rounded-lg font-bold btn-3d"
                >
                  Join Group
                </button>
              </div>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-500">or</span>
            </div>

            <div className="text-center">
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black border-2 border-black rounded-lg font-bold btn-3d"
              >
                Create New Group
              </button>
            </div>

            {/* Development skip option */}
            {import.meta.env.DEV && (
              <div className="text-center pt-4 border-t-2 border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Development Mode</p>
                <button
                  onClick={() => window.devHelpers.skipGroup()}
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-black border-2 border-black rounded-lg text-sm font-bold btn-3d"
                >
                  Skip Group Setup
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'leaderboard' && (
        <div className={`flex flex-col gap-6 ${animationClass}`}>
          {/* Header with group info and controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">
                Group:{' '}
                <span
                  className="font-mono bg-yellow-200 px-3 py-1 rounded-lg border-2 border-black cursor-pointer hover:bg-yellow-300 transition-colors relative group"
                  onClick={() => {
                    navigator.clipboard.writeText(groupData.code);
                    setShowCopySuccess(true);
                    setTimeout(() => setShowCopySuccess(false), 2000);
                  }}
                  title="Copy Me!"
                >
                  {groupData.code}
                  {showCopySuccess ? (
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      ✅ Copied!
                    </span>
                  ) : (
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Copy Me!
                    </span>
                  )}
                </span>
              </span>
              <span className="text-sm text-gray-600">
                User: {userData.name} ({userData.leetUsername})
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Refreshes in: {refreshIn}s
              </span>
              <button
                onClick={handleLeaveGroup}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 border-2 border-black rounded-lg font-bold text-white btn-3d"
              >
                Leave Group
              </button>
            </div>
          </div>

          {/* 3-Column Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Main Content - Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Challenge */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg">🎯</span>
                    <h3 className="font-bold text-white text-lg">
                      TODAY'S CHALLENGE
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Two Sum</h3>
                    <span className="bg-black text-white px-3 py-1 rounded text-sm font-bold border-2 border-black">
                      EASY
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                    Given an array of integers nums and an integer target,
                    return indices of the two numbers such that they add up to
                    target.
                  </p>
                  <div className="flex items-center gap-4">
                    <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg border-2 border-black font-bold flex items-center gap-2 btn-3d">
                      <span>💻</span>
                      START CODING
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-orange-500">🔥</span>
                      Current Streak:{' '}
                      <span className="font-bold text-orange-500">7 days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Bounties */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg">⭐</span>
                    <h3 className="font-bold text-white text-lg">
                      ACTIVE BOUNTIES
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-black rounded-lg shadow-lg">
                      <div>
                        <h4 className="font-bold">
                          Complete 3 Medium Problems
                        </h4>
                        <p className="text-sm text-gray-600">
                          Expires in 2 days
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-500">
                          500 XP
                        </div>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                          <div className="w-2/3 h-2 bg-orange-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-black rounded-lg shadow-lg">
                      <div>
                        <h4 className="font-bold">Beat Friend's Time</h4>
                        <p className="text-sm text-gray-600">
                          Beat Sarah's 45ms solution
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-500">
                          300 XP
                        </div>
                        <span className="inline-block bg-blue-500 text-white px-2 py-1 text-xs rounded mt-1 border border-blue-500">
                          NEW
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duels Section */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg">⚔️</span>
                    <h3 className="font-bold text-white text-lg">DUELS</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Challenge Friends */}
                    <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-lg">Challenge Friend</h4>
                        <span className="text-lg">🎯</span>
                      </div>
                      <div className="space-y-3">
                        <select className="w-full p-2 border-2 border-black rounded-lg font-medium">
                          <option>Select a friend...</option>
                          <option>Sarah</option>
                          <option>Alex</option>
                          <option>John</option>
                        </select>
                        <select className="w-full p-2 border-2 border-black rounded-lg font-medium">
                          <option>Problem difficulty...</option>
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                          <option>Random</option>
                        </select>
                      </div>
                      <button className="w-full mt-3 bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold btn-3d">
                        Send Challenge
                      </button>
                    </div>

                    {/* Duel History */}
                    <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-lg">Recent Duels</h4>
                        <span className="text-lg">📊</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 border border-green-300 rounded">
                          <span className="font-medium text-sm">vs Sarah</span>
                          <span className="text-green-600 font-bold text-xs">
                            WON
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 border border-red-300 rounded">
                          <span className="font-medium text-sm">vs Alex</span>
                          <span className="text-red-600 font-bold text-xs">
                            LOST
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 border border-green-300 rounded">
                          <span className="font-medium text-sm">vs John</span>
                          <span className="text-green-600 font-bold text-xs">
                            WON
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* User Stats */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col h-80">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg">📊</span>
                    <h3 className="font-bold text-white text-lg">YOUR STATS</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        1,247
                      </div>
                      <div className="text-sm text-gray-600">Total XP</div>
                    </div>
                    <div className="border-t-2 border-gray-400 my-4"></div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold">23</div>
                        <div className="text-xs text-gray-600">
                          Problems Solved
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold">7</div>
                        <div className="text-xs text-gray-600">Day Streak</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rank Progress</span>
                        <span className="font-bold">Silver III</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="w-3/4 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-600 text-center">
                        247 XP to Gold I
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Friends Leaderboard */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col h-70">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg">🏆</span>
                    <h3 className="font-bold text-white text-lg">
                      FRIENDS LEADERBOARD
                    </h3>
                  </div>
                </div>
                <div className="p-0">
                  {leaderboard.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No competitors yet! Invite friends to join.
                    </div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b-2 border-black">
                          <th className="font-bold text-left px-4 py-2">
                            RANK
                          </th>
                          <th className="font-bold text-left px-4 py-2">
                            PLAYER
                          </th>
                          <th className="font-bold text-left px-4 py-2">XP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard
                          .sort(
                            (a, b) =>
                              b.easy +
                              b.medium +
                              b.hard -
                              (a.easy + a.medium + a.hard)
                          )
                          .map((user, index) => {
                            const isCurrentUser =
                              user.username === userData.leetUsername;
                            const totalXP =
                              user.easy * 50 +
                              user.medium * 100 +
                              user.hard * 200;
                            const bgColor =
                              index === 0
                                ? 'bg-red-100'
                                : index === 1
                                  ? 'bg-blue-100'
                                  : index === 2
                                    ? 'bg-green-100'
                                    : '';

                            return (
                              <tr
                                key={user.username}
                                className={`border-b border-gray-200 ${bgColor}`}
                              >
                                <td className="font-bold px-4 py-3">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold border border-black">
                                      {user.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span
                                      className={
                                        isCurrentUser ? 'font-bold' : ''
                                      }
                                    >
                                      {isCurrentUser ? 'You' : user.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="font-bold px-4 py-3">
                                  {totalXP.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col h-72">
                <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="font-bold text-white text-lg">
                      QUICK ACTIONS
                    </h3>
                  </div>
                </div>
                <div className="p-8 space-y-3">
                  <button className="w-full bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d">
                    <span>👥</span>
                    CHALLENGE FRIEND
                  </button>
                  <button className="w-full bg-yellow-200 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d">
                    <span>🎯</span>
                    RANDOM PROBLEM
                  </button>
                  <button className="w-full bg-green-200 hover:bg-green-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d">
                    <span>🏆</span>
                    VIEW ALL RANKS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        .fade-out {
          animation: fadeOut 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

// Update to use createRoot (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
