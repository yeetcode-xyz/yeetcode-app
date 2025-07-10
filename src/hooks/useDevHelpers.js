import { useEffect } from 'react';
import { STORAGE_KEYS, saveToStorage } from '../utils/storage';

export const useDevHelpers = ({
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
}) => {
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
    setUserData,
    setGroupData,
    setStep,
    setError,
    navigateToStep,
    saveAppState,
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
};
