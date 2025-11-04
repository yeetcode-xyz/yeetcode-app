import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import XPExplainerModal from '../XPExplainerModal';
import RankProgressionModal from '../RankProgressionModal';

const RANKS = [
  { name: 'Script Kiddie', min: 0, max: 1499 },
  { name: 'Debugger', min: 1500, max: 4499 },
  { name: 'Stack Overflower', min: 4500, max: 10499 },
  { name: 'Algorithm Apprentice', min: 10500, max: 19499 },
  { name: 'Loop Guru', min: 19500, max: 35999 },
  { name: 'Recursion Wizard', min: 36000, max: 59999 },
  { name: 'Regex Sorcerer', min: 60000, max: 104999 },
  { name: 'Master Yeeter', min: 105000, max: 149999 },
  { name: '0xDEADBEEF', min: 150000, max: Infinity },
];

function getRankAndSubdivision(xp) {
  for (let i = 0; i < RANKS.length; i++) {
    const { name, min, max } = RANKS[i];
    if (xp >= min && xp <= max) {
      const range = max - min + 1;
      const subSize = Math.floor(range / 3);
      let sub = 'I';
      if (xp >= min + 2 * subSize) sub = 'III';
      else if (xp >= min + subSize) sub = 'II';
      // III is highest, I is lowest
      return { name, sub };
    }
  }
  return { name: 'Unranked', sub: '' };
}

