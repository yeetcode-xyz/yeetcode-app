import React from 'react';
import { createPortal } from 'react-dom';

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

  // Modal content
  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-yellow-100 border-4 border-black rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 border-b-4 border-black px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🎯 Random Problem Selected!
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-200 text-2xl font-bold px-2"
            style={{ lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1">
          <div className="space-y-4">
            {/* Problem Title */}
            <div>
              <h3 className="text-lg font-bold text-black mb-1">
                {problem.title}
              </h3>
              <p className="text-xs text-gray-700 font-mono">
                Problem #{problem.frontendQuestionId}
              </p>
            </div>

            {/* Difficulty Badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {getDifficultyIcon(problem.difficulty)}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 border-black uppercase ${getDifficultyColor(problem.difficulty)}`}
              >
                {problem.difficulty}
              </span>
            </div>

            {/* Topic Tags */}
            {problem.topicTags && problem.topicTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-700 mb-1 font-bold">Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {problem.topicTags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 border border-black rounded font-mono text-xs"
                    >
                      {tag.name}
                    </span>
                  ))}
                  {problem.topicTags.length > 3 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-black rounded font-mono text-xs">
                      +{problem.topicTags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="bg-yellow-200 border-2 border-black p-3 rounded-xl text-center font-bold text-black">
              Ready to tackle this challenge? 🚀
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-yellow-100 border-t-4 border-black px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-black border-2 border-black rounded-lg font-bold btn-3d hover:bg-yellow-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg border-2 border-black font-bold btn-3d transition-all shadow-md flex items-center gap-2"
          >
            <span>🎯</span>
            Open Problem
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RandomProblemModal;
