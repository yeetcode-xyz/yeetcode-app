import React from 'react';

const FriendsLeaderboard = ({ leaderboard, userData }) => {
  // XP calculation function
  const calculateXP = user => {
    const baseXP = user.easy * 100 + user.medium * 300 + user.hard * 500;
    // Add bounty XP if available (for future bounty system)
    const bountyXP = user.bountyXP || 0;
    return baseXP + bountyXP;
  };

  return (
    <div
      className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg"
      style={{ height: '310px' }}
    >
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">🏆</span>
          <h3 className="font-bold text-white text-lg">FRIENDS LEADERBOARD</h3>
        </div>
      </div>
      <div className="p-0">
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No competitors yet! Invite friends to join.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="font-bold text-left px-4 py-2">RANK</th>
                  <th className="font-bold text-left px-4 py-2">PLAYER</th>
                  <th className="font-bold text-center px-4 py-2">EASY</th>
                  <th className="font-bold text-center px-4 py-2">MED</th>
                  <th className="font-bold text-center px-4 py-2">HARD</th>
                  <th className="font-bold text-center px-4 py-2">TOTAL</th>
                  <th className="font-bold text-center px-4 py-2">XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard
                  .sort((a, b) => calculateXP(b) - calculateXP(a))
                  .map((user, index) => {
                    const isCurrentUser =
                      user.username === userData.leetUsername;
                    const total = user.easy + user.medium + user.hard;
                    const userXP = calculateXP(user);
                    const bgColor =
                      index === 0
                        ? 'bg-red-100'
                        : index === 1
                          ? 'bg-blue-100'
                          : index === 2
                            ? 'bg-green-100'
                            : isCurrentUser
                              ? 'bg-green-100'
                              : '';

                    return (
                      <tr
                        key={user.username}
                        className={`border-b border-gray-200 ${bgColor}`}
                      >
                        <td className="font-bold px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold border border-black">
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className={isCurrentUser ? 'font-bold' : ''}>
                              {isCurrentUser ? 'You' : user.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-3 font-bold">
                          {user.easy}
                        </td>
                        <td className="text-center px-4 py-3 font-bold">
                          {user.medium}
                        </td>
                        <td className="text-center px-4 py-3 font-bold">
                          {user.hard}
                        </td>
                        <td className="text-center px-4 py-3 font-bold text-blue-600">
                          {total}
                        </td>
                        <td className="text-center px-4 py-3 font-bold text-purple-600">
                          {userXP.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsLeaderboard;
