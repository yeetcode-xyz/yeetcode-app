export const TUTORIAL_STEPS = [
  {
    title: 'Leaderboard',
    description:
      'Compete with friends, race to take over and see how you rank. Stay motivated, refreshes every minute',
    icon: '🏆',
    tip: '💡 Tip: Check the leaderboard daily to stay motivated and see how you rank against friends!',
    preview: ({ leaderboardTab, setLeaderboardTab }) => (
      <div
        className="panel-3d bg-yellow-100 border-4 border-black rounded-xl overflow-hidden flex flex-col"
        style={{ height: '350px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">🏆</span>
                <h3 className="font-bold text-white text-lg">LEADERBOARD</h3>
              </div>
              <div className="flex gap-2">
                <button
                  className={`btn-3d px-3 py-1 rounded-lg font-bold border-2 border-black focus:outline-none transition-colors text-sm ${
                    leaderboardTab === 'friends'
                      ? 'bg-yellow-300 text-black'
                      : 'bg-white text-black hover:bg-yellow-100'
                  }`}
                  onClick={() => setLeaderboardTab('friends')}
                >
                  Friends
                </button>
                <button
                  className={`btn-3d px-3 py-1 rounded-lg font-bold border-2 border-black focus:outline-none transition-colors text-sm ${
                    leaderboardTab === 'university'
                      ? 'bg-yellow-300 text-black'
                      : 'bg-white text-black hover:bg-yellow-100'
                  }`}
                  onClick={() => setLeaderboardTab('university')}
                >
                  University
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {leaderboardTab === 'friends' ? (
            <div className="overflow-x-auto overflow-y-auto w-full max-w-full h-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              <table className="w-full max-w-full table-fixed">
                <thead className="bg-yellow-100 sticky top-0 z-10">
                  <tr className="border-b-2 border-black text-sm">
                    <th className="font-bold text-left px-4 py-2 w-16">RANK</th>
                    <th className="font-bold text-left px-4 py-2 w-32">
                      PLAYER
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      EASY
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      MED
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      HARD
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-20">
                      TOTAL
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-24">XP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-red-100">
                    <td className="px-4 py-3 w-16 font-bold text-base">#1</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          TA
                        </div>
                        <span className="text-sm">Taylor</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      112
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">55</td>
                    <td className="text-center px-4 py-3 w-16 text-base">19</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      186
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      64,400
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-blue-100 border-l-4 border-blue-400">
                    <td className="px-4 py-3 w-16 font-bold text-base text-blue-700">
                      #2
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-blue-200 text-blue-800">
                          YO
                        </div>
                        <span className="text-sm font-semibold text-blue-700">
                          You
                        </span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base text-blue-700">
                      143
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base text-blue-700">
                      42
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base text-blue-700">
                      7
                    </td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-700">
                      192
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-700">
                      62,300
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-green-100">
                    <td className="px-4 py-3 w-16 font-bold text-base">#3</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          AL
                        </div>
                        <span className="text-sm">Alex</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">98</td>
                    <td className="text-center px-4 py-3 w-16 text-base">38</td>
                    <td className="text-center px-4 py-3 w-16 text-base">12</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      148
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      48,200
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 w-16 font-bold text-base">#4</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          SA
                        </div>
                        <span className="text-sm">Sarah</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">87</td>
                    <td className="text-center px-4 py-3 w-16 text-base">29</td>
                    <td className="text-center px-4 py-3 w-16 text-base">8</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      124
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      41,800
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 w-16 font-bold text-base">#5</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          MI
                        </div>
                        <span className="text-sm">Mike</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">76</td>
                    <td className="text-center px-4 py-3 w-16 text-base">23</td>
                    <td className="text-center px-4 py-3 w-16 text-base">5</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      104
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      32,400
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 w-16 font-bold text-base">#6</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          EM
                        </div>
                        <span className="text-sm">Emma</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">65</td>
                    <td className="text-center px-4 py-3 w-16 text-base">18</td>
                    <td className="text-center px-4 py-3 w-16 text-base">3</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      86
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      24,900
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 w-16 font-bold text-base">#7</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-black bg-gray-300">
                          JA
                        </div>
                        <span className="text-sm">Jake</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">52</td>
                    <td className="text-center px-4 py-3 w-16 text-base">12</td>
                    <td className="text-center px-4 py-3 w-16 text-base">1</td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      65
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      18,300
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto w-full max-w-full h-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              <table className="w-full max-w-full table-fixed">
                <thead className="bg-yellow-100 sticky top-0 z-10">
                  <tr className="border-b-2 border-black text-sm">
                    <th className="font-bold text-left px-4 py-2 w-16">RANK</th>
                    <th className="font-bold text-left px-4 py-2 w-40">
                      UNIVERSITY
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-20">
                      STUDENTS
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      EASY
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      MED
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-16">
                      HARD
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-20">
                      TOTAL
                    </th>
                    <th className="font-bold text-center px-4 py-2 w-24">
                      TOTAL XP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-red-100">
                    <td className="px-4 py-3 w-16 font-bold text-base">#1</td>
                    <td className="px-4 py-3 w-40">
                      <div>
                        <div className="font-semibold text-base">MIT</div>
                        <div className="text-xs text-gray-500">
                          Top: algo_master_21
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-20 text-base">
                      342
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      4,821
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      2,341
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      892
                    </td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      8,054
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      13.2K
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-blue-100">
                    <td className="px-4 py-3 w-16 font-bold text-base">#2</td>
                    <td className="px-4 py-3 w-40">
                      <div>
                        <div className="font-semibold text-base">Stanford</div>
                        <div className="text-xs text-gray-500">
                          Top: stanford_coder
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-20 text-base">
                      289
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      4,156
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      2,102
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      743
                    </td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      7,001
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      10.2K
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-green-100">
                    <td className="px-4 py-3 w-16 font-bold text-base">#3</td>
                    <td className="px-4 py-3 w-40">
                      <div>
                        <div className="font-semibold text-base">
                          UC Berkeley
                        </div>
                        <div className="text-xs text-gray-500">
                          Top: berkeley_algo
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-20 text-base">
                      312
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      4,234
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      1,987
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      651
                    </td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      6,872
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      10.0K
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 w-16 font-bold text-base">#4</td>
                    <td className="px-4 py-3 w-40">
                      <div>
                        <div className="font-semibold text-base">
                          Carnegie Mellon
                        </div>
                        <div className="text-xs text-gray-500">
                          Top: cmu_ninja
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 w-20 text-base">
                      198
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      2,876
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      1,423
                    </td>
                    <td className="text-center px-4 py-3 w-16 text-base">
                      512
                    </td>
                    <td className="text-center px-4 py-3 w-20 font-bold text-base text-blue-600">
                      4,811
                    </td>
                    <td className="text-center px-4 py-3 w-24 font-bold text-base text-purple-600">
                      6.2K
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
        className="panel-3d bg-yellow-100 border-4 border-black rounded-xl overflow-hidden relative w-full h-full flex flex-col"
        style={{ height: '375px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⚔️</span>
            <h3 className="font-bold text-white text-lg">DUELS</h3>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challenge Friends */}
            <div
              className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
              style={{ minHeight: '240px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Challenge Friend</h4>
                <span className="text-lg">🎯</span>
              </div>
              <div className="space-y-3">
                <select className="w-full p-2 border-2 border-black rounded-lg font-medium text-sm">
                  <option value="">Select a friend...</option>
                  <option value="taylor">Taylor</option>
                  <option value="alex">Alex</option>
                  <option value="sarah">Sarah</option>
                  <option value="mike">Mike</option>
                  <option value="emma">Emma</option>
                </select>
                <select className="w-full p-2 border-2 border-black rounded-lg font-medium text-sm">
                  <option value="">Problem difficulty...</option>
                  <option value="Easy">Easy (100 XP + 200 bonus)</option>
                  <option value="Medium">Medium (300 XP + 200 bonus)</option>
                  <option value="Hard">Hard (500 XP + 200 bonus)</option>
                  <option value="Random">Random (? XP + 200 bonus)</option>
                </select>
              </div>
              <button className="w-full mt-3 btn-3d bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg border-2 border-black font-bold text-sm">
                Send Challenge
              </button>
            </div>

            {/* Active Duels & History */}
            <div
              className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
              style={{ minHeight: '240px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Your Duels</h4>
                <span className="text-lg">📊</span>
              </div>

              <div
                className="overflow-y-auto custom-scrollbar"
                style={{ height: '180px' }}
              >
                {/* Pending duel */}
                <div
                  className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 mb-4"
                  style={{ minHeight: '85px' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h5 className="font-bold text-sm">
                        Challenge from Taylor • Medium
                      </h5>
                      <p className="text-xs text-orange-600 font-bold">
                        ⏰ Expires in 3h 0m
                      </p>
                    </div>
                    <span className="text-xs bg-yellow-200 px-2 py-1 rounded font-bold">
                      PENDING
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 btn-3d bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-bold border-2 border-black">
                      Accept
                    </button>
                    <button className="flex-1 btn-3d bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold border-2 border-black">
                      Reject
                    </button>
                  </div>
                </div>

                {/* Active duel */}
                <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h5 className="font-bold text-sm">Dueling Alex</h5>
                      <p className="text-gray-600 text-xs">
                        Easy • Problem Hidden
                      </p>
                      <p className="text-xs text-orange-600 font-bold">
                        ⏰ Expires in 1h 45m
                      </p>
                    </div>
                    <span className="text-xs bg-blue-200 px-2 py-1 rounded font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="text-center">
                      <div className="font-bold">You</div>
                      <div className="text-gray-400">Not submitted</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">Alex</div>
                      <div className="text-green-600">5:47</div>
                    </div>
                  </div>

                  <button className="w-full btn-3d bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold border-2 border-black text-sm">
                    🚀 Start Duel
                  </button>
                </div>

                {/* Recent completed duels header */}
                <div className="text-xs font-bold text-gray-600 mt-3 mb-2 border-b border-gray-300 pb-1">
                  RECENT COMPLETED DUELS
                </div>

                {/* Completed duel - Win */}
                <div className="mb-2 p-2 rounded border-2 bg-green-100 border-green-400">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold">🏆 WIN</div>
                      <div className="ml-2">vs Sarah</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[11px]">Two Sum</div>
                      <div className="text-gray-600">Easy</div>
                      <div className="text-green-600 font-bold">+300 XP</div>
                    </div>
                  </div>
                </div>

                {/* Completed duel - Loss */}
                <div className="mb-2 p-2 rounded border-2 bg-red-100 border-red-400">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold">❌ LOSS</div>
                      <div className="ml-2">vs Mike</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[11px]">Merge K Lists</div>
                      <div className="text-gray-600">Hard</div>
                    </div>
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
      <div className="panel-3d bg-yellow-100 border-4 border-black rounded-xl overflow-hidden">
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">🎯</span>
            <h3 className="font-bold text-white text-lg">TODAY'S CHALLENGE</h3>
          </div>
        </div>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between gap-0 mb-4">
            <h3 className="text-lg font-bold">Two Sum</h3>
            <div className="flex items-center gap-2">
              <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold uppercase">
                Easy
              </span>
              <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold">
                +200 XP
              </span>
            </div>
          </div>

          <p className="text-gray-700 mb-4 text-sm leading-relaxed">
            Given an array of integers nums and an integer target, return
            indices of the two numbers such that they add up to target....
          </p>

          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-300">
                Array
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-300">
                Hash Table
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-shrink-0">
              <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg border-2 border-black font-bold flex items-center gap-2 btn-3d text-base">
                <span>💻</span>
                START CODING
              </button>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 text-gray-600">
              <span className="text-orange-500 text-lg">🔥</span>
              <div>
                <div className="font-bold text-orange-500 text-base">
                  3 day streak
                </div>
                <div className="text-xs">Keep it going!</div>
              </div>
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
        className="panel-3d bg-yellow-100 border-4 border-black rounded-xl overflow-hidden flex flex-col"
        style={{ height: '350px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⭐</span>
            <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          style={{ maxHeight: '320px' }}
        >
          <div
            className="flex flex-row items-start bg-white rounded-xl shadow border border-gray-200 p-4 transition-all"
            style={{ minHeight: '110px' }}
          >
            <div className="flex-shrink-0 mr-4 mt-1 text-3xl">💻</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base truncate">
                    Solve 3 Medium LeetCode problems
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase bg-yellow-500 text-white">
                    medium
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-orange-500">
                    900 XP
                  </span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mt-1 mb-1">
                Complete any 3 medium difficulty problems
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">7 days left</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-300 bg-blue-400"
                    style={{ width: '33%' }}
                  ></div>
                </div>
                <span className="text-xs text-gray-700 font-mono ml-2 min-w-[40px] text-right">
                  1/3
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Dynamic Programming
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Trees
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex flex-row items-start bg-white rounded-xl shadow border border-gray-200 p-4 transition-all"
            style={{ minHeight: '110px' }}
          >
            <div className="flex-shrink-0 mr-4 mt-1 text-3xl">📋</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base truncate">
                    Complete 5 Array problems
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500 text-white">
                    easy
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-orange-500">
                    500 XP
                  </span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mt-1 mb-1">
                Solve 5 problems tagged with Array
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">3 days left</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-300 bg-blue-400"
                    style={{ width: '60%' }}
                  ></div>
                </div>
                <span className="text-xs text-gray-700 font-mono ml-2 min-w-[40px] text-right">
                  3/5
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Array
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Two Pointers
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex flex-row items-start bg-white rounded-xl shadow border border-gray-200 p-4 transition-all"
            style={{ minHeight: '110px' }}
          >
            <div className="flex-shrink-0 mr-4 mt-1 text-3xl">🔥</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base truncate">
                    Weekly Streak Master
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500 text-white">
                    hard
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-orange-500">
                    1200 XP
                  </span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mt-1 mb-1">
                Maintain a 7-day solving streak
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">4 days left</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-300 bg-blue-400"
                    style={{ width: '43%' }}
                  ></div>
                </div>
                <span className="text-xs text-gray-700 font-mono ml-2 min-w-[40px] text-right">
                  3/7
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Consistency
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Habits
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex flex-row items-start bg-white rounded-xl shadow border border-gray-200 p-4 transition-all opacity-70"
            style={{ minHeight: '110px' }}
          >
            <div className="flex-shrink-0 mr-4 mt-1 text-3xl">🌳</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base truncate">
                    Binary Tree Explorer
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase bg-yellow-500 text-white">
                    medium
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-orange-500">
                    800 XP
                  </span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mt-1 mb-1">
                Solve 4 binary tree problems
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">1 day left</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-300 bg-green-500"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <span className="text-xs text-gray-700 font-mono ml-2 min-w-[40px] text-right">
                  4/4
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Binary Tree
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  DFS
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  BFS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];
