import React from 'react';

const FriendsLeaderboard = ({ leaderboard, userData }) => {
  // XP calculation function
  const calculateXP = user => {
    const baseXP = user.easy * 100 + user.medium * 300 + user.hard * 500;
    // Add daily challenge XP and other bonus XP from database
    const bonusXP = user.xp || 0;
    return baseXP + bonusXP;
  };

  return (
    <div
      className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
      style={{ height: '310px' }}
    >
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">🏆</span>
          <h3 className="font-bold text-white text-lg">FRIENDS LEADERBOARD</h3>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No competitors yet! Invite friends to join.
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <table className="min-w-full">
              <thead className="bg-yellow-100 sticky top-0 z-10">
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
            </table>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="min-w-full">
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
                                ? 'bg-blue-50 border-l-4 border-blue-400'
                                : '';

                      const textStyle = isCurrentUser
                        ? 'font-semibold text-blue-700'
                        : '';
                      const rankStyle = isCurrentUser
                        ? 'font-bold text-blue-700'
                        : 'font-bold';

                      return (
                        <tr
                          key={user.username}
                          className={`border-b border-gray-200 ${bgColor}`}
                        >
                          <td className={`px-4 py-3 ${rankStyle}`}>
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black ${isCurrentUser ? 'bg-blue-200 text-blue-800' : 'bg-gray-300'}`}
                              >
                                {user.name.substring(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={
                                  isCurrentUser
                                    ? 'font-semibold text-blue-700'
                                    : ''
                                }
                              >
                                {isCurrentUser ? 'You' : user.name}
                              </span>
                            </div>
                          </td>
                          <td className={`text-center px-4 py-3 ${textStyle}`}>
                            {user.easy}
                          </td>
                          <td className={`text-center px-4 py-3 ${textStyle}`}>
                            {user.medium}
                          </td>
                          <td className={`text-center px-4 py-3 ${textStyle}`}>
                            {user.hard}
                          </td>
                          <td
                            className={`text-center px-4 py-3 font-bold ${isCurrentUser ? 'text-blue-700' : 'text-blue-600'}`}
                          >
                            {total}
                          </td>
                          <td
                            className={`text-center px-4 py-3 font-bold ${isCurrentUser ? 'text-purple-700' : 'text-purple-600'}`}
                          >
                            {userXP.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsLeaderboard;
