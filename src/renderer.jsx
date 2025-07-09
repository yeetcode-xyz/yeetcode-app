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

      // 3) Sort by total problems solved (descending)
      normalized.sort((a, b) => {
        const totalA = a.easy + a.medium + a.hard;
        const totalB = b.easy + b.medium + b.hard;
        return totalB - totalA;
      });

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
      className="w-full max-w-md mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black min-h-[400px] flex flex-col gap-6"
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
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 border-2 border-black rounded-lg font-bold text-white shadow-lg transform hover:scale-105 transition-all duration-200"
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
                className="px-4 py-2 bg-yellow-300 hover:bg-yellow-400 border-2 border-black rounded-lg font-bold transition-all duration-200 hover:scale-105"
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
            <p className="text-sm text-gray-600">
              Enter your details to join the competition
            </p>
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
                  className={`px-4 py-2 ${validating ? 'bg-gray-300' : 'bg-green-300 hover:bg-green-400'} border-2 border-black rounded-lg font-bold transition-all duration-200 ${!validating ? 'hover:scale-105' : ''}`}
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
            <div className="text-green-600 font-bold p-3 bg-green-50 border-2 border-green-200 rounded-lg animate-bounce text-center">
              ✅ Username validated successfully! Redirecting...
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
                  className="px-4 py-2 bg-blue-300 border-2 border-black rounded-lg font-bold hover:bg-blue-400 transition-all duration-200 hover:scale-105"
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
                className="px-4 py-2 bg-pink-300 border-2 border-black rounded-lg font-bold hover:bg-pink-400 transition-all duration-200 hover:scale-105"
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
                  className="px-3 py-1 bg-gray-300 border-2 border-black rounded-lg text-sm font-bold hover:bg-gray-400 transition-all duration-200"
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
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          {/* Members list */}
          <div className="text-sm text-gray-700 italic mb-2">
            <strong>Members:</strong>{' '}
            {leaderboard.map(u => u.name).join(', ') || '— none yet —'}
          </div>

          {/* Group info & refresh */}
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold">
              Group:{' '}
              <span className="font-mono bg-yellow-100 px-2 py-1 rounded">
                {groupData.code}
              </span>
            </span>
            <span>Refreshes in: {refreshIn}s</span>
          </div>

          {/* User info, edit & leave */}
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold">
              User: {userData.name} ({userData.leetUsername})
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveGroup}
                className="px-3 py-1 bg-red-300 border-2 border-black rounded-lg text-xs hover:bg-red-400 transition-all duration-200 hover:scale-105"
              >
                Leave Group
              </button>
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-2 border-black rounded-lg">
              <thead>
                <tr className="bg-yellow-200 border-b-2 border-black">
                  <th className="px-2 py-1 border-r-2 border-black">#</th>
                  <th className="px-2 py-1 border-r-2 border-black">Name</th>
                  <th className="px-2 py-1 border-r-2 border-black">Easy</th>
                  <th className="px-2 py-1 border-r-2 border-black">Med</th>
                  <th className="px-2 py-1 border-r-2 border-black">Hard</th>
                  <th className="px-2 py-1 border-r-2 border-black">Today</th>
                  <th className="px-2 py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => (
                  <tr
                    key={u.username}
                    className={`${
                      u.username === userData.leetUsername
                        ? 'bg-pink-200 font-bold'
                        : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-2 py-1 border-r-2 border-black text-center">
                      {i + 1}
                    </td>
                    <td className="px-2 py-1 border-r-2 border-black">
                      {u.name}
                    </td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">
                      {u.easy}
                    </td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">
                      {u.medium}
                    </td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">
                      {u.hard}
                    </td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">
                      {u.today}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {u.easy + u.medium + u.hard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