const UserStats = ({ userData, leaderboard, dailyData }) => {
  const [showRankUp, setShowRankUp] = useState(false);
  const [showXPModal, setShowXPModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);

  // Find current user's stats from leaderboard (case-insensitive)
  const currentUserStats = leaderboard?.find(
    user => user.username === userData?.leetUsername?.toLowerCase()
  ) || { easy: 0, medium: 0, hard: 0 };

  // Always define calculateXP at the top level - ensure all values are numbers
  const calculateXP = stats => {
    const easy = Number(stats.easy) || 0;
    const medium = Number(stats.medium) || 0;
    const hard = Number(stats.hard) || 0;
    const bonusXP = Number(stats.xp) || 0; // Daily challenges and other bonus XP

    const problemXP = easy * 100 + medium * 300 + hard * 500;
    return problemXP + bonusXP;
  };

  // Calculate XP
  let userXP;
  if (
    typeof window !== 'undefined' &&
    window.devHelpers &&
    userData?.xp !== undefined
  ) {
    // In dev mode, use userData.xp directly if set (for testRankUpAnimation)
    userXP = userData.xp;
  } else {
    userXP = calculateXP(currentUserStats);
  }
  const totalProblems =
    currentUserStats.easy + currentUserStats.medium + currentUserStats.hard;

  // Use real streak data from dailyData
  const currentStreak = dailyData?.streak || 0;

  // Calculate leaderboard rank
  const getRank = () => {
    if (!leaderboard || leaderboard.length === 0) return 'N/A';
    const sortedByXP = leaderboard
      .map(user => calculateXP(user))
      .sort((a, b) => b - a);
    const userRank = sortedByXP.findIndex(xp => xp === userXP) + 1;
    return userRank > 0 ? `#${userRank}` : 'N/A';
  };

  // Coding-themed rank and subdivision
  const { name: rankName, sub: rankSub } = getRankAndSubdivision(userXP);

  // Progress to next rank
  const getNextRankXP = () => {
    for (let i = 0; i < RANKS.length; i++) {
      if (userXP < RANKS[i].max) return RANKS[i].max + 1 - userXP;
    }
    return 0;
  };

  // Get next rank details
  const getNextRank = () => {
    // If in subdivision I or II, next is same rank name but higher subdivision
    const currentRankIndex = RANKS.findIndex(
      r => userXP >= r.min && userXP <= r.max
    );

    if (currentRankIndex === -1) return null;

    const currentRank = RANKS[currentRankIndex];
    const range = currentRank.max - currentRank.min + 1;
    const subSize = Math.floor(range / 3);

    // Check if we're in subdivision III (highest in current rank)
    if (userXP >= currentRank.min + 2 * subSize) {
      // Next is subdivision I of next rank
      if (currentRankIndex < RANKS.length - 1) {
        return { name: RANKS[currentRankIndex + 1].name, sub: 'I' };
      }
      return null; // Max rank reached
    } else if (userXP >= currentRank.min + subSize) {
      // Currently in II, next is III
      return { name: currentRank.name, sub: 'III' };
    } else {
      // Currently in I, next is II
      return { name: currentRank.name, sub: 'II' };
    }
  };

  // Get XP needed to reach next sub-rank
  const getXPToNextSubRank = () => {
    const currentRankIndex = RANKS.findIndex(
      r => userXP >= r.min && userXP <= r.max
    );

    if (currentRankIndex === -1) return 0;

    const currentRank = RANKS[currentRankIndex];
    const range = currentRank.max - currentRank.min + 1;
    const subSize = Math.floor(range / 3);

    // Check current subdivision
    if (userXP >= currentRank.min + 2 * subSize) {
      // Currently in III, next is next rank's I
      if (currentRankIndex < RANKS.length - 1) {
        return RANKS[currentRankIndex + 1].min - userXP;
      }
      return 0; // Max rank reached
    } else if (userXP >= currentRank.min + subSize) {
      // Currently in II, next is III
      return currentRank.min + 2 * subSize - userXP;
    } else {
      // Currently in I, next is II
      return currentRank.min + subSize - userXP;
    }
  };

  // Progress bar for current rank
  const getRankProgress = () => {
    for (let i = 0; i < RANKS.length; i++) {
      const { min, max } = RANKS[i];
      if (userXP >= min && userXP <= max) {
        return ((userXP - min) / (max - min + 1)) * 100;
      }
    }
    return 100;
  };

  const prevRank = useRef('');
  const prevXP = useRef(0);
  const hasMounted = useRef(false);
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    const currentRank = `${rankName} ${rankSub}`;
    const storageKey = `yeetcode_${userData?.leetUsername}_lastKnownRank`;

    // Set initial values on first render
    if (!hasMounted.current) {
      hasMounted.current = true;

      // Load last known rank and XP from localStorage
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const { rank, xp } = JSON.parse(stored);
          prevRank.current = rank;
          prevXP.current = xp;
        } else {
          prevRank.current = currentRank;
          prevXP.current = userXP;
        }
      } catch (e) {
        prevRank.current = currentRank;
        prevXP.current = userXP;
      }

      // Add delay before allowing rank up animations
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 2000); // 2 second delay to ensure data is stable
      return;
    }

    // Only show rank up if:
    // 1. Initial load is complete (2 second delay)
    // 2. XP actually increased
    // 3. Rank actually changed
    // 4. Not just a page reload (XP increased significantly, not just data loading)
    const xpIncreased =
      prevXP.current < userXP && userXP - prevXP.current >= 100;

    if (
      initialLoadComplete.current &&
      xpIncreased &&
      prevRank.current &&
      prevRank.current !== currentRank
    ) {
      setShowRankUp(true);
      setTimeout(() => setShowRankUp(false), 2000);
    }

    // Save current state to localStorage
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          rank: currentRank,
          xp: userXP,
        })
      );
    } catch (e) {
      // Ignore localStorage errors
    }

    prevRank.current = currentRank;
    prevXP.current = userXP;
  }, [rankName, rankSub, userXP, userData?.leetUsername]);

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col h-80 relative">
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
              {userXP.toLocaleString()}
            </div>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <span>Total XP</span>
              <button
                onClick={() => setShowXPModal(true)}
                className="text-blue-500 hover:text-blue-700 transition-colors cursor-pointer font-bold"
                title="How XP works"
              >
                ℹ️
              </button>
            </div>
          </div>
          <div className="border-t-2 border-gray-400 my-4"></div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold">{totalProblems}</div>
              <div className="text-xs text-gray-600">Problems</div>
            </div>
            <div>
              <div className="text-lg font-bold">{getRank()}</div>
              <div className="text-xs text-gray-600">Rank</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-500">
                {currentStreak}
              </div>
              <div className="text-xs text-gray-600">Streak</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-center mb-2">
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <span>Current Rank</span>
                <button
                  onClick={() => setShowRankModal(true)}
                  className="text-blue-500 hover:text-blue-700 transition-colors cursor-pointer text-sm"
                  title="View rank progression"
                >
                  ℹ️
                </button>
              </div>
              <div className="text-xl font-black text-blue-600">
                {rankName} {rankSub}
              </div>
              {(() => {
                const nextRank = getNextRank();
                const xpNeeded = getXPToNextSubRank();
                return nextRank ? (
                  <div className="text-xs text-gray-600 mt-1">
                    Next:{' '}
                    <span className="font-bold text-green-600">
                      {nextRank.name} {nextRank.sub}
                    </span>
                    {xpNeeded > 0 && (
                      <span className="text-gray-500">
                        {' '}
                        in {xpNeeded.toLocaleString()} XP
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-orange-600 mt-1 font-bold">
                    Max Rank Reached! 🎉
                  </div>
                );
              })()}
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full border-2 border-gray-300">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${getRankProgress()}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 text-center font-semibold">
              {(() => {
                const nextRank = getNextRank();
                const xpNeeded = getNextRankXP();
                return xpNeeded > 0 && nextRank
                  ? `${xpNeeded.toLocaleString()} XP until ${nextRank.name} ${nextRank.sub}`
                  : xpNeeded > 0
                    ? `${xpNeeded.toLocaleString()} XP to next milestone`
                    : 'Maximum rank achieved!';
              })()}
            </div>
          </div>
        </div>
        {/* Rank-up animation */}
        <AnimatePresence>
          {showRankUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="absolute left-0 top-8 z-20 bg-yellow-300 border-4 border-black rounded-xl px-4 sm:px-8 py-3 shadow-2xl flex items-center gap-6 text-xl font-bold max-w-3xl min-w-[300px] whitespace-nowrap text-left"
              style={{ width: '100%' }}
            >
              <span>🚀</span>
              <span>Rank Up!</span>
              <span className="text-blue-700">
                {rankName} {rankSub}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <XPExplainerModal
        isOpen={showXPModal}
        onClose={() => setShowXPModal(false)}
      />
      <RankProgressionModal
        isOpen={showRankModal}
        onClose={() => setShowRankModal(false)}
        userXP={userXP}
      />
    </div>
  );
};

export default UserStats;
