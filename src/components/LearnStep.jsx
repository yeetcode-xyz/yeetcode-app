import React, { useState, useEffect } from 'react';
import {
  frontendProblems,
  getLevelInfo,
  getProblemsByLevel,
} from '../data/frontendProblems';
import CodeEditor from './learn/CodeEditor';
import LivePreview from './learn/LivePreview';

const LearnStep = ({ animationClass, userData, navigateToStep }) => {
  const [currentProblem, setCurrentProblem] = useState(frontendProblems[0]);
  const [code, setCode] = useState({
    html: frontendProblems[0].starterCode.html,
    css: frontendProblems[0].starterCode.css,
    js: frontendProblems[0].starterCode.js,
  });
  const [activeTab, setActiveTab] = useState('html');
  const [showSolution, setShowSolution] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);

  const levels = getLevelInfo();

  // Update code when problem changes
  useEffect(() => {
    if (showSolution) {
      setCode({
        html: currentProblem.solution.html,
        css: currentProblem.solution.css,
        js: currentProblem.solution.js,
      });
    } else {
      setCode({
        html: currentProblem.starterCode.html,
        css: currentProblem.starterCode.css,
        js: currentProblem.starterCode.js,
      });
    }
    setShowHints(false);
  }, [currentProblem, showSolution]);

  const handleProblemChange = problemId => {
    const problem = frontendProblems.find(p => p.id === problemId);
    if (problem) {
      setCurrentProblem(problem);
      setShowSolution(false);
      setShowHints(false);
      setSelectedLevel(problem.level);
    }
  };

  const handleLevelChange = level => {
    setSelectedLevel(level);
    const levelProblems = getProblemsByLevel(level);
    if (levelProblems.length > 0) {
      handleProblemChange(levelProblems[0].id);
    }
  };

  const handleCodeChange = newCode => {
    setCode(prev => ({ ...prev, [activeTab]: newCode }));
  };

  const handleReset = () => {
    setCode({
      html: currentProblem.starterCode.html,
      css: currentProblem.starterCode.css,
      js: currentProblem.starterCode.js,
    });
    setShowSolution(false);
    setShowHints(false);
  };

  const handleShowSolution = () => {
    setShowSolution(!showSolution);
  };

  const levelProblems = getProblemsByLevel(selectedLevel);

  return (
    <div
      className={`w-full h-screen bg-gray-100 flex flex-col ${animationClass}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 border-b-4 border-black px-10 py-6 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigateToStep('leaderboard')}
            className="bg-white text-black px-8 py-4 rounded-xl font-bold text-xl border-3 border-black hover:bg-gray-100 transition-all shadow-md hover:shadow-lg"
          >
            ← Back
          </button>
          <h1 className="text-white font-bold text-4xl flex items-center gap-3">
            <span className="text-5xl">🎨</span>
            Learn Frontend
          </h1>
        </div>
        <div className="text-white font-semibold text-xl bg-white/20 px-6 py-3 rounded-xl">
          {userData?.username || 'User'}
        </div>
      </div>

      {/* Level Selector */}
      <div className="bg-white border-b-3 border-black px-8 py-5 shadow-md">
        <div className="flex gap-4">
          {levels.map(level => (
            <button
              key={level.level}
              onClick={() => handleLevelChange(level.level)}
              className={`flex-1 px-6 py-5 rounded-lg font-bold border-2 border-black transition-all ${
                selectedLevel === level.level
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-5xl mb-2">{level.emoji}</div>
              <div className="text-lg font-bold">{level.name}</div>
              <div className="text-base opacity-80">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Problem & Instructions */}
        <div className="w-1/5 bg-white border-r-4 border-black overflow-y-auto">
          <div className="p-8">
            {/* Problem Selector */}
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-4 border-black rounded-2xl p-8 mb-8 shadow-lg">
              <h3 className="font-bold text-2xl mb-5 flex items-center gap-3">
                <span className="text-4xl">📚</span>
                Choose Challenge
              </h3>
              <select
                value={currentProblem.id}
                onChange={e => handleProblemChange(Number(e.target.value))}
                className="w-full p-5 border-3 border-black rounded-xl font-bold bg-white cursor-pointer hover:bg-gray-50 text-xl shadow-md"
              >
                {levelProblems.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Info */}
            <div className="bg-white border-4 border-black rounded-xl p-8 mb-8 shadow-lg">
              <div className="mb-6">
                <h2 className="font-bold text-4xl mb-3">
                  {currentProblem.title}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-bold text-lg border-2 border-black">
                    {currentProblem.category}
                  </span>
                  <span
                    className={`px-6 py-3 rounded-lg font-bold text-lg border-2 border-black ${
                      currentProblem.difficulty === 'Beginner'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-black'
                    }`}
                  >
                    {currentProblem.difficulty}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 text-2xl leading-relaxed">
                {currentProblem.description}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border-4 border-black rounded-xl p-8 mb-8 shadow-lg">
              <h3 className="font-bold text-3xl mb-6 flex items-center gap-3">
                <span className="text-4xl">✅</span>
                Requirements
              </h3>
              <ul className="space-y-4">
                {currentProblem.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-4 text-xl">
                    <span className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hints */}
            <div className="bg-purple-50 border-4 border-black rounded-xl p-8 shadow-lg">
              <button
                onClick={() => setShowHints(!showHints)}
                className="w-full text-left font-bold text-3xl flex items-center justify-between hover:bg-purple-100 p-4 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="text-4xl">💡</span>
                  Hints ({currentProblem.hints.length})
                </span>
                <span className="text-4xl">{showHints ? '−' : '+'}</span>
              </button>
              {showHints && (
                <div className="mt-6 space-y-4">
                  {currentProblem.hints.map((hint, index) => (
                    <div
                      key={index}
                      className="bg-white border-3 border-black rounded-lg p-6 shadow-md"
                    >
                      <span className="font-bold text-purple-600 text-xl">
                        Hint {index + 1}:
                      </span>{' '}
                      <span className="text-gray-700 text-xl">{hint}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Code Editor */}
        <div className="w-2/5 bg-gray-900 flex flex-col border-r-4 border-black">
          {/* Tab Bar */}
          <div className="flex bg-gray-800 border-b-2 border-gray-700">
            {['html', 'css', 'js'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-8 py-5 font-bold text-2xl ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white border-b-4 border-blue-500'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Editor Controls */}
          <div className="bg-gray-800 px-6 py-4 flex gap-4 border-b-2 border-gray-700">
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-gray-700 text-white rounded-lg font-semibold text-lg hover:bg-gray-600 border-2 border-gray-600 transition-all"
            >
              🔄 Reset
            </button>
            <button
              onClick={handleShowSolution}
              className={`px-8 py-3 rounded-lg font-semibold text-lg border-2 transition-all ${
                showSolution
                  ? 'bg-yellow-400 text-black border-yellow-600 hover:bg-yellow-500'
                  : 'bg-green-600 text-white border-green-700 hover:bg-green-700'
              }`}
            >
              {showSolution ? '👁️ Hide Solution' : '✨ Show Solution'}
            </button>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            <CodeEditor
              language={activeTab === 'js' ? 'javascript' : activeTab}
              value={code[activeTab]}
              onChange={handleCodeChange}
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-2/5 bg-white flex flex-col">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-5 border-b-4 border-black">
            <h3 className="font-bold text-white text-3xl flex items-center gap-3">
              <span className="text-4xl">👁️</span>
              Live Preview
            </h3>
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <LivePreview html={code.html} css={code.css} js={code.js} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnStep;
