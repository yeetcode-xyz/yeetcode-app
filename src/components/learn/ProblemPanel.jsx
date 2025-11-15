import React from 'react';

const ProblemPanel = ({
  problem,
  allProblems,
  onProblemChange,
  showHints,
  onToggleHints,
}) => {
  const getDifficultyColor = difficulty => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Hard':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Problem Selector */}
      <div className="bg-yellow-100 border-4 border-black rounded-xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          📚 SELECT PROBLEM
        </h3>
        <select
          value={problem.id}
          onChange={e => onProblemChange(Number(e.target.value))}
          className="w-full p-2 border-2 border-black rounded-lg font-semibold bg-white cursor-pointer hover:bg-gray-50"
        >
          {allProblems.map(p => (
            <option key={p.id} value={p.id}>
              {p.id}. {p.title} ({p.difficulty})
            </option>
          ))}
        </select>
      </div>

      {/* Problem Info */}
      <div className="bg-white border-4 border-black rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-xl">{problem.title}</h2>
          <span
            className={`${getDifficultyColor(problem.difficulty)} text-white px-3 py-1 rounded-lg font-bold text-sm border-2 border-black`}
          >
            {problem.difficulty}
          </span>
        </div>
        <div className="inline-block bg-blue-100 px-3 py-1 rounded-lg font-semibold text-sm border-2 border-black mb-4">
          {problem.category}
        </div>
      </div>

      {/* Problem Description */}
      <div className="bg-white border-4 border-black rounded-xl p-4 flex-1">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {problem.description}
          </pre>
        </div>
      </div>

      {/* Hints Section */}
      <div className="bg-purple-100 border-4 border-black rounded-xl p-4">
        <button
          onClick={onToggleHints}
          className="w-full text-left font-bold flex items-center justify-between hover:bg-purple-200 p-2 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            💡 HINTS ({problem.hints.length})
          </span>
          <span className="text-2xl">{showHints ? '−' : '+'}</span>
        </button>
        {showHints && (
          <div className="mt-3 space-y-2">
            {problem.hints.map((hint, index) => (
              <div
                key={index}
                className="bg-white border-2 border-black rounded-lg p-3 text-sm"
              >
                <span className="font-bold">Hint {index + 1}:</span> {hint}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemPanel;
