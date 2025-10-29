import React from 'react';

const XPExplainerModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black">How XP Works 📊</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black transition-colors text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Base XP Section */}
          <div>
            <h3 className="text-lg font-bold mb-2">Base XP per Problem:</h3>
            <div className="space-y-2 bg-gray-50 border-2 border-black rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">🟢 Easy:</span>
                </span>
                <span className="font-black">100 XP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-yellow-600 font-bold">🟡 Medium:</span>
                </span>
                <span className="font-black">300 XP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">🔴 Hard:</span>
                </span>
                <span className="font-black">500 XP</span>
              </div>
            </div>
          </div>

          {/* Bonus XP Section */}
          <div>
            <h3 className="text-lg font-bold mb-2">Bonus XP:</h3>
            <div className="space-y-2 bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">🎯 Daily Challenge</span>
                <span className="font-bold text-blue-700">+200 XP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">⚔️ Duel Victory</span>
                <span className="font-bold text-blue-700">+200 XP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">⚔️ Duel Participation</span>
                <span className="font-bold text-blue-700">+25 XP</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-black text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default XPExplainerModal;
