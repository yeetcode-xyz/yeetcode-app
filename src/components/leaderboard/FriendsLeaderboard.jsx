import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FriendsLeaderboard = ({ leaderboard, userData, notifications = [] }) => {
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">🏆</span>
            <h3 className="font-bold text-white text-lg">
              FRIENDS LEADERBOARD
            </h3>
          </div>
          {/* Notification Bar (inline) */}
          <div className="relative min-h-[24px] flex items-center">
            <AnimatePresence mode="popLayout">
              {notifications.map(notification => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-white text-white font-bold ml-2 shadow-lg text-sm ${
                    notification.type === 'overtake'
                      ? 'bg-orange-400'
                      : notification.type === 'joined'
                        ? 'bg-green-500'
                        : notification.type === 'left'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                  }`}
                >
                  <span>
                    {notification.type === 'overtake' && '🏃‍♂️'}
                    {notification.type === 'joined' && '🎉'}
                    {notification.type === 'left' && '👋'}
                  </span>
                  <span>{notification.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No competitors yet! Invite friends to join.
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <table className="min-w-full table-fixed">
              <thead className="bg-yellow-100 sticky top-0 z-10">
                <tr className="border-b-2 border-black">
                  <th className="font-bold text-left px-4 py-2 w-16">RANK</th>
                  <th className="font-bold text-left px-4 py-2 w-32">PLAYER</th>
                  <th className="font-bold text-center px-4 py-2 w-16">EASY</th>
                  <th className="font-bold text-center px-4 py-2 w-16">MED</th>
                  <th className="font-bold text-center px-4 py-2 w-16">HARD</th>
                  <th className="font-bold text-center px-4 py-2 w-20">
                    TOTAL
                  </th>
                  <th className="font-bold text-center px-4 py-2 w-24">XP</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
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
                        <motion.tr
                          key={user.username}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            backgroundColor:
                              index === 0
                                ? '#fee2e2'
                                : index === 1
                                  ? '#dbeafe'
                                  : index === 2
                                    ? '#dcfce7'
                                    : isCurrentUser
                                      ? '#eff6ff'
                                      : '#ffffff',
                          }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{
                            layout: { duration: 0.4, ease: 'easeInOut' },
                            default: { duration: 0.3 },
                          }}
                          className={`border-b border-gray-200 ${bgColor}`}
                        >
                          <motion.td
                            className={`px-4 py-3 w-16 ${rankStyle}`}
                            layout
                          >
                            <motion.span
                              key={`rank-${index}`}
                              initial={{ scale: 1.2, color: '#f59e0b' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.3 }}
                            >
                              #{index + 1}
                            </motion.span>
                          </motion.td>
                          <motion.td className="px-4 py-3 w-32" layout>
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
                          </motion.td>
                          <motion.td
                            className={`text-center px-4 py-3 w-16 ${textStyle}`}
                            layout
                          >
                            <motion.span
                              key={`easy-${user.easy}`}
                              initial={{ scale: 1.2, color: '#10b981' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.3 }}
                            >
                              {user.easy}
                            </motion.span>
                          </motion.td>
                          <motion.td
                            className={`text-center px-4 py-3 w-16 ${textStyle}`}
                            layout
                          >
                            <motion.span
                              key={`medium-${user.medium}`}
                              initial={{ scale: 1.2, color: '#f59e0b' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.3 }}
                            >
                              {user.medium}
                            </motion.span>
                          </motion.td>
                          <motion.td
                            className={`text-center px-4 py-3 w-16 ${textStyle}`}
                            layout
                          >
                            <motion.span
                              key={`hard-${user.hard}`}
                              initial={{ scale: 1.2, color: '#ef4444' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.3 }}
                            >
                              {user.hard}
                            </motion.span>
                          </motion.td>
                          <motion.td
                            className={`text-center px-4 py-3 w-20 font-bold ${isCurrentUser ? 'text-blue-700' : 'text-blue-600'}`}
                            layout
                          >
                            <motion.span
                              key={`total-${total}`}
                              initial={{ scale: 1.3, color: '#2563eb' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.4 }}
                            >
                              {total}
                            </motion.span>
                          </motion.td>
                          <motion.td
                            className={`text-center px-4 py-3 w-24 font-bold ${isCurrentUser ? 'text-purple-700' : 'text-purple-600'}`}
                            layout
                          >
                            <motion.span
                              key={`xp-${userXP}`}
                              initial={{ scale: 1.3, color: '#7c3aed' }}
                              animate={{ scale: 1, color: '#000' }}
                              transition={{ duration: 0.4 }}
                            >
                              {userXP.toLocaleString()}
                            </motion.span>
                          </motion.td>
                        </motion.tr>
                      );
                    })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsLeaderboard;
