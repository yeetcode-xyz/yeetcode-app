import React from 'react';

const ActiveBounties = ({ userData, leaderboard }) => {
  // Find current user's stats from leaderboard
  const currentUserStats = leaderboard?.find(
    user => user.username === userData?.leetUsername
  ) || { easy: 0, medium: 0, hard: 0 };

  // Calculate dynamic bounty data based on user progress
  const bounties = [
    {
      id: 1,
      title: 'Solve 1 Hard Graph Problem',
      description: 'Complete any graph-related hard problem',
      xp: 600,
      progress: Math.min(currentUserStats.hard, 1), // Assume they need 1 more hard
      maxProgress: 1,
      expiresIn: '3 days',
      icon: '🧩',
    },
    {
      id: 2,
      title: 'Complete 3 Medium Problems',
      description: 'Solve any 3 medium difficulty problems',
      xp: 500,
      progress: Math.min(currentUserStats.medium % 3, 3), // Progress towards next 3
      maxProgress: 3,
      expiresIn: '2 days',
      icon: '🎯',
    },
    {
      id: 3,
      title: 'Solve the Daily Problem',
      description: "Complete today's featured challenge",
      xp: 200,
      progress: 0, // This would be 1 if they completed today's challenge
      maxProgress: 1,
      expiresIn: '18 hours',
      icon: '📅',
    },
    {
      id: 4,
      title: 'Win a Duel',
      description: 'Challenge and defeat a friend',
      xp: 200,
      progress: 0, // This would come from duel history
      maxProgress: 1,
      expiresIn: '5 days',
      icon: '⚔️',
    },
    {
      id: 5,
      title: 'Solve 5 Easy Problems',
      description: 'Complete any 5 easy difficulty problems',
      xp: 250,
      progress: Math.min(currentUserStats.easy % 5, 5), // Progress towards next 5
      maxProgress: 5,
      expiresIn: '4 days',
      icon: '🌟',
    },
    {
      id: 6,
      title: 'Weekly Warrior',
      description: 'Solve at least 1 problem every day this week',
      xp: 700,
      progress: 4, // Mock: they've done 4/7 days
      maxProgress: 7,
      expiresIn: '3 days',
      icon: '🏆',
    },
  ];

  const getProgressPercentage = (progress, maxProgress) => {
    return (progress / maxProgress) * 100;
  };

  const getProgressColor = (progress, maxProgress) => {
    const percentage = getProgressPercentage(progress, maxProgress);
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  return (
    <div
      className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
      style={{ height: '400px' }}
    >
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">⭐</span>
          <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {bounties.map(bounty => (
            <div
              key={bounty.id}
              className="flex items-center justify-between p-3 bg-gray-50 border-2 border-black rounded-lg shadow-lg"
              style={{ minHeight: '65px' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{bounty.icon}</span>
                  <h4 className="font-bold text-xs">{bounty.title}</h4>
                  {bounty.progress === bounty.maxProgress && (
                    <span className="bg-green-500 text-white px-1.5 py-0.5 text-xs rounded font-bold">
                      COMPLETE!
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-1">
                  Expires in {bounty.expiresIn}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(bounty.progress, bounty.maxProgress)}`}
                      style={{
                        width: `${getProgressPercentage(bounty.progress, bounty.maxProgress)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {bounty.progress}/{bounty.maxProgress}
                  </span>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-sm font-bold text-orange-500">
                  {bounty.xp} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveBounties;
