import React, { useState, useEffect } from 'react';

const TodaysChallenge = ({ userData, dailyData }) => {
  const handleStartCoding = () => {
    if (dailyData.todaysProblem) {
      const leetcodeUrl = `https://leetcode.com/problems/${dailyData.todaysProblem.titleSlug}/`;
      window.electronAPI.openExternalUrl(leetcodeUrl);
    }
  };

  const getDifficultyColor = difficulty => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const stripHtmlTags = html => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .trim();
  };

  if (dailyData.loading) {
    return (
      <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">🎯</span>
            <h3 className="font-bold text-white text-lg">TODAY'S CHALLENGE</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-600">
            Loading daily challenge...
          </div>
        </div>
      </div>
    );
  }

  if (dailyData.error || !dailyData.todaysProblem) {
    return (
      <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">🎯</span>
            <h3 className="font-bold text-white text-lg">TODAY'S CHALLENGE</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-600">
            {dailyData.error
              ? `Error: ${dailyData.error}`
              : 'No daily challenge available today'}
          </div>
        </div>
      </div>
    );
  }

  const problem = dailyData.todaysProblem;
  const problemDescription =
    stripHtmlTags(problem.content).substring(0, 200) + '...';

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
          <h3 className="text-lg font-bold">{problem.title}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`${getDifficultyColor(problem.difficulty)} text-white px-3 py-1 rounded text-sm font-bold border-2 border-black uppercase`}
            >
              {problem.difficulty || 'Unknown'}
            </span>
            <span className="bg-orange-500 text-black px-2 py-1 rounded text-xs font-bold">
              +200 XP
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4 text-sm leading-relaxed">
          {problemDescription}
        </p>

        {problem.topicTags && problem.topicTags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {problem.topicTags.slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-300"
                >
                  {tag.name || tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {dailyData.dailyComplete ? (
              <button
                className="bg-gray-500 text-white px-6 py-2 rounded-lg border-2 border-black font-bold flex items-center gap-2 cursor-not-allowed"
                disabled
              >
                <span>✅</span>
                COMPLETED
              </button>
            ) : (
              <button
                onClick={handleStartCoding}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg border-2 border-black font-bold flex items-center gap-2 btn-3d"
              >
                <span>💻</span>
                START CODING
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-orange-500 text-lg">🔥</span>
              <div>
                <div className="font-bold text-orange-500">
                  {dailyData.streak} day streak
                </div>
                <div className="text-xs">
                  {dailyData.dailyComplete
                    ? 'Great job today!'
                    : 'Keep it going!'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {dailyData.dailyComplete && (
          <div className="mt-4 p-3 bg-green-100 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <span>🎉</span>
              <span className="font-bold">
                Daily challenge completed! You earned 200 XP.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysChallenge;
