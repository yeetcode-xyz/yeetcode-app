import React from 'react';

const RANKS = [
  { name: 'Script Kiddie', min: 0, max: 1499, color: 'bg-gray-200' },
  { name: 'Debugger', min: 1500, max: 4499, color: 'bg-gray-300' },
  { name: 'Stack Overflower', min: 4500, max: 10499, color: 'bg-blue-200' },
  {
    name: 'Algorithm Apprentice',
    min: 10500,
    max: 19499,
    color: 'bg-blue-300',
  },
  { name: 'Loop Guru', min: 19500, max: 35999, color: 'bg-blue-400' },
  { name: 'Recursion Wizard', min: 36000, max: 59999, color: 'bg-purple-300' },
  { name: 'Regex Sorcerer', min: 60000, max: 104999, color: 'bg-purple-400' },
  { name: 'Master Yeeter', min: 105000, max: 149999, color: 'bg-orange-300' },
  { name: '0xDEADBEEF', min: 150000, max: Infinity, color: 'bg-orange-400' },
];

const RankProgressionModal = ({ isOpen, onClose, userXP = 0 }) => {
  if (!isOpen) return null;

  // Find user's current rank
  const currentRankIndex = RANKS.findIndex(
    r => userXP >= r.min && userXP <= r.max
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-w-lg w-full mx-4"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black">Rank Progression 🏆</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black transition-colors text-3xl font-bold leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Explanation */}
          <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-bold">Subdivisions:</span> Each rank has 3
              levels: I → II → III
            </p>
          </div>
        </div>

        {/* Scrollable Rank ladder */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-2.5">
            {RANKS.map((rank, index) => {
              const isCurrentRank = index === currentRankIndex;
              const isPassed = userXP > rank.max;

              return (
                <div
                  key={rank.name}
                  className={`relative p-3 rounded-lg border-2 ${
                    isCurrentRank
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : isPassed
                        ? 'border-gray-300 bg-white'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  {/* Current rank indicator */}
                  {isCurrentRank && (
                    <div className="absolute -right-2.5 -top-2.5 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full border-2 border-black">
                      YOU
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-bold">
                          {index + 1}
                        </span>
                        <div className="font-black text-base">{rank.name}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {rank.min.toLocaleString()} -{' '}
                        {rank.max === Infinity
                          ? '∞'
                          : rank.max.toLocaleString()}{' '}
                        XP
                      </div>
                    </div>

                    {/* Subdivision indicators */}
                    <div className="flex gap-1.5 ml-3">
                      {['I', 'II', 'III'].map(sub => {
                        const range = rank.max - rank.min + 1;
                        const subSize = Math.floor(range / 3);
                        let subMin, subMax;

                        if (sub === 'I') {
                          subMin = rank.min;
                          subMax = rank.min + subSize - 1;
                        } else if (sub === 'II') {
                          subMin = rank.min + subSize;
                          subMax = rank.min + 2 * subSize - 1;
                        } else {
                          subMin = rank.min + 2 * subSize;
                          subMax = rank.max;
                        }

                        const isInSub = userXP >= subMin && userXP <= subMax;
                        const passedSub = userXP > subMax;

                        return (
                          <div
                            key={sub}
                            className={`w-7 h-7 rounded border-2 flex items-center justify-center text-xs font-bold ${
                              isInSub
                                ? 'bg-blue-500 text-white border-blue-700'
                                : passedSub
                                  ? 'bg-green-300 text-green-800 border-green-500'
                                  : 'bg-gray-100 text-gray-400 border-gray-300'
                            }`}
                            title={`${sub}: ${subMin.toLocaleString()} - ${subMax === Infinity ? '∞' : subMax.toLocaleString()} XP`}
                          >
                            {sub}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t-2 border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-black text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RankProgressionModal;
