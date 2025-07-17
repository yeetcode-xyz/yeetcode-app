// Centralized analytics events for YeetCode app
import { usePostHog } from 'posthog-js/react';

// Custom hook for analytics
export const useAnalytics = () => {
  const posthog = usePostHog();

  return {
    // User journey events
    trackUserRegistration: (name, leetUsername) => {
      posthog?.capture('user_registered', {
        name,
        leetcode_username: leetUsername,
        timestamp: new Date().toISOString(),
      });
    },

    trackGroupJoin: (groupCode, success) => {
      posthog?.capture('group_join_attempt', {
        group_code: groupCode,
        success,
        timestamp: new Date().toISOString(),
      });
    },

    // Coding activity events
    trackDailyProblemStart: (problemTitle, difficulty) => {
      posthog?.capture('daily_problem_started', {
        problem_title: problemTitle,
        difficulty,
        timestamp: new Date().toISOString(),
      });
    },

    trackDailyProblemComplete: (problemTitle, timeSpent, streak) => {
      posthog?.capture('daily_problem_completed', {
        problem_title: problemTitle,
        time_spent_minutes: timeSpent,
        current_streak: streak,
        timestamp: new Date().toISOString(),
      });
    },

    trackRandomProblemGenerated: (difficulty, category) => {
      posthog?.capture('random_problem_generated', {
        difficulty,
        category,
        timestamp: new Date().toISOString(),
      });
    },

    // Leaderboard events
    trackLeaderboardView: (groupSize, userRank) => {
      posthog?.capture('leaderboard_viewed', {
        group_size: groupSize,
        user_rank: userRank,
        timestamp: new Date().toISOString(),
      });
    },

    trackBountyCreated: (amount, problemDifficulty) => {
      posthog?.capture('bounty_created', {
        bounty_amount: amount,
        problem_difficulty: problemDifficulty,
        timestamp: new Date().toISOString(),
      });
    },

    trackDuelInitiated: (targetUser, stakes) => {
      posthog?.capture('duel_initiated', {
        target_user: targetUser,
        stakes,
        timestamp: new Date().toISOString(),
      });
    },

    // Engagement events
    trackAppSession: sessionDuration => {
      posthog?.capture('app_session_end', {
        session_duration_minutes: sessionDuration,
        timestamp: new Date().toISOString(),
      });
    },

    trackFeatureUsed: (featureName, context = {}) => {
      posthog?.capture('feature_used', {
        feature_name: featureName,
        ...context,
        timestamp: new Date().toISOString(),
      });
    },
  };
};
