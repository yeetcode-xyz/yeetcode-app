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
          if (import.meta.env.DEV) {
            console.log(`🎯 Set test user: ${name} (${leetUser})`);
          }
        },

        setTestGroup: (code = 'TEST123') => {
          const newGroupData = { code, joined: true };
          setGroupData(newGroupData);
          saveAppState('leaderboard', newGroupData);
          if (import.meta.env.DEV) {
            console.log(`🎯 Set test group: ${code}`);
          }
        },

        // Skip group functionality (for AWS issues)
        skipGroup: () => {
          const newGroupData = { code: 'DEV-SKIP', joined: true };
          setGroupData(newGroupData);
          navigateToStep('leaderboard');
          if (import.meta.env.DEV) {
            console.log('🎯 Skipped group setup - going to leaderboard');
          }
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

        // XP Breakdown for debugging
        breakdownXP: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            if (import.meta.env.DEV) {
              console.log(
                '❌ No username provided. Usage: devHelpers.breakdownXP("username") or ensure you\'re logged in'
              );
            }
            return;
          }

          try {
            // Get user data from database
            const userDbData = await window.electronAPI?.getUserData(user);
            if (!userDbData || Object.keys(userDbData).length === 0) {
              if (import.meta.env.DEV) {
                console.log(`❌ No data found for user: ${user}`);
              }
              return;
            }

            // Calculate XP breakdown
            const easy = userDbData.easy || 0;
            const medium = userDbData.medium || 0;
            const hard = userDbData.hard || 0;
            const dailyXP = userDbData.xp || 0;

            const easyXP = easy * 100;
            const mediumXP = medium * 300;
            const hardXP = hard * 500;
            const totalProblemXP = easyXP + mediumXP + hardXP;
            const totalXP = totalProblemXP + dailyXP;

            // Calculate estimated daily challenges completed
            const estimatedDailyChallenges = Math.floor(dailyXP / 200);

            if (import.meta.env.DEV) {
              console.log(`\n🏆 XP BREAKDOWN for ${user}`);
              console.log('================================');
              console.log(`📈 Total XP: ${totalXP.toLocaleString()}`);
              console.log('\n📊 Problem XP:');
              console.log(
                `  🟢 Easy (${easy} × 100):     ${easyXP.toLocaleString()} XP`
              );
              console.log(
                `  🟡 Medium (${medium} × 300):   ${mediumXP.toLocaleString()} XP`
              );
              console.log(
                `  🔴 Hard (${hard} × 500):     ${hardXP.toLocaleString()} XP`
              );
              console.log(
                `  📊 Problem Subtotal:      ${totalProblemXP.toLocaleString()} XP\n`
              );
              console.log(
                `🎯 Daily Challenge XP:      ${dailyXP.toLocaleString()} XP`
              );
              console.log(
                `   (≈ ${estimatedDailyChallenges} daily challenges completed)\n`
              );

              // Show percentage breakdown
              console.log('📊 XP Sources:');
              if (totalXP > 0) {
                const problemPercent = (
                  (totalProblemXP / totalXP) *
                  100
                ).toFixed(1);
                const dailyPercent = ((dailyXP / totalXP) * 100).toFixed(1);
                console.log(`  📊 Problems: ${problemPercent}%`);
                console.log(`  🎯 Daily Challenges: ${dailyPercent}%`);
              }

              // Show additional user data
              console.log(`\n📊 Additional Data:`);
              console.log(
                `  Group ID: ${userDbData.group_id || 'Not in a group'}`
              );
              console.log(`  Today Problems: ${userDbData.today || 0}`);
            }

            return {
              username: user,
              totalXP,
              breakdown: {
                easy: { count: easy, xp: easyXP },
                medium: { count: medium, xp: mediumXP },
                hard: { count: hard, xp: hardXP },
                dailyBonus: dailyXP,
                estimatedDailyChallenges,
              },
            };
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('❌ Error getting XP breakdown:', error);
            }
          }
        },

        // Refresh XP for current user
        refreshXP: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            if (import.meta.env.DEV) {
              console.log(
                '❌ No username provided. Usage: devHelpers.refreshXP("username") or ensure you\'re logged in'
              );
            }
            return;
          }

          try {
            if (import.meta.env.DEV) {
              console.log('🔄 Refreshing XP for user:', user);
            }

            const result = await window.electronAPI?.refreshUserXP(user);
            if (import.meta.env.DEV) {
              console.log('✅ XP refresh completed:', result);
            }

            return result;
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('❌ Error refreshing XP:', error);
            }
          }
        },

        // Test automatic submission detection with real LeetCode API
        testSubmissionDetection: async () => {
          if (!userData?.leetUsername) {
            if (import.meta.env.DEV) {
              console.log('❌ Please log in first');
            }
            return;
          }

          try {
            if (import.meta.env.DEV) {
              console.log('🧪 TESTING REAL LEETCODE SUBMISSION DETECTION');
              console.log('==============================================');
              console.log('Username:', userData.leetUsername);
            }

            const submissions =
              await window.electronAPI?.fetchLeetCodeSubmissions(
                userData.leetUsername,
                10
              );

            if (import.meta.env.DEV) {
              console.log(
                '📥 Recent submissions from LeetCode API:',
                submissions?.length || 0
              );
              if (submissions?.length > 0) {
                console.log('Recent accepted submissions:');
                submissions.forEach((sub, i) => {
                  console.log(
                    `  ${i + 1}. ${sub.titleSlug} - ${sub.statusDisplay} - ${sub.timestamp}`
                  );
                });
              } else {
                console.log('No recent submissions found');
              }
            }

            if (import.meta.env.DEV) {
              console.log('');
              console.log('💡 The automatic detection system:');
              console.log('• Polls every 10 seconds when a duel is started');
              console.log(
                '• Uses real LeetCode GraphQL API to get recent accepted submissions'
              );
              console.log(
                '• Automatically detects when you solve the duel problem'
              );
              console.log(
                '• For manual testing, use devHelpers.simulateDuelWin()'
              );
            }

            return submissions;
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('❌ Error testing submission detection:', error);
            }
          }
        },

        // Utilities - now captures current state
        state: () => ({
          step,
          userData,
          groupData,
          error,
          validating,
          refreshIn,
          showSuccess,
          animationClass,
        }),

        // Clear all data
        clearStorage: () => {
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          localStorage.removeItem(STORAGE_KEYS.APP_STATE);
          setUserData({ name: '', leetUsername: '' });
          setGroupData({ code: '', joined: false });
          setStep('welcome');
          if (import.meta.env.DEV) {
            console.log('🎯 Cleared all saved data');
          }
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
🛠 Dev Helpers Available:
• devHelpers.setTestUser(name?, leetUser?) - Set test user data
• devHelpers.setTestGroup(code?) - Set test group
• devHelpers.skipGroup() - Skip group setup for AWS issues
• devHelpers.testOnboarding() - Quick onboarding test
• devHelpers.testLeaderboard() - Quick leaderboard test
• devHelpers.breakdownXP(username?) - Show detailed XP breakdown
• devHelpers.refreshXP() - Refresh XP for current user
• devHelpers.testSubmissionDetection() - Test real LeetCode submission detection 🆕
• devHelpers.state() - Show current app state
• devHelpers.clearStorage() - Clear all stored data
• devHelpers.goToWelcome/Onboarding/Group/Leaderboard() - Navigate
        `);
    }
  }, []);
};
