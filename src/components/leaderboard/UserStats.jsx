import React from 'react';

const UserStats = ({ userData, leaderboard }) => {
  // Find current user's stats from leaderboard
  const currentUserStats = leaderboard?.find(
    user => user.username === userData?.leetUsername
  ) || { easy: 0, medium: 0, hard: 0 };

  // Calculate XP
  const calculateXP = stats => {
    return stats.easy * 100 + stats.medium * 300 + stats.hard * 500;
  };

  const userXP = calculateXP(currentUserStats);
  const totalProblems =
    currentUserStats.easy + currentUserStats.medium + currentUserStats.hard;

  // Mock streak data - in real app this would come from props/API
  const currentStreak = 7;

  // Calculate rank based on XP
  const getRank = () => {
    if (!leaderboard || leaderboard.length === 0) return 'N/A';

    const sortedByXP = leaderboard
      .map(user => calculateXP(user))
      .sort((a, b) => b - a);

    const userRank = sortedByXP.findIndex(xp => xp === userXP) + 1;
    return userRank > 0 ? `#${userRank}` : 'N/A';
  };

  // Expanded rank tier system with wider bounds
  const getRankTier = () => {
    if (userXP >= 100000) return 'Mythic Yeeter';
    if (userXP >= 50000) return 'Grandmaster Yeeter';
    if (userXP >= 25000) return 'Master Yeeter';
    if (userXP >= 15000) return 'Diamond I';
    if (userXP >= 10000) return 'Diamond II';
    if (userXP >= 7500) return 'Platinum I';
    if (userXP >= 5000) return 'Platinum II';
    if (userXP >= 3500) return 'Gold I';
    if (userXP >= 2000) return 'Gold II';
    if (userXP >= 1000) return 'Silver I';
    if (userXP >= 500) return 'Silver II';
    if (userXP >= 200) return 'Bronze I';
    if (userXP >= 50) return 'Bronze II';
    return 'Unranked';
  };

  const getNextTierXP = () => {
    if (userXP < 50) return 50 - userXP;
    if (userXP < 200) return 200 - userXP;
    if (userXP < 500) return 500 - userXP;
    if (userXP < 1000) return 1000 - userXP;
    if (userXP < 2000) return 2000 - userXP;
    if (userXP < 3500) return 3500 - userXP;
    if (userXP < 5000) return 5000 - userXP;
    if (userXP < 7500) return 7500 - userXP;
    if (userXP < 10000) return 10000 - userXP;
    if (userXP < 15000) return 15000 - userXP;
    if (userXP < 25000) return 25000 - userXP;
    if (userXP < 50000) return 50000 - userXP;
    if (userXP < 100000) return 100000 - userXP;
    return 0;
  };

  const getTierProgress = () => {
    if (userXP < 50) return (userXP / 50) * 100;
    if (userXP < 200) return ((userXP - 50) / 150) * 100;
    if (userXP < 500) return ((userXP - 200) / 300) * 100;
    if (userXP < 1000) return ((userXP - 500) / 500) * 100;
    if (userXP < 2000) return ((userXP - 1000) / 1000) * 100;
    if (userXP < 3500) return ((userXP - 2000) / 1500) * 100;
    if (userXP < 5000) return ((userXP - 3500) / 1500) * 100;
    if (userXP < 7500) return ((userXP - 5000) / 2500) * 100;
    if (userXP < 10000) return ((userXP - 7500) / 2500) * 100;
    if (userXP < 15000) return ((userXP - 10000) / 5000) * 100;
    if (userXP < 25000) return ((userXP - 15000) / 10000) * 100;
    if (userXP < 50000) return ((userXP - 25000) / 25000) * 100;
    if (userXP < 100000) return ((userXP - 50000) / 50000) * 100;
    return 100;
  };

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col h-80">
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
            <div className="text-sm text-gray-600">Total XP</div>
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
            <div className="flex justify-between text-sm">
              <span>Rank Progress</span>
              <span className="font-bold">{getRankTier()}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${getTierProgress()}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 text-center">
              {getNextTierXP() > 0
                ? `${getNextTierXP().toLocaleString()} XP to next tier`
                : 'Max tier reached!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
