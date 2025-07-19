// Centralized analytics events for YeetCode app
import { useCallback, useMemo } from 'react';

// Custom hook for secure analytics (via IPC)
export const useAnalytics = () => {
  // Helper function to track events securely
  const trackEvent = useCallback(async (eventName, properties = {}) => {
    try {
      if (window.electronAPI?.analyticsTrack) {
        await window.electronAPI.analyticsTrack(eventName, properties);
      } else {
        // Fallback for development/testing
        console.log('[Analytics]', eventName, properties);
      }
    } catch (error) {
      console.error('[Analytics Error]', error);
    }
  }, []);

  // Helper function to identify users securely
  const identifyUser = useCallback(async (userId, properties = {}) => {
    try {
      if (window.electronAPI?.analyticsIdentify) {
        await window.electronAPI.analyticsIdentify(userId, properties);
      } else {
        // Fallback for development/testing
        console.log('[Analytics Identify]', userId, properties);
      }
    } catch (error) {
      console.error('[Analytics Identify Error]', error);
    }
  }, []);

  // Memoize the analytics object to prevent infinite re-renders
  const analytics = useMemo(
    () => ({
      // 🎯 HIGH-IMPACT USER JOURNEY EVENTS
      trackUserRegistration: (name, leetUsername) => {
        trackEvent('user_registered', {
          name,
          leetcode_username: leetUsername,
          registration_source: 'magic_link',
        });
      },

      trackGroupJoin: (groupCode, success) => {
        trackEvent('group_join_attempt', {
          group_code: groupCode,
          success,
          join_method: 'invite_code',
        });
      },

      // 🚀 CODING ACTIVITY & ENGAGEMENT (Most Impactful)
      trackDailyProblemStart: (problemTitle, difficulty) => {
        trackEvent('daily_problem_started', {
          problem_title: problemTitle,
          difficulty,
          problem_type: 'daily_challenge',
        });
      },

      trackDailyProblemComplete: (problemTitle, timeSpent, streak) => {
        trackEvent('daily_problem_completed', {
          problem_title: problemTitle,
          time_spent_minutes: timeSpent,
          current_streak: streak,
          problem_type: 'daily_challenge',
          xp_earned: 200, // Daily challenges give 200 XP
        });
      },

      trackRandomProblemGenerated: (difficulty, category) => {
        trackEvent('random_problem_generated', {
          difficulty,
          category,
          problem_type: 'random',
        });
      },

      // 📊 LEADERBOARD ENGAGEMENT (Critical for Retention)
      trackLeaderboardView: (groupSize, userRank) => {
        trackEvent('leaderboard_viewed', {
          group_size: groupSize,
          user_rank: userRank,
          leaderboard_type: 'friends',
        });
      },

      trackBountyCreated: (amount, problemDifficulty) => {
        trackEvent('bounty_created', {
          bounty_amount: amount,
          problem_difficulty: problemDifficulty,
          bounty_type: 'problem_specific',
        });
      },

      trackDuelInitiated: (targetUser, stakes) => {
        trackEvent('duel_initiated', {
          target_user: targetUser,
          stakes,
          duel_type: 'competitive',
        });
      },

      // ⏱️ SESSION & RETENTION METRICS
      trackAppSession: sessionDuration => {
        trackEvent('app_session_end', {
          session_duration_minutes: sessionDuration,
          session_type: 'active',
        });
      },

      // 🎯 FEATURE USAGE (Most Important for Product Decisions)
      trackFeatureUsed: (featureName, context = {}) => {
        trackEvent('feature_used', {
          feature_name: featureName,
          ...context,
        });
      },

      // 👤 USER IDENTIFICATION (Secure)
      identifyUser: (userId, properties = {}) => {
        identifyUser(userId, properties);
      },

      // 🆕 NEW HIGH-IMPACT EVENTS
      trackProblemSolved: (problemTitle, difficulty, timeSpent) => {
        trackEvent('problem_solved', {
          problem_title: problemTitle,
          difficulty,
          time_spent_minutes: timeSpent,
          xp_earned:
            difficulty === 'easy' ? 100 : difficulty === 'medium' ? 300 : 500,
        });
      },

      trackStreakMilestone: streakCount => {
        trackEvent('streak_milestone', {
          streak_count: streakCount,
          milestone_type:
            streakCount % 7 === 0
              ? 'weekly'
              : streakCount % 30 === 0
                ? 'monthly'
                : 'custom',
        });
      },

      trackGroupActivity: (groupCode, memberCount, activeMembers) => {
        trackEvent('group_activity', {
          group_code: groupCode,
          member_count: memberCount,
          active_members: activeMembers,
          activity_rate: activeMembers / memberCount,
        });
      },

      trackInviteShared: (platform, groupCode) => {
        trackEvent('invite_shared', {
          platform,
          group_code: groupCode,
          share_method: 'app_integration',
        });
      },

      trackOnboardingStep: (step, timeSpent) => {
        trackEvent('onboarding_step', {
          step,
          time_spent_seconds: timeSpent,
          onboarding_progress:
            step === 'welcome'
              ? 0
              : step === 'email'
                ? 20
                : step === 'verification'
                  ? 40
                  : step === 'onboarding'
                    ? 60
                    : step === 'group'
                      ? 80
                      : 100,
        });
      },
    }),
    [trackEvent, identifyUser]
  );

  return analytics;
};
