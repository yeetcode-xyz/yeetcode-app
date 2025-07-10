import React from 'react';

const RandomProblemModal = ({ isOpen, onClose, problem, onConfirm }) => {
  if (!isOpen || !problem) return null;

  const getDifficultyColor = difficulty => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyIcon = difficulty => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'hard':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🎯 Random Problem Selected!
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Problem Title */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {problem.title}
              </h3>
              <p className="text-sm text-gray-600">
                Problem #{problem.frontendQuestionId}
              </p>
            </div>

            {/* Difficulty Badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {getDifficultyIcon(problem.difficulty)}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}
              >
                {problem.difficulty}
              </span>
            </div>

            {/* Topic Tags */}
            {problem.topicTags && problem.topicTags.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {problem.topicTags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                    >
                      {tag.name}
                    </span>
                  ))}
                  {problem.topicTags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                      +{problem.topicTags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                Ready to tackle this challenge? 🚀
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Open Problem 🎯
          </button>
        </div>
      </div>
    </div>
  );
};

export default RandomProblemModal;
