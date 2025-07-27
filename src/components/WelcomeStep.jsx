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
      <div className="bg-blue-500 px-6 py-3 border-b-4 border-black mb-6">
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

      {/* Feature Carousel */}
      <div className="relative">
        {/* Arrow Buttons */}
        <button
          onClick={prevStep}
          className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-yellow-400 hover:bg-yellow-500 border-4 border-black rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl hover:shadow-3xl transform hover:-translate-x-1"
        >
          <div className="flex items-center justify-center w-full h-full">
            <svg
              className="w-6 h-6 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
        <button
          onClick={nextStep}
          className="absolute right-8 top-1/2 -translate-y-1/2 z-10 bg-yellow-400 hover:bg-yellow-500 border-4 border-black rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl hover:shadow-3xl transform hover:translate-x-1"
        >
          <div className="flex items-center justify-center w-full h-full">
            <svg
              className="w-6 h-6 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>

        {/* Feature Content */}
        <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-4xl">
                {TUTORIAL_STEPS[currentStep].icon}
              </span>
              <h2 className="text-3xl font-bold">
                {TUTORIAL_STEPS[currentStep].title}
              </h2>
            </div>
            <p className="text-xl text-gray-700 mb-4">
              {TUTORIAL_STEPS[currentStep].description}
            </p>
            <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-yellow-800">
                {TUTORIAL_STEPS[currentStep].tip}
              </p>
            </div>
          </div>

          {/* Feature Preview */}
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              {TUTORIAL_STEPS[currentStep].preview({
                leaderboardTab,
                setLeaderboardTab,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {TUTORIAL_STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => goToStep(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentStep
                ? 'bg-yellow-500 border-2 border-black'
                : 'bg-gray-300 border-2 border-gray-400 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Get Started Button */}
      <div className="text-center mt-8">
        <button
          onClick={handleStartOnboarding}
          className="bg-green-500 hover:bg-green-600 text-white border-4 border-black rounded-lg px-8 py-3 text-xl font-bold transition-all duration-200 hover:scale-105 shadow-lg"
        >
          Get Started! 🚀
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
