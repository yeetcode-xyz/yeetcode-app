import React, { useState, useMemo } from 'react';
import SearchableDropdown from './SearchableDropdown';
import { getUniversities } from '../utils/universities';

const OnboardingStep = ({
  animationClass,
  error,
  userData,
  setUserData,
  validating,
  showSuccess,
  handleValidateLeet,
}) => {
  const [notInUniversity, setNotInUniversity] = useState(false);

  // Load universities from CSV
  const universities = useMemo(() => getUniversities(), []);

  const handleNotInUniversityChange = checked => {
    setNotInUniversity(checked);
    if (checked) {
      setUserData({ ...userData, university: '' });
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${animationClass}`}>
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">
          Almost there! Let's connect your LeetCode
        </h2>
        {userData.email && (
          <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded-lg">
            <p className="text-green-700 text-sm">
              ✅ Email verified:{' '}
              <span className="font-bold">{userData.email}</span>
            </p>
          </div>
        )}
      </div>

      {/* XP Explanation Box */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚡</span>
          <h3 className="font-bold text-purple-800">How XP Works</h3>
        </div>
        <div className="space-y-1 text-xs text-gray-700">
          <div className="flex items-center justify-between">
            <span>🟢 Easy Problem</span>
            <span className="font-bold text-green-600">100 XP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>🟡 Medium Problem</span>
            <span className="font-bold text-yellow-600">300 XP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>🔴 Hard Problem</span>
            <span className="font-bold text-red-600">500 XP</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-purple-200">
            <span>🎯 Daily Challenge Bonus</span>
            <span className="font-bold text-blue-600">+200 XP</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Your Name</label>
          <input
            className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Enter your first name"
            value={userData.name}
            onChange={e => setUserData({ ...userData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">
            LeetCode Username
          </label>
          <p className="text-xs text-gray-600 mb-2">
            We'll use your LeetCode username to:
          </p>
          <ul className="text-xs text-gray-600 mb-2 ml-4 space-y-1">
            <li>• Track your problem-solving progress automatically</li>
            <li>• Calculate your XP based on problems solved</li>
            <li>• Update your leaderboard rank in real-time</li>
          </ul>
          <input
            className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Your LeetCode username"
            value={userData.leetUsername}
            onChange={e =>
              setUserData({ ...userData, leetUsername: e.target.value })
            }
          />
          {userData.leetUsername && userData.leetUsername.trim().length > 0 && (
            <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <p className="text-sm text-blue-800">
                Is this you?{' '}
                <button
                  onClick={e => {
                    e.preventDefault();
                    window.electronAPI.openExternalUrl(
                      `https://leetcode.com/u/${userData.leetUsername}/`
                    );
                  }}
                  className="font-bold underline hover:text-blue-600 transition-colors break-all"
                >
                  https://leetcode.com/u/{userData.leetUsername}/
                </button>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Click to verify this is your profile
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">University</label>
          <SearchableDropdown
            options={universities}
            value={userData.university || ''}
            onChange={value => setUserData({ ...userData, university: value })}
            placeholder="Click to search for your university"
            searchPlaceholder="Type at least 2 characters to search..."
            minSearchLength={2}
            disabled={notInUniversity}
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="not-in-university"
              checked={notInUniversity}
              onChange={e => handleNotInUniversityChange(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded"
            />
            <label
              htmlFor="not-in-university"
              className="text-sm text-gray-600 cursor-pointer"
            >
              Not in a university
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {notInUniversity
              ? "You can join groups but won't appear on university leaderboard"
              : 'Join the university leaderboard!'}
          </p>
        </div>

        <button
          onClick={handleValidateLeet}
          disabled={validating}
          className={`w-full px-4 py-2 ${validating ? 'bg-gray-400 text-gray-200' : 'bg-yellow-300 hover:bg-yellow-500 text-black'} border-2 border-black rounded-lg font-bold ${!validating ? 'btn-3d' : 'cursor-not-allowed'}`}
        >
          {validating ? 'Checking...' : 'Continue'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {showSuccess && (
        <div className="relative overflow-hidden">
          <div className="bg-orange-500 p-6 border-4 border-black rounded-xl text-center animate-pulse shadow-2xl">
            <div className="space-y-3">
              <div className="text-white font-bold text-xl">WELCOME BACK!</div>
              <div className="text-black text-sm">
                Loading your dashboard...
              </div>
              <div className="flex justify-center items-center gap-2 text-black">
                <span>⚡</span>
                <span className="font-bold">Initializing dashboard...</span>
                <span>⚡</span>
              </div>
            </div>
            {/* Animated background effects */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 left-4 text-yellow-200 animate-ping">
                ✨
              </div>
              <div className="absolute top-6 right-6 text-yellow-200 animate-ping delay-200">
                ✨
              </div>
              <div className="absolute bottom-4 left-8 text-yellow-200 animate-ping delay-500">
                ✨
              </div>
              <div className="absolute bottom-2 right-4 text-yellow-200 animate-ping delay-700">
                ✨
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingStep;
