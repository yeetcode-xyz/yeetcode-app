export const TUTORIAL_STEPS = [
  {
    title: 'Leaderboard',
    description:
      'Compete with friends, race to take over and see how you rank. Stay motivated, refreshes every minute',
    icon: '🏆',
    tip: '💡 Tip: Check the leaderboard daily to stay motivated and see how you rank against friends!',
    preview: ({ leaderboardTab, setLeaderboardTab }) => (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <span className="text-white text-lg">🏆</span>
              <h3 className="font-bold text-white text-lg">LEADERBOARD</h3>
              <div className="flex gap-2 ml-4">
                <button
                  className={`btn-3d shadow-md px-3 py-1 rounded-lg font-bold border-2 border-b-0 border-white focus:outline-none transition-colors text-sm ${
                    leaderboardTab === 'friends'
                      ? 'bg-yellow-100 text-black'
                      : 'bg-blue-200 text-black hover:bg-yellow-200'
                  }`}
                  onClick={() => setLeaderboardTab('friends')}
                >
                  Friends
                </button>
                <button
                  className={`btn-3d shadow-md px-3 py-1 rounded-lg font-bold border-2 border-b-0 border-white focus:outline-none transition-colors text-sm ${
                    leaderboardTab === 'university'
                      ? 'bg-yellow-100 text-black'
                      : 'bg-blue-200 text-black hover:bg-yellow-200'
                  }`}
                  onClick={() => setLeaderboardTab('university')}
                >
                  University
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4">
          {leaderboardTab === 'friends' ? (
            <table className="w-full text-sm">
              <thead className="bg-yellow-100">
                <tr className="border-b-2 border-black">
                  <th className="text-left py-3 px-3 font-bold">RANK</th>
                  <th className="text-left py-3 px-3 font-bold">PLAYER</th>
                  <th className="text-center py-3 px-3 font-bold">EASY</th>
                  <th className="text-center py-3 px-3 font-bold">MED</th>
                  <th className="text-center py-3 px-3 font-bold">HARD</th>
                  <th className="text-center py-3 px-3 font-bold">TOTAL</th>
                  <th className="text-center py-3 px-3 font-bold">XP</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-red-100">
                  <td className="py-3 px-3 font-bold">#1</td>
                  <td className="py-3 px-3 font-bold">Taylor</td>
                  <td className="text-center py-3 px-3 text-green-600">112</td>
                  <td className="text-center py-3 px-3 text-yellow-600">55</td>
                  <td className="text-center py-3 px-3 text-red-600">19</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    186
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    64,400
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-blue-100">
                  <td className="py-3 px-3 font-bold">#2</td>
                  <td className="py-3 px-3 font-bold">You</td>
                  <td className="text-center py-3 px-3 text-green-600">143</td>
                  <td className="text-center py-3 px-3 text-yellow-600">42</td>
                  <td className="text-center py-3 px-3 text-red-600">7</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    192
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    62,300
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-green-100">
                  <td className="py-3 px-3 font-bold">#3</td>
                  <td className="py-3 px-3 font-bold">Alex</td>
                  <td className="text-center py-3 px-3 text-green-600">98</td>
                  <td className="text-center py-3 px-3 text-yellow-600">38</td>
                  <td className="text-center py-3 px-3 text-red-600">12</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    148
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    48,200
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50">
                  <td className="py-3 px-3 font-bold">#4</td>
                  <td className="py-3 px-3 font-bold">Sarah</td>
                  <td className="text-center py-3 px-3 text-green-600">87</td>
                  <td className="text-center py-3 px-3 text-yellow-600">29</td>
                  <td className="text-center py-3 px-3 text-red-600">8</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    124
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    41,800
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-yellow-100">
                <tr className="border-b-2 border-black">
                  <th className="text-left py-3 px-3 font-bold">RANK</th>
                  <th className="text-left py-3 px-3 font-bold">UNIVERSITY</th>
                  <th className="text-center py-3 px-3 font-bold">STUDENTS</th>
                  <th className="text-center py-3 px-3 font-bold">EASY</th>
                  <th className="text-center py-3 px-3 font-bold">MED</th>
                  <th className="text-center py-3 px-3 font-bold">HARD</th>
                  <th className="text-center py-3 px-3 font-bold">TOTAL</th>
                  <th className="text-center py-3 px-3 font-bold">TOTAL XP</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-red-100">
                  <td className="py-3 px-3 font-bold">#1</td>
                  <td className="py-3 px-3 font-bold">MIT</td>
                  <td className="text-center py-3 px-3">342</td>
                  <td className="text-center py-3 px-3 text-green-600">
                    4,821
                  </td>
                  <td className="text-center py-3 px-3 text-yellow-600">
                    2,341
                  </td>
                  <td className="text-center py-3 px-3 text-red-600">892</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    8,054
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    13.2K
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-blue-100">
                  <td className="py-3 px-3 font-bold">#2</td>
                  <td className="py-3 px-3 font-bold">Stanford</td>
                  <td className="text-center py-3 px-3">289</td>
                  <td className="text-center py-3 px-3 text-green-600">
                    4,156
                  </td>
                  <td className="text-center py-3 px-3 text-yellow-600">
                    2,102
                  </td>
                  <td className="text-center py-3 px-3 text-red-600">743</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    7,001
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    10.2K
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50 bg-green-100">
                  <td className="py-3 px-3 font-bold">#3</td>
                  <td className="py-3 px-3 font-bold">UC Berkeley</td>
                  <td className="text-center py-3 px-3">312</td>
                  <td className="text-center py-3 px-3 text-green-600">
                    4,234
                  </td>
                  <td className="text-center py-3 px-3 text-yellow-600">
                    1,987
                  </td>
                  <td className="text-center py-3 px-3 text-red-600">651</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    6,872
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    10.0K
                  </td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-yellow-50">
                  <td className="py-3 px-3 font-bold">#4</td>
                  <td className="py-3 px-3 font-bold">Carnegie Mellon</td>
                  <td className="text-center py-3 px-3">198</td>
                  <td className="text-center py-3 px-3 text-green-600">
                    2,876
                  </td>
                  <td className="text-center py-3 px-3 text-yellow-600">
                    1,423
                  </td>
                  <td className="text-center py-3 px-3 text-red-600">512</td>
                  <td className="text-center py-3 px-3 font-bold text-blue-600">
                    4,811
                  </td>
                  <td className="text-center py-3 px-3 font-bold text-purple-600">
                    6.2K
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    ),
  },
  {
    title: '1-on-1 Duels',
    description: 'Challenge friends to head-to-head coding battles',
    icon: '⚔️',
    tip: '💡 Tip: Duels are a great way to test your skills and earn bonus XP!',
    preview: () => (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⚔️</span>
            <h3 className="font-bold text-white text-lg">DUELS</h3>
          </div>
        </div>
        <div className="p-6 h-full">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-white p-4 border-2 border-black rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Challenge Friend</h4>
                <span className="text-lg">🎯</span>
              </div>
              <div className="space-y-3">
                <select className="w-full p-2 border-2 border-black rounded-lg font-medium">
                  <option value="">Select a friend...</option>
                  <option value="taylor">Taylor</option>
                  <option value="alex">Alex</option>
                  <option value="sarah">Sarah</option>
                  <option value="mike">Mike</option>
                  <option value="emma">Emma</option>
                </select>
                <select className="w-full p-2 border-2 border-black rounded-lg font-medium">
                  <option value="">Problem difficulty...</option>
                  <option value="Easy">
                    Easy (100 XP + 200 bonus if you win)
                  </option>
                  <option value="Medium">
                    Medium (300 XP + 200 bonus if you win)
                  </option>
                  <option value="Hard">
                    Hard (500 XP + 200 bonus if you win)
                  </option>
                  <option value="Random">
                    Random (? XP + 200 bonus if you win)
                  </option>
                </select>
                <button className="w-full bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold text-sm btn-3d">
                  Send Challenge
                </button>
              </div>
            </div>
            <div className="bg-white p-4 border-2 border-black rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Your Duels</h4>
                <span className="text-lg">📊</span>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3 mb-3">
                <div className="text-sm">
                  <div className="font-bold">
                    Challenge from Taylor • Medium
                  </div>
                  <div className="text-orange-600">⏰ Expires in 3h 0m</div>
                  <div className="bg-yellow-200 px-2 py-1 rounded text-xs font-bold mt-1">
                    PENDING
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded border-2 border-black font-bold text-xs transition-colors">
                      Accept
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded border-2 border-black font-bold text-xs transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-400 rounded p-3">
                <div className="text-sm">
                  <div className="font-bold">Dueling Taylor</div>
                  <div>Easy • Problem Hidden</div>
                  <div className="bg-blue-200 px-2 py-1 rounded text-xs font-bold mt-1">
                    ACTIVE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Daily Challenges',
    description: 'Solve daily problems to build streaks and earn XP',
    icon: '🎯',
    tip: '💡 Tip: Complete daily challenges to maintain your streak and earn bonus rewards!',
    preview: () => (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">🎯</span>
            <h3 className="font-bold text-white text-lg">TODAY'S CHALLENGE</h3>
          </div>
        </div>
        <div className="p-6 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Two Sum</h3>
            <div className="flex gap-2">
              <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold border-2 border-black uppercase">
                Easy
              </span>
              <span className="bg-orange-500 text-black px-2 py-1 rounded text-xs font-bold">
                +200 XP
              </span>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-4">
            Given an array of integers nums and an integer target, return
            indices of the two numbers such that they add up to target....
          </p>
          <div className="flex gap-2 mb-3">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              Array
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              Hash Table
            </span>
          </div>
          <div className="flex justify-between items-center">
            <button className="bg-green-500 text-white px-4 py-2 rounded border-2 border-black font-bold text-sm">
              💻 START CODING
            </button>
            <div className="text-center">
              <div className="text-orange-500">🔥</div>
              <div className="font-bold text-orange-500 text-xs">
                3 day streak
              </div>
              <div className="text-gray-600 text-xs">Keep it going!</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Active Bounties',
    description: 'Complete focused challenges to earn extra rewards',
    icon: '⭐',
    tip: '💡 Tip: Focus on specific topics with bounties to improve your skills systematically!',
    preview: () => (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⭐</span>
            <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
          </div>
        </div>
        <div
          className="p-6 space-y-4 overflow-y-auto"
          style={{ height: 'calc(100% - 80px)' }}
        >
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💻</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">
                    Solve 3 Medium LeetCode problems
                  </span>
                  <span className="text-lg font-bold text-orange-500">
                    900 XP
                  </span>
                </div>
                <div className="text-gray-600 text-xs mb-2">
                  Complete any 3 medium difficulty problems
                </div>
                <div className="text-xs text-gray-500 mb-2">7 days left</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full">
                    <div
                      className="h-3 bg-blue-400 rounded-full"
                      style={{ width: '33%' }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-700">1/3</span>
                </div>
                <div className="flex gap-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Dynamic Programming
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Trees
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📋</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">
                    Complete 5 Array problems
                  </span>
                  <span className="text-lg font-bold text-orange-500">
                    500 XP
                  </span>
                </div>
                <div className="text-gray-600 text-xs mb-2">
                  Solve 5 problems tagged with Array
                </div>
                <div className="text-xs text-gray-500 mb-2">3 days left</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full">
                    <div
                      className="h-3 bg-blue-400 rounded-full"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-700">3/5</span>
                </div>
                <div className="flex gap-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Array
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Two Pointers
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔥</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">
                    Weekly Streak Master
                  </span>
                  <span className="text-lg font-bold text-orange-500">
                    1200 XP
                  </span>
                </div>
                <div className="text-gray-600 text-xs mb-2">
                  Maintain a 7-day solving streak
                </div>
                <div className="text-xs text-gray-500 mb-2">4 days left</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full">
                    <div
                      className="h-3 bg-blue-400 rounded-full"
                      style={{ width: '43%' }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-700">3/7</span>
                </div>
                <div className="flex gap-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Consistency
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Habits
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];
