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

        // XP Breakdown for debugging
        breakdownXP: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            console.log(
              '❌ No username provided. Usage: devHelpers.breakdownXP("username") or ensure you\'re logged in'
            );
            return;
          }

          try {
            // Get user data from database
            const userDbData = await window.electronAPI?.getUserData(user);
            if (!userDbData || Object.keys(userDbData).length === 0) {
              console.log(`❌ No data found for user: ${user}`);
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
              const problemPercent = ((totalProblemXP / totalXP) * 100).toFixed(
                1
              );
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
            console.error('❌ Error getting XP breakdown:', error);
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

        // Test notification system
        testNotification: async () => {
          if (window.electronAPI) {
            console.log('🔔 Testing daily notification system...');
            await window.electronAPI.checkDailyNotification();
            console.log('✅ Notification test triggered');
          } else {
            console.log('❌ electronAPI not available');
          }
        },

        // Clear all data
        reset: () => {
          setUserData({ name: '', leetUsername: '' });
          setGroupData({ code: '', joined: false });
          setStep('welcome');
          // Clear localStorage
          Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
          });
          console.log('🧹 Reset all data');
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

        // Compare leaderboard vs direct user data
        compareDataSources: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            console.log(
              '❌ No username provided. Usage: devHelpers.compareDataSources("username") or ensure you\'re logged in'
            );
            return;
          }

          try {
            console.log('🔍 COMPARING DATA SOURCES');
            console.log('=========================');
            console.log('Username:', user);

            // Get direct user data
            const directUserData = await window.electronAPI?.getUserData(user);
            console.log('\n📊 Direct User Data (get-user-data):');
            console.log('  XP:', directUserData?.xp || 0);
            console.log('  Easy:', directUserData?.easy || 0);
            console.log('  Medium:', directUserData?.medium || 0);
            console.log('  Hard:', directUserData?.hard || 0);
            console.log('  Group ID:', directUserData?.group_id);

            // Get leaderboard data (assuming current group)
            if (groupData?.code) {
              const leaderboardData =
                await window.electronAPI?.getStatsForGroup(groupData.code);
              const userFromLeaderboard = leaderboardData?.find(
                u => u.username === user
              );

              console.log('\n🏆 Leaderboard Data (get-stats-for-group):');
              if (userFromLeaderboard) {
                console.log('  XP:', userFromLeaderboard?.xp || 0);
                console.log('  Easy:', userFromLeaderboard?.easy || 0);
                console.log('  Medium:', userFromLeaderboard?.medium || 0);
                console.log('  Hard:', userFromLeaderboard?.hard || 0);

                console.log('\n🚨 DIFFERENCES:');
                const xpDiff =
                  (directUserData?.xp || 0) - (userFromLeaderboard?.xp || 0);
                const easyDiff =
                  (directUserData?.easy || 0) -
                  (userFromLeaderboard?.easy || 0);
                const mediumDiff =
                  (directUserData?.medium || 0) -
                  (userFromLeaderboard?.medium || 0);
                const hardDiff =
                  (directUserData?.hard || 0) -
                  (userFromLeaderboard?.hard || 0);

                console.log(
                  `  XP: ${xpDiff} (${directUserData?.xp || 0} vs ${userFromLeaderboard?.xp || 0})`
                );
                console.log(
                  `  Easy: ${easyDiff} (${directUserData?.easy || 0} vs ${userFromLeaderboard?.easy || 0})`
                );
                console.log(
                  `  Medium: ${mediumDiff} (${directUserData?.medium || 0} vs ${userFromLeaderboard?.medium || 0})`
                );
                console.log(
                  `  Hard: ${hardDiff} (${directUserData?.hard || 0} vs ${userFromLeaderboard?.hard || 0})`
                );

                if (
                  xpDiff !== 0 ||
                  easyDiff !== 0 ||
                  mediumDiff !== 0 ||
                  hardDiff !== 0
                ) {
                  console.log('⚠️  DATA MISMATCH DETECTED!');
                } else {
                  console.log('✅ Data sources match');
                }
              } else {
                console.log('  ❌ User not found in leaderboard!');
                console.log('  Group code:', groupData.code);
                console.log(
                  '  Available users:',
                  leaderboardData?.map(u => u.username)
                );
              }
            } else {
              console.log(
                '\n❌ No group code available for leaderboard comparison'
              );
            }

            return { directUserData, groupData: groupData?.code };
          } catch (error) {
            console.error('❌ Error comparing data sources:', error);
          }
        },

        // Test the complete daily problem function
        testCompleteDailyProblem: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            console.log(
              '❌ No username provided. Usage: devHelpers.testCompleteDailyProblem("username") or ensure you\'re logged in'
            );
            return;
          }

          try {
            console.log('🧪 TESTING COMPLETE DAILY PROBLEM');
            console.log('==================================');
            console.log('Username:', user);

            // Get user data BEFORE
            const beforeData = await window.electronAPI?.getUserData(user);
            console.log('XP before:', beforeData?.xp || 0);

            // Call complete daily problem
            console.log('Calling completeDailyProblem...');
            const result = await window.electronAPI?.completeDailyProblem(user);
            console.log('Complete daily result:', result);

            // Get user data AFTER
            const afterData = await window.electronAPI?.getUserData(user);
            console.log('XP after:', afterData?.xp || 0);

            const xpDiff = (afterData?.xp || 0) - (beforeData?.xp || 0);
            console.log('XP difference:', xpDiff);

            return { result, xpDiff, beforeData, afterData };
          } catch (error) {
            console.error('❌ Error testing complete daily problem:', error);
          }
        },

        // Test XP refresh function
        testXPRefresh: async username => {
          const user = username || userData?.leetUsername;
          if (!user) {
            console.log(
              '❌ No username provided. Usage: devHelpers.testXPRefresh("username") or ensure you\'re logged in'
            );
            return;
          }

          try {
            console.log('🧪 TESTING XP REFRESH');
            console.log('=====================');
            console.log('Username:', user);

            // Get user data BEFORE
            const beforeData = await window.electronAPI?.getUserData(user);
            console.log('XP before:', beforeData?.xp || 0);

            // Call refresh XP
            console.log('Calling refreshUserXP...');
            const result = await window.electronAPI?.refreshUserXP(user);
            console.log('Refresh XP result:', result);

            // Get user data AFTER
            const afterData = await window.electronAPI?.getUserData(user);
            console.log('XP after:', afterData?.xp || 0);

            const xpDiff = (afterData?.xp || 0) - (beforeData?.xp || 0);
            console.log('XP difference:', xpDiff);

            return { result, xpDiff, beforeData, afterData };
          } catch (error) {
            console.error('❌ Error testing XP refresh:', error);
          }
        },

        // Test duel completion (simulate solving a problem)
        simulateDuelWin: async (timeInSeconds = null) => {
          if (!userData?.leetUsername) {
            console.log('❌ Please log in first');
            return;
          }

          try {
            // Get active duels
            const duels = await window.electronAPI?.getUserDuels(
              userData.leetUsername
            );
            const activeDuels = duels?.filter(d => d.status === 'ACTIVE');

            if (activeDuels?.length === 0) {
              console.log(
                '❌ No active duels found. Create and accept a duel first.'
              );
              console.log('');
              console.log('💡 How to test duels with automatic detection:');
              console.log('1. Challenge a friend or have them challenge you');
              console.log('2. Accept the duel to make it ACTIVE');
              console.log('3. Start the duel and click "Solve Now"');
              console.log(
                '4. Solve the problem on LeetCode (automatic detection) OR use devHelpers.simulateDuelWin()'
              );
              return;
            }

            const duel = activeDuels[0];
            console.log('🧪 SIMULATING DUEL COMPLETION');
            console.log('==============================');
            console.log('Duel ID:', duel.duelId);
            console.log('Problem:', duel.problemTitle);
            console.log(
              'Your time:',
              timeInSeconds ? `${timeInSeconds} seconds` : 'Random (30s-10min)'
            );
            console.log(
              'Opponent:',
              duel.challenger === userData.leetUsername
                ? duel.challengee
                : duel.challenger
            );

            const result = await window.electronAPI?.simulateDuelCompletion(
              duel.duelId,
              userData.leetUsername,
              timeInSeconds
            );

            console.log('✅ Duel completion simulated!');
            console.log('Result:', result);

            if (result.completed) {
              console.log(`🎉 Winner: ${result.winner}`);
              console.log(`💰 XP Awarded: ${result.xpAwarded}`);
              console.log('');
              console.log(
                '🔄 Refresh the duels section to see the completed state!'
              );
            } else {
              console.log('⏳ Waiting for opponent to finish...');
              console.log('');
              console.log('💡 To simulate opponent completion too:');
              console.log(
                `devHelpers.simulateOpponentWin("${duel.duelId}", ${(timeInSeconds || 300) + 30})`
              );
            }

            return result;
          } catch (error) {
            console.error('❌ Error simulating duel completion:', error);
          }
        },

        // Simulate opponent completing a duel (for full testing)
        simulateOpponentWin: async (duelId, timeInSeconds = null) => {
          if (!userData?.leetUsername) {
            console.log('❌ Please log in first');
            return;
          }

          try {
            // Get the duel
            const duel = await window.electronAPI?.getDuel(duelId);
            if (!duel) {
              console.log('❌ Duel not found');
              return;
            }

            // Find the opponent
            const opponent =
              duel.challenger === userData.leetUsername
                ? duel.challengee
                : duel.challenger;

            console.log('🧪 SIMULATING OPPONENT COMPLETION');
            console.log('==================================');
            console.log('Duel ID:', duelId);
            console.log('Opponent:', opponent);
            console.log(
              'Opponent time:',
              timeInSeconds ? `${timeInSeconds} seconds` : 'Random (30s-10min)'
            );

            const result = await window.electronAPI?.simulateDuelCompletion(
              duelId,
              opponent,
              timeInSeconds
            );

            console.log('✅ Opponent completion simulated!');
            console.log('Result:', result);

            if (result.completed) {
              console.log(`🎉 Winner: ${result.winner}`);
              console.log(`💰 XP Awarded: ${result.xpAwarded} (to winner)`);
              console.log('');
              console.log(
                '🔄 Check the duels section - should show completed state!'
              );
            }

            return result;
          } catch (error) {
            console.error('❌ Error simulating opponent completion:', error);
          }
        },

        // Test automatic submission detection with real LeetCode API
        testSubmissionDetection: async () => {
          if (!userData?.leetUsername) {
            console.log('❌ Please log in first');
            return;
          }

          try {
            console.log('🧪 TESTING REAL LEETCODE SUBMISSION DETECTION');
            console.log('==============================================');
            console.log('Username:', userData.leetUsername);

            const submissions =
              await window.electronAPI?.fetchLeetCodeSubmissions(
                userData.leetUsername,
                10
              );

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

            return submissions;
          } catch (error) {
            console.error('❌ Error testing submission detection:', error);
          }
        },

        // Test display name functionality
        testDisplayName: async (displayName, username) => {
          const user = username || userData?.leetUsername;
          const name = displayName || userData?.name || 'Test Display Name';

          if (!user) {
            console.log(
              '❌ No username provided. Usage: devHelpers.testDisplayName("MyName", "username") or ensure you\'re logged in'
            );
            return;
          }

          try {
            console.log('🧪 TESTING DISPLAY NAME');
            console.log('========================');
            console.log('Username:', user);
            console.log('Display Name:', name);

            // Get user data BEFORE
            const beforeData = await window.electronAPI?.getUserData(user);
            console.log(
              'Display name before:',
              beforeData?.display_name || 'Not set'
            );

            // Call update display name
            console.log('Calling updateDisplayName...');
            const result = await window.electronAPI?.updateDisplayName(
              user,
              name
            );
            console.log('Update display name result:', result);

            // Get user data AFTER
            const afterData = await window.electronAPI?.getUserData(user);
            console.log(
              'Display name after:',
              afterData?.display_name || 'Not set'
            );

            // Test leaderboard data
            if (groupData?.code) {
              console.log('Testing leaderboard display...');
              const leaderboardData =
                await window.electronAPI?.getStatsForGroup(groupData.code);
              const userInLeaderboard = leaderboardData?.find(
                u => u.username === user
              );
              console.log('User in leaderboard:', userInLeaderboard);
              console.log(
                'Name shown in leaderboard:',
                userInLeaderboard?.name
              );
            }

            return { result, beforeData, afterData };
          } catch (error) {
            console.error('❌ Error testing display name:', error);
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
• devHelpers.testXPRefresh(username?) - Test XP refresh function
• devHelpers.testCompleteDailyProblem(username?) - Test daily problem completion
• devHelpers.testDisplayName(displayName?, username?) - Test display name functionality 🆕
        • devHelpers.simulateDuelWin(timeInSeconds?) - Simulate completing a duel for testing 🆕
        • devHelpers.simulateOpponentWin(duelId, timeInSeconds?) - Simulate opponent completion 🆕
        • devHelpers.testSubmissionDetection() - Test real LeetCode submission detection 🆕
• devHelpers.testDisplayName(displayName?, username?) - Test display name functionality
• devHelpers.testNotification() - Test notification system
• devHelpers.compareDataSources(username?) - Compare leaderboard vs direct data
• devHelpers.state() - Show current app state
• devHelpers.clearStorage() - Clear all stored data
• devHelpers.goToWelcome/Onboarding/Group/Leaderboard() - Navigate
        `);
    }
  }, []);
};
