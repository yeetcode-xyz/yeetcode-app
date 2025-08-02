import React, { useState } from 'react';
import { TUTORIAL_STEPS } from './welcomeConstants.jsx';

const WelcomeStep = ({
  animationClass,
  userData,
  groupData,
  handleStartOnboarding,
  navigateToStep,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [leaderboardTab, setLeaderboardTab] = useState('friends');

  const nextStep = () => {
    setCurrentStep(prev => (prev + 1) % TUTORIAL_STEPS.length);
  };

  const prevStep = () => {
    setCurrentStep(
      prev => (prev - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length
    );
  };

  const goToStep = stepIndex => {
    setCurrentStep(stepIndex);
  };

  return (
    <div className={`w-full ${animationClass} p-6`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to YeetCode!</h1>
        <p className="text-xl text-gray-700">
          The ultimate competitive coding platform that makes LeetCode practice
          fun and social!
        </p>
      </div>

      {/* Feature Tour Header */}
      <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg mb-4">
        <div className="bg-blue-500 px-6 py-3 border-b-4 border-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">📚</span>
              <span className="text-white font-bold text-lg">FEATURE TOUR</span>
            </div>
            <span className="text-white font-bold">
              {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Carousel */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* Left Arrow Button */}
        <button
          onClick={prevStep}
          className="bg-yellow-400 hover:bg-yellow-500 border-4 border-black rounded-full w-14 h-14 flex items-center justify-center btn-3d flex-shrink-0 text-2xl font-bold"
        >
          &lt;
        </button>

        {/* Feature Content */}
        <div
          className="bg-yellow-100 border-4 border-black rounded-xl shadow-lg p-8 flex flex-col"
          style={{ width: '900px', height: '600px' }}
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="text-4xl">
                {TUTORIAL_STEPS[currentStep].icon}
              </span>
              <h2 className="text-3xl font-bold">
                {TUTORIAL_STEPS[currentStep].title}
              </h2>
            </div>
            <p className="text-xl text-gray-700 mb-3">
              {TUTORIAL_STEPS[currentStep].description}
            </p>
            <div className="bg-white border-2 border-black rounded-lg p-3 max-w-2xl mx-auto shadow-md">
              <p className="text-sm font-bold text-gray-800">
                {TUTORIAL_STEPS[currentStep].tip}
              </p>
            </div>
          </div>

          {/* Feature Preview */}
          <div className="flex justify-center flex-1">
            <div className="w-full max-w-4xl">
              {TUTORIAL_STEPS[currentStep].preview({
                leaderboardTab,
                setLeaderboardTab,
              })}
            </div>
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={nextStep}
          className="bg-yellow-400 hover:bg-yellow-500 border-4 border-black rounded-full w-14 h-14 flex items-center justify-center btn-3d flex-shrink-0 text-2xl font-bold"
        >
          &gt;
        </button>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-2">
        {TUTORIAL_STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => goToStep(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentStep
                ? 'bg-blue-500 border-2 border-black'
                : 'bg-gray-300 border-2 border-black hover:bg-yellow-300'
            }`}
          />
        ))}
      </div>

      {/* Get Started Button */}
      <div className="text-center mt-6">
        <button
          onClick={handleStartOnboarding}
          className="bg-green-500 hover:bg-green-600 text-white border-4 border-black rounded-lg px-8 py-3 text-xl font-bold btn-3d"
        >
          Get Started! 🚀
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
