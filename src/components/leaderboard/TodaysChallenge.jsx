import React from 'react';

const TodaysChallenge = () => {
  // Mock data - in real app this would come from props/API
  const currentStreak = 7;
  const completedToday = false; // This would determine flame state

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">🎯</span>
          <h3 className="font-bold text-white text-lg">TODAY'S CHALLENGE</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Two Sum</h3>
          <div className="flex items-center gap-2">
            <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold border-2 border-black">
              EASY
            </span>
            <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
              +200 XP
            </span>
          </div>
        </div>
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">
          Given an array of integers nums and an integer target, return indices
          of the two numbers such that they add up to target. This is a
          fundamental problem that's perfect for beginners!
        </p>
        <div className="flex items-center justify-between">
          <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg border-2 border-black font-bold flex items-center gap-2 btn-3d">
            <span>💻</span>
            START CODING
          </button>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-orange-500 text-lg">🔥</span>
              <div>
                <div className="font-bold text-orange-500">
                  {currentStreak} day streak
                </div>
                <div className="text-xs">Keep it going!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodaysChallenge;
