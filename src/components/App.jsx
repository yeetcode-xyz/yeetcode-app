import '../index.css';
import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../utils/analytics';
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from '../utils/storage';
import { useDevHelpers } from '../hooks/useDevHelpers';
import WelcomeStep from './WelcomeStep';
import EmailStep from './EmailStep';
import VerificationStep from './VerificationStep';
import OnboardingStep from './OnboardingStep';
import GroupStep from './GroupStep';
import LeaderboardStep from './LeaderboardStep';

function App() {
  const analytics = useAnalytics();

  // Core state
  const [step, setStep] = useState('welcome');
  const [userData, setUserData] = useState({
    email: '',
    verified: false,
    name: '',
    leetUsername: '',
  });
  const [groupData, setGroupData] = useState({ code: '', joined: false });
  const [leaderboard, setLeaderboard] = useState([]);

  // Daily problem global state
  const [dailyData, setDailyData] = useState({
    dailyComplete: false,
    streak: 0,
    todaysProblem: null,
    error: null,
    loading: true,
  });

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
      // Handle existing users (update them with email fields if missing)
      const updatedUserData = {
        email: savedUserData.email || '',
        verified:
          savedUserData.verified || (savedUserData.leetUsername ? true : false), // Existing users are considered verified
        name: savedUserData.name || '',
        leetUsername: savedUserData.leetUsername || '',
      };
      setUserData(updatedUserData);
      console.log('Loaded saved user data:', updatedUserData);

      // If it's an existing user with no email but has leetUsername, they can skip email verification
      if (savedUserData.leetUsername && !savedUserData.email) {
        console.log('Existing user without email - will update on next login');
      }
    }

    if (savedAppState) {
      setStep(savedAppState.step || 'welcome');
      setGroupData(savedAppState.groupData || { code: '', joined: false });
      console.log('Loaded saved app state:', savedAppState);
    }
  }, []);

  // Track app initialization
  useEffect(() => {
    analytics.trackFeatureUsed('app_opened', {
      step: step,
      has_saved_data: !!loadFromStorage(STORAGE_KEYS.USER_DATA),
    });
  }, [analytics]);

  // Track step changes
  useEffect(() => {
    analytics.trackFeatureUsed('step_viewed', {
      step: step,
      user_name: userData.name || 'anonymous',
      has_group: groupData.joined,
    });
  }, [step, analytics, userData.name, groupData.joined]);

  // Identify user when userData changes
  useEffect(() => {
    if (userData.name && userData.leetUsername) {
      // Note: User identification is handled by PostHog directly since it's a specific PostHog feature
      // We'll keep this one direct PostHog call for user identification
      const posthog = window.posthog;
      if (posthog) {
        posthog.identify(userData.leetUsername, {
          name: userData.name,
          leetcode_username: userData.leetUsername,
          app_version: '1.0.0',
        });
      }
    }
  }, [userData]);

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

  // Track app state for smart notifications
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.updateAppState(step, userData, dailyData);
    }
  }, [step, userData, dailyData]);

  // Clear app state when component unmounts
  useEffect(() => {
    return () => {
      if (window.electronAPI) {
        window.electronAPI.clearAppState();
      }
    };
  }, []);

  // Handle leaderboard and daily problem refresh
  useEffect(() => {
    if (step !== 'leaderboard' || !groupData.joined || !groupData.code) {
      return;
    }

    // First load right away, and reset the counter
    fetchLeaderboard();
    fetchDailyProblem();
    setRefreshIn(60);

    // Then tick every second: when it hits 1, fetch again & reset
    const countdown = setInterval(() => {
      setRefreshIn(r => {
        if (r <= 1) {
          fetchLeaderboard();
          fetchDailyProblem();
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
      const normalized = items.map(item => {
        return {
          username: item.username,
          name: item.name, // Now using the proper display name from backend
          easy: item.easy ?? 0,
          medium: item.medium ?? 0,
          hard: item.hard ?? 0,
          today: item.today ?? 0,
          xp: item.xp ?? 0, // Include XP from daily challenges
        };
      });
      console.log('🔍 [FRONTEND] Normalized leaderboard:', normalized);

      // 3) Sort by total problems solved (descending)
      normalized.sort((a, b) => {
        const totalA = a.easy + a.medium + a.hard;
        const totalB = b.easy + b.medium + b.hard;
        return totalB - totalA;
      });

      // Track leaderboard view
      const userRank =
        normalized.findIndex(user => user.username === userData.leetUsername) +
        1;
      analytics.trackLeaderboardView(normalized.length, userRank || 0);

      setLeaderboard(normalized);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchDailyProblem = async () => {
    if (!userData?.leetUsername || !window.electronAPI) {
      console.log('No username or electronAPI available for daily problem');
      setDailyData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const result = await window.electronAPI.getDailyProblem(
        userData.leetUsername
      );
      setDailyData({ ...result, loading: false });
    } catch (error) {
      console.error('Error fetching daily problem:', error);
      setDailyData({
        dailyComplete: false,
        streak: 0,
        todaysProblem: null,
        error: error.message,
        loading: false,
      });
    }
  };

  const handleDailyComplete = async result => {
    console.log('Daily challenge completed:', result);

    // Track daily problem completion
    if (dailyData.todaysProblem) {
      analytics.trackDailyProblemComplete(
        dailyData.todaysProblem.title,
        0, // time spent - we don't track this currently
        dailyData.streak + 1 // assuming streak increases by 1
      );
    }

    // Refresh both daily data and leaderboard
    await Promise.all([fetchDailyProblem(), fetchLeaderboard()]);
  };

  const handleStartOnboarding = () => {
    navigateToStep('email');
  };

  // Magic link authentication handlers
  const handleEmailSent = email => {
    setUserData(prev => ({ ...prev, email: email.toLowerCase() }));
    navigateToStep('verification');
  };

  const handleVerificationSuccess = result => {
    setUserData(prev => ({
      ...prev,
      email: result.email.toLowerCase(),
      verified: true,
    }));
    navigateToStep('onboarding');
  };

  const handleResendCode = async () => {
    if (!userData.email) {
      throw new Error('No email address found');
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.sendMagicLink(userData.email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend code');
      }
    }
  };

  const handleBackToEmail = () => {
    setUserData(prev => ({ ...prev, verified: false }));
    navigateToStep('email');
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

      // 3) On success, show indicator and update display name
      setShowSuccess(true);

      // Update display name and email in database
      if (window.electronAPI) {
        try {
          const displayNameResult = await window.electronAPI.updateDisplayName(
            userData.leetUsername,
            userData.name
          );
          console.log('Display name update result:', displayNameResult);

          // Update user email in database
          if (userData.email && userData.verified) {
            const emailUpdateResult = await window.electronAPI.updateUserEmail(
              userData.leetUsername,
              userData.email
            );
            console.log('Email update result:', emailUpdateResult);

            if (!emailUpdateResult.success) {
              console.warn('Email update failed:', emailUpdateResult.error);
            }
          }

          // Also ensure the display name is set when we get user data
          if (!displayNameResult.success) {
            console.warn(
              'Display name update failed:',
              displayNameResult.error
            );
          }
        } catch (displayNameError) {
          console.error('Error updating user data:', displayNameError);
          // Don't fail the whole process if update fails
        }
      }

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
        // Update display name first
        await window.electronAPI.updateDisplayName(
          userData.leetUsername,
          userData.name
        );

        // Then join group
        await window.electronAPI.joinGroup(
          userData.leetUsername,
          groupData.code,
          userData.name
        );
      } else {
        // Mock join for development
        console.log('Mock joining group:', groupData.code);
      }

      // Track successful group join
      analytics.trackGroupJoin(groupData.code, true);

      const newGroupData = { ...groupData, joined: true };
      setGroupData(newGroupData);
      navigateToStep('leaderboard');
    } catch (err) {
      console.error('Error joining group:', err);

      // Track failed group join
      analytics.trackGroupJoin(groupData.code, false);

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
        // Update display name first
        await window.electronAPI.updateDisplayName(
          userData.leetUsername,
          userData.name
        );

        // Then create group
        const result = await window.electronAPI.createGroup(
          userData.leetUsername,
          userData.name
        );
        groupId = result.groupId;
      } else {
        console.log('Mock creating group:', groupId);
      }

      // Track group creation (treat as successful group join)
      analytics.trackGroupJoin(groupId, true);
      analytics.trackFeatureUsed('group_created', { group_code: groupId });

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
    setError,
    userData,
    setUserData,
    email: userData.email, // Add email as separate prop for VerificationStep
    groupData,
    setGroupData,
    leaderboard,
    dailyData,
    validating,
    setValidating,
    showSuccess,
    refreshIn,
    showCopySuccess,
    setShowCopySuccess,
    handleStartOnboarding,
    handleEmailSent,
    handleVerificationSuccess,
    handleResendCode,
    handleBackToEmail,
    handleValidateLeet,
    handleJoinGroup,
    handleCreateGroup,
    handleLeaveGroup,
    handleDailyComplete,
    navigateToStep,
  };

  // Function to get the appropriate flame icon based on state
  const getFlameIcon = () => {
    if (dailyData.dailyComplete) {
      return '🔥'; // Full red flame when completed today
    } else if (dailyData.streak > 0) {
      return '🔥'; // Empty/gray flame when streak exists but not done today (we'll style it)
    } else {
      return '💨'; // No flame/smoke when no streak
    }
  };

  const getFlameStyle = () => {
    if (dailyData.dailyComplete) {
      return 'text-red-500'; // Red flame when completed
    } else if (dailyData.streak > 0) {
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
                dailyData.dailyComplete
                  ? `${dailyData.streak} day streak - Completed today!`
                  : dailyData.streak > 0
                    ? `${dailyData.streak} day streak - Complete today's challenge!`
                    : 'Start your streak!'
              }
            >
              {getFlameIcon()}
            </span>
            <span className="text-sm font-bold text-gray-600">
              {dailyData.streak}
            </span>
          </div>
        )}
      </div>

      {step === 'welcome' && <WelcomeStep {...stepProps} />}
      {step === 'email' && <EmailStep {...stepProps} />}
      {step === 'verification' && <VerificationStep {...stepProps} />}
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
