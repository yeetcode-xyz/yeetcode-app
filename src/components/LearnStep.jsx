import React, { useState, useEffect } from 'react';
import { frontendProblems } from '../data/frontendProblems';
import ProblemPanel from './learn/ProblemPanel';
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

  return (
    <div className={`min-h-screen bg-yellow-100 ${animationClass}`}>
      {/* Header */}
      <div className="bg-blue-500 border-b-4 border-black px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToStep('leaderboard')}
            className="btn-3d bg-white text-black px-4 py-2 rounded-lg font-bold border-2 border-black hover:bg-gray-100"
          >
            ← Back to Leaderboard
          </button>
          <h1 className="text-white font-bold text-2xl">
            🎨 LEARN UI - Frontend Challenges
          </h1>
        </div>
        <div className="text-white font-semibold">
          {userData?.username || 'User'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Problem Description */}
        <div className="w-1/4 border-r-4 border-black bg-white overflow-y-auto">
          <ProblemPanel
            problem={currentProblem}
            allProblems={frontendProblems}
            onProblemChange={handleProblemChange}
            showHints={showHints}
            onToggleHints={() => setShowHints(!showHints)}
          />
        </div>

        {/* Middle Panel - Code Editor */}
        <div className="w-1/2 border-r-4 border-black bg-gray-900 flex flex-col">
          {/* Tab Bar */}
          <div className="flex bg-gray-800 border-b-2 border-gray-700">
            {['html', 'css', 'js'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-bold border-r-2 border-gray-700 ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
            <div className="flex-1"></div>
            <button
              onClick={handleReset}
              className="px-4 py-2 m-1 bg-gray-700 text-white rounded font-semibold hover:bg-gray-600 text-sm border-2 border-gray-600"
            >
              Reset Code
            </button>
            <button
              onClick={handleShowSolution}
              className={`px-4 py-2 m-1 rounded font-semibold text-sm border-2 ${
                showSolution
                  ? 'bg-yellow-400 text-black border-yellow-600'
                  : 'bg-green-600 text-white border-green-700 hover:bg-green-700'
              }`}
            >
              {showSolution ? 'Hide Solution' : 'Show Solution'}
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

        {/* Right Panel - Live Preview */}
        <div className="w-1/4 bg-white flex flex-col">
          <div className="bg-green-500 px-4 py-3 border-b-4 border-black">
            <h3 className="font-bold text-white">LIVE PREVIEW</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <LivePreview html={code.html} css={code.css} js={code.js} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnStep;
