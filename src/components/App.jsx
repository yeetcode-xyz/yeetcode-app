import '../index.css';
import React, { useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from '../utils/storage';
import { useDevHelpers } from '../hooks/useDevHelpers';
import WelcomeStep from './WelcomeStep';
import EmailStep from './EmailStep';
import VerificationStep from './VerificationStep';
import OnboardingStep from './OnboardingStep';
import GroupStep from './GroupStep';
import LeaderboardStep from './LeaderboardStep';

const APP_VERSION = '0.1.2';
function App() {
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
  const [universityLeaderboard, setUniversityLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Fix: Declare previousLeaderboardRef here
  const previousLeaderboardRef = useRef([]);
  const leaderboardStepRef = useRef();

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
    }

    if (savedAppState) {
      setStep(savedAppState.step || 'welcome');
      setGroupData(savedAppState.groupData || { code: '', joined: false });
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

  // Track app state for smart notifications - prevent double calls
  const prevAppState = useRef({ step: null, userData: null, dailyData: null });

  useEffect(() => {
    if (window.electronAPI) {
      // Only update if there's an actual change to prevent double calls
      const currentState = { step, userData, dailyData };
      const prevState = prevAppState.current;

      const hasChanged =
        prevState.step !== step ||
        prevState.userData?.leetUsername !== userData?.leetUsername ||
        prevState.dailyData?.dailyComplete !== dailyData?.dailyComplete ||
        prevState.dailyData?.todaysProblem?.title !==
          dailyData?.todaysProblem?.title;

      if (hasChanged) {
        window.electronAPI.updateAppState(step, userData, dailyData);
        prevAppState.current = currentState;
      }
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

  // Fetch university leaderboard when on leaderboard step
  useEffect(() => {
    if (step === 'leaderboard') {
      fetchUniversityLeaderboard();

      // Set up refresh interval for university leaderboard
      const interval = setInterval(() => {
        fetchUniversityLeaderboard();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [step]);

  // Smart refresh system based on app focus
  useEffect(() => {
    if (step !== 'leaderboard' || !groupData.joined || !groupData.code) {
      return;
    }

    let lastRefreshTime = 0;
    let currentInterval = null;
    let isAppFocused = true;

    // Get initial refresh interval based on focus
    const getRefreshInterval = () => {
      return isAppFocused ? 60 : 600; // 1 min focused, 10 min unfocused
    };

    // Function to refresh data with minimum delay check
    const refreshData = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      const minimumDelay = 60 * 1000; // 1 minute minimum

      if (timeSinceLastRefresh >= minimumDelay) {
        fetchLeaderboard();
        fetchUniversityLeaderboard();
        fetchDailyProblem();
        // Refresh duels as part of the auto-refresh system
        if (leaderboardStepRef.current) {
          leaderboardStepRef.current.refreshDuels();
        }
        lastRefreshTime = now;
      }
    };

    // Function to start/restart the refresh timer
    const startRefreshTimer = () => {
      if (currentInterval) {
        clearInterval(currentInterval);
      }

      const interval = getRefreshInterval();
      setRefreshIn(interval);

      currentInterval = setInterval(() => {
        setRefreshIn(r => {
          if (r <= 1) {
            refreshData();
            return getRefreshInterval();
          }
          return r - 1;
        });
      }, 1000);
    };

    // Handle focus/blur events
    const handleFocus = () => {
      isAppFocused = true;
      refreshData(); // Refresh immediately when app gains focus
      startRefreshTimer(); // Restart with focused interval
    };

    const handleBlur = () => {
      isAppFocused = false;
      startRefreshTimer(); // Restart with unfocused interval
    };

    // Set up focus/blur listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Initial load and start timer
    refreshData();
    lastRefreshTime = Date.now();
    startRefreshTimer();

    return () => {
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [step, groupData.joined, groupData.code]);

  // Add useEffect to detect leaderboard changes and trigger notifications
  useEffect(() => {
    if (previousLeaderboardRef.current.length) {
      detectLeaderboardChanges(leaderboard, previousLeaderboardRef.current);
    }
    previousLeaderboardRef.current = leaderboard;
  }, [leaderboard]);

  // Helper functions
  const saveAppState = (currentStep, currentGroupData) => {
    saveToStorage(STORAGE_KEYS.APP_STATE, {
      step: currentStep,
      groupData: currentGroupData,
    });
  };

  // Notification management
  const addNotification = (type, message) => {
    const id = Date.now() + Math.random();
    const notification = { id, type, message };

    setNotifications(prev => [notification, ...prev.slice(0, 2)]); // Keep only 3 notifications

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Detect leaderboard changes and generate notifications
  const detectLeaderboardChanges = (newLeaderboard, oldLeaderboard) => {
    if (!oldLeaderboard.length) return; // Skip first load

    // Calculate XP for sorting - ensure all values are numbers
    const calculateXP = user => {
      const easy = Number(user.easy) || 0;
      const medium = Number(user.medium) || 0;
      const hard = Number(user.hard) || 0;
      const bonusXP = Number(user.xp) || 0;

      const baseXP = easy * 100 + medium * 300 + hard * 500;
      return baseXP + bonusXP;
    };

    // Sort both leaderboards by XP
    const newSorted = [...newLeaderboard].sort(
      (a, b) => calculateXP(b) - calculateXP(a)
    );
    const oldSorted = [...oldLeaderboard].sort(
      (a, b) => calculateXP(b) - calculateXP(a)
    );

    // Create maps for quick lookup
    const newUserMap = new Map(
      newSorted.map((user, index) => [
        user.username,
        { ...user, rank: index + 1 },
      ])
    );
    const oldUserMap = new Map(
      oldSorted.map((user, index) => [
        user.username,
        { ...user, rank: index + 1 },
      ])
    );

    // Check for new users (joined)
    for (const [username, user] of newUserMap) {
      if (!oldUserMap.has(username)) {
        addNotification('joined', `${user.name} joined the competition! 🎯`);
      }
    }

    // Check for users who left
    for (const [username, user] of oldUserMap) {
      if (!newUserMap.has(username)) {
        addNotification('left', `${user.name} left the group 👋`);
      }
    }

    // Check for rank changes (overtakes)
    for (const [username, newUser] of newUserMap) {
      const oldUser = oldUserMap.get(username);
      if (oldUser && oldUser.rank > newUser.rank) {
        // User moved up in rank
        const rankDiff = oldUser.rank - newUser.rank;
        if (rankDiff === 1) {
          addNotification(
            'overtake',
            `${newUser.name} overtook rank #${newUser.rank}! 🔥`
          );
        } else {
          addNotification(
            'overtake',
            `${newUser.name} jumped ${rankDiff} ranks to #${newUser.rank}! ⚡`
          );
        }
      }
    }
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
      // 2) Normalize + compute totals - ensure all values are numbers
      const normalized = items.map(item => {
        return {
          username: item.username,
          name: item.name, // Now using the proper display name from backend
          easy: Number(item.easy) || 0,
          medium: Number(item.medium) || 0,
          hard: Number(item.hard) || 0,
          today: Number(item.today) || 0,
          xp: Number(item.xp) || 0, // Include XP from daily challenges - ensure it's a number
        };
      });

      // 3) Sort by total problems solved (descending)
      normalized.sort((a, b) => {
        const totalA = a.easy + a.medium + a.hard;
        const totalB = b.easy + b.medium + b.hard;
        return totalB - totalA;
      });

      // Calculate user rank
      const userRank =
        normalized.findIndex(user => user.username === userData.leetUsername) +
        1;

      setLeaderboard(normalized);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchUniversityLeaderboard = async () => {
    if (!window.electronAPI) return;
    try {
      const universityData =
        await window.electronAPI.getUniversityLeaderboard();
      setUniversityLeaderboard(universityData);
    } catch (error) {
      console.error('Error fetching university leaderboard:', error);
    }
  };

  const fetchDailyProblem = async () => {
    if (!userData?.leetUsername || !window.electronAPI) {
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
    // Refresh both daily data and leaderboard
    await Promise.all([
      fetchDailyProblem(),
      fetchLeaderboard(),
      fetchUniversityLeaderboard(),
    ]);
  };

  const handleStartOnboarding = () => {
    navigateToStep('email');
  };

  // Magic link authentication handlers
  const handleEmailSent = email => {
    setUserData(prev => ({ ...prev, email: email.toLowerCase() }));
    navigateToStep('verification');
  };

  const handleVerificationSuccess = async result => {
    setUserData(prev => ({
      ...prev,
      email: result.email.toLowerCase(),
      verified: true,
    }));

    // Check if user already exists and has complete profile
    try {
      if (window.electronAPI) {
        // Get user data by email to see if they already exist
        const userByEmail = await window.electronAPI.getUserByEmail(
          result.email.toLowerCase()
        );
        console.log('getUserByEmail result:', userByEmail);
        console.log('User data details:', {
          username: userByEmail?.data?.username,
          email: userByEmail?.data?.email,
          group_id: userByEmail?.data?.group_id,
          display_name: userByEmail?.data?.display_name,
          hasCompletedOnboarding:
            userByEmail?.data?.username !== userByEmail?.data?.email,
        });

        if (userByEmail && userByEmail.data) {
          console.log('Existing user found:', userByEmail.data);

          // Check if user has completed onboarding (username !== email)
          if (userByEmail.data.username !== userByEmail.data.email) {
            // User has completed onboarding
            if (userByEmail.data.group_id) {
              // User has joined a group - go to leaderboard
              console.log(
                'Existing user with complete profile found:',
                userByEmail.data
              );

              // Update userData with existing info
              setUserData(prev => ({
                ...prev,
                leetUsername: userByEmail.data.username, // username is the LeetCode username after onboarding
                name:
                  userByEmail.data.display_name || userByEmail.data.name || '',
              }));

              // Set group data
              setGroupData({ code: userByEmail.data.group_id, joined: true });

              // Show success message for existing user
              setShowSuccess(true);

              // Navigate directly to leaderboard after showing success
              setTimeout(() => {
                setShowSuccess(false);
                navigateToStep('leaderboard');
              }, 2000);
              return;
            } else {
              // User has completed onboarding but hasn't joined a group - go to group selection
              console.log(
                'Existing user without group found:',
                userByEmail.data
              );

              // Update userData with existing info
              setUserData(prev => ({
                ...prev,
                leetUsername: userByEmail.data.username,
                name:
                  userByEmail.data.display_name || userByEmail.data.name || '',
              }));

              // Navigate to group selection
              navigateToStep('group');
              return;
            }
          } else {
            // User exists but hasn't completed onboarding - go to onboarding
            console.log(
              'Existing user without onboarding found:',
              userByEmail.data
            );
            // Continue to onboarding
          }
        } else {
          // No existing user found - this is a new user
          console.log(
            'No existing user found - new user will go through onboarding'
          );
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
      // Continue with normal flow if there's an error
    }

    // Normal flow - go to onboarding
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
      // 1) Validate username via API
      if (!window.electronAPI) {
        setError('Electron API not available');
        return;
      }

      const result = await window.electronAPI.validateLeetCodeUsername(
        userData.leetUsername
      );

      if (!result.exists) {
        // Validation failed
        setError(
          result.error
            ? `Username validation failed: ${result.error}`
            : 'Username validation failed. Please try again.'
        );
        return;
      }

      // 2) Check if username is already taken by another user
      const existingUser = await window.electronAPI.getUserData(
        userData.leetUsername
      );

      if (existingUser && existingUser.email) {
        // Username exists in our database
        if (existingUser.email.toLowerCase() !== userData.email.toLowerCase()) {
          // Username is taken by someone with a different email
          setError(
            'This LeetCode username is already associated with another account. Please use your own LeetCode username.'
          );
          return;
        }
        // If emails match, user is reclaiming their account - this is allowed
      }

      // 3) On success, show indicator and update display name
      setShowSuccess(true);

      // Create new user record with LeetCode username and email
      if (window.electronAPI) {
        try {
          // Create new user record with LeetCode username
          const createUserResult =
            await window.electronAPI.createUserWithUsername(
              userData.leetUsername,
              userData.email,
              userData.name,
              userData.university
            );

          if (!createUserResult.success) {
            console.warn('User creation failed:', createUserResult.error);
          } else {
            console.log(
              'Created new user record with LeetCode username:',
              userData.leetUsername
            );
          }
        } catch (createUserError) {
          console.error('Error creating user record:', createUserError);
          // Don't fail the whole process if creation fails
        }
      }

      // Fetch saved user data now
      const userRecord = await window.electronAPI.getUserData(
        userData.leetUsername
      );

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
      }

      // Group join successful

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

  // Logout handler
  const handleLogout = () => {
    setUserData({ email: '', verified: false, name: '', leetUsername: '' });
    setGroupData({ code: '', joined: false });
    setLeaderboard([]);
    setStep('welcome');
    setDailyData({
      dailyComplete: false,
      streak: 0,
      todaysProblem: null,
      error: null,
      loading: true,
    });
    localStorage.clear();
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
    universityLeaderboard,
    dailyData,
    validating,
    setValidating,
    showSuccess,
    refreshIn,
    showCopySuccess,
    setShowCopySuccess,
    notifications, // Add notifications for LeaderboardHeader
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
      className={`w-full ${step === 'leaderboard' || step === 'welcome' ? 'max-w-7xl' : 'max-w-md'} mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black ${step === 'leaderboard' ? 'min-h-[700px]' : 'min-h-[400px]'} flex flex-col gap-6`}
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <div className="flex justify-between items-center border-b-4 border-black pb-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          YeetCode
        </h1>
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
      {step === 'leaderboard' && (
        <LeaderboardStep
          ref={leaderboardStepRef}
          {...stepProps}
          quickActionsProps={{ handleLogout }}
        />
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

export default App;
