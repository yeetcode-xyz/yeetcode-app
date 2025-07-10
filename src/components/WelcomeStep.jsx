import React from 'react';

const WelcomeStep = ({
  animationClass,
  userData,
  groupData,
  handleStartOnboarding,
  navigateToStep,
}) => {
  return (
    <div className={`flex flex-col gap-6 ${animationClass}`}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Welcome to YeetCode! 🚀</h2>
        <p className="text-sm mb-4">
          The ultimate competitive coding platform that makes LeetCode practice
          fun and social!
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Connect your LeetCode account</li>
            <li>• Join or create a study group</li>
            <li>• Compete with friends on the leaderboard</li>
            <li>• Track your progress in real-time</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <h3 className="font-bold text-green-800 mb-2">
            Leaderboard Features:
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Real-time ranking updates</li>
            <li>• Easy/Medium/Hard problem tracking</li>
            <li>• Daily progress monitoring</li>
            <li>• Group competition and motivation</li>
          </ul>
        </div>
      </div>

      <button
        onClick={handleStartOnboarding}
        className="px-6 py-3 bg-yellow-300 hover:bg-yellow-500 border-2 border-black rounded-lg font-bold text-black btn-3d"
      >
        Get Started! 🎯
      </button>

      {/* Show continue option if user has saved data */}
      {(userData.name || userData.leetUsername) && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Welcome back, {userData.name || 'User'}!
          </p>
          <button
            onClick={() =>
              navigateToStep(groupData.joined ? 'leaderboard' : 'group')
            }
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 border-2 border-black rounded-lg font-bold text-black btn-3d"
          >
            Continue Where You Left Off
          </button>
        </div>
      )}
    </div>
  );
};

export default WelcomeStep;
