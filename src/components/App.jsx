import '../index.css';
import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from '../utils/storage';
import { useDevHelpers } from '../hooks/useDevHelpers';
import WelcomeStep from './WelcomeStep';
import OnboardingStep from './OnboardingStep';
import GroupStep from './GroupStep';
import LeaderboardStep from './LeaderboardStep';

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

  // Development helpers
  useDevHelpers({
    step,
    userData,
    groupData,
    error,
    validating,
    refreshIn,
    showSuccess,
    animationClass,
    setUserData,
    setGroupData,
    setStep,
    setError,
    navigateToStep,
    saveAppState,
  });

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

  const stepProps = {
    animationClass,
    error,
    userData,
    setUserData,
    groupData,
    setGroupData,
    leaderboard,
    validating,
    showSuccess,
    refreshIn,
    showCopySuccess,
    setShowCopySuccess,
    handleStartOnboarding,
    handleValidateLeet,
    handleJoinGroup,
    handleCreateGroup,
    handleLeaveGroup,
    navigateToStep,
  };

  // Mock streak data - in real app this would come from props/API
  const currentStreak = 7;
  const completedToday = false; // This would determine flame state

  // Function to get the appropriate flame icon based on state
  const getFlameIcon = () => {
    if (completedToday) {
      return '🔥'; // Full red flame when completed today
    } else if (currentStreak > 0) {
      return '🔥'; // Empty/gray flame when streak exists but not done today (we'll style it)
    } else {
      return '💨'; // No flame/smoke when no streak
    }
  };

  const getFlameStyle = () => {
    if (completedToday) {
      return 'text-red-500'; // Red flame when completed
    } else if (currentStreak > 0) {
      return 'text-gray-400'; // Gray flame when not done today
    } else {
      return 'text-gray-300'; // Very light when no streak
    }
  };

  // UI
  return (
    <div
      className={`w-full ${step === 'leaderboard' ? 'max-w-7xl' : 'max-w-md'} mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black ${step === 'leaderboard' ? 'min-h-[700px]' : 'min-h-[400px]'} flex flex-col gap-6`}
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <div className="flex justify-between items-center border-b-4 border-black pb-2">
        <h1 className="text-2xl font-bold">YeetCode</h1>
        {step === 'leaderboard' && (
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl cursor-pointer transition-all duration-200 hover:scale-110 ${getFlameStyle()}`}
              title={
                completedToday
                  ? `${currentStreak} day streak - Completed today!`
                  : currentStreak > 0
                    ? `${currentStreak} day streak - Complete today's challenge!`
                    : 'Start your streak!'
              }
            >
              {getFlameIcon()}
            </span>
            <span className="text-sm font-bold text-gray-600">
              {currentStreak}
            </span>
          </div>
        )}
      </div>

      {step === 'welcome' && <WelcomeStep {...stepProps} />}
      {step === 'onboarding' && <OnboardingStep {...stepProps} />}
      {step === 'group' && <GroupStep {...stepProps} />}
      {step === 'leaderboard' && <LeaderboardStep {...stepProps} />}

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

export default App;
