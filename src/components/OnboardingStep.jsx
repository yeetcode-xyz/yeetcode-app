import React, { useState } from 'react';
import SearchableDropdown from './SearchableDropdown';

const UNIVERSITIES = [
  'MIT',
  'Stanford University',
  'Harvard University',
  'Carnegie Mellon University',
  'UC Berkeley',
  'University of Illinois Urbana-Champaign',
  'Georgia Tech',
  'University of Washington',
  'University of Michigan',
  'UCLA',
  'Columbia University',
  'Cornell University',
  'University of Texas at Austin',
  'Princeton University',
  'Yale University',
  'University of Pennsylvania',
  'University of Southern California',
  'Stony Brook University',
  'New York University',
  'University of California San Diego',
  'Other',
];

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
          <input
            className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Your LeetCode username"
            value={userData.leetUsername}
            onChange={e =>
              setUserData({ ...userData, leetUsername: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll verify this username exists on LeetCode
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">University</label>
          <SearchableDropdown
            options={UNIVERSITIES}
            value={userData.university || ''}
            onChange={value => setUserData({ ...userData, university: value })}
            placeholder="Select your university"
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
