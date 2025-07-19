import React, { useState } from 'react';
import { useAnalytics } from '../../utils/analytics';
import RandomProblemModal from './RandomProblemModal';

const QuickActions = ({ groupData, handleLogout }) => {
  const analytics = useAnalytics();
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const getInviteMessage = () => {
    return `🚀 Join my YeetCode group and let's compete on LeetCode problems!\n\nGroup ID: ${groupData?.code}\n\nDownload YeetCode: https://yeetcode-website.vercel.app/\n\nLet's see who can solve more problems! 💻⚡`;
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(getInviteMessage());
    alert('Invite message copied to clipboard! 📋');
    analytics.trackFeatureUsed('invite_copied', {
      group_code: groupData?.code,
    });
    setShowInviteOptions(false);
  };

  const handleShareWhatsApp = async () => {
    const message = encodeURIComponent(getInviteMessage());
    if (window.electronAPI?.openExternalUrl) {
      await window.electronAPI.openExternalUrl(
        `https://wa.me/?text=${message}`
      );
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
    analytics.trackFeatureUsed('invite_shared_whatsapp', {
      group_code: groupData?.code,
    });
    setShowInviteOptions(false);
  };

  const handleShareTelegram = async () => {
    const message = encodeURIComponent(getInviteMessage());
    if (window.electronAPI?.openExternalUrl) {
      await window.electronAPI.openExternalUrl(
        `https://t.me/share/url?text=${message}`
      );
    } else {
      window.open(`https://t.me/share/url?text=${message}`, '_blank');
    }
    analytics.trackFeatureUsed('invite_shared_telegram', {
      group_code: groupData?.code,
    });
    setShowInviteOptions(false);
  };

  const handleShareDiscord = () => {
    navigator.clipboard.writeText(getInviteMessage());
    alert('Message copied! Paste it in your Discord channel 🎮');
    analytics.trackFeatureUsed('invite_shared_discord', {
      group_code: groupData?.code,
    });
    setShowInviteOptions(false);
  };

  const handleShareEmail = async () => {
    const subject = encodeURIComponent('Join my YeetCode group!');
    const body = encodeURIComponent(getInviteMessage());
    if (window.electronAPI?.openExternalUrl) {
      await window.electronAPI.openExternalUrl(
        `mailto:?subject=${subject}&body=${body}`
      );
    } else {
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    }
    analytics.trackFeatureUsed('invite_shared_email', {
      group_code: groupData?.code,
    });
    setShowInviteOptions(false);
  };

  const fetchRandomProblem = async () => {
    const difficulties = ['EASY', 'MEDIUM', 'HARD'];
    const randomDifficulty =
      difficulties[Math.floor(Math.random() * difficulties.length)];

    // Use electron API - no fallbacks
    if (window.electronAPI?.fetchRandomProblem) {
      console.log('Fetching random problem from LeetCode API...');
      const problem =
        await window.electronAPI.fetchRandomProblem(randomDifficulty);
      return problem;
    } else {
      throw new Error(
        'Electron API not available - random problems only work in the desktop app'
      );
    }
  };

  const handleRandomProblem = async () => {
    setLoadingProblem(true);

    try {
      const randomProblem = await fetchRandomProblem();

      // Track random problem generation
      analytics.trackRandomProblemGenerated(
        randomProblem.difficulty,
        randomProblem.topicTags?.[0]?.name || 'Unknown'
      );

      setSelectedProblem(randomProblem);
      setShowProblemModal(true);
    } catch (error) {
      console.error('Failed to fetch random problem:', error);
      alert(
        `❌ Failed to fetch random problem!\n\n${error.message}\n\nPlease check your internet connection and try again.`
      );
    } finally {
      setLoadingProblem(false);
    }
  };

  const handleConfirmProblem = async () => {
    if (selectedProblem) {
      // Track when user opens random problem
      analytics.trackFeatureUsed('random_problem_opened', {
        problem_title: selectedProblem.title,
        difficulty: selectedProblem.difficulty,
      });

      const leetcodeUrl = `https://leetcode.com/problems/${selectedProblem.titleSlug}/`;
      if (window.electronAPI?.openExternalUrl) {
        await window.electronAPI.openExternalUrl(leetcodeUrl);
      } else {
        window.open(leetcodeUrl, '_blank');
      }
      setShowProblemModal(false);
      setSelectedProblem(null);
    }
  };

  const handleCloseProblemModal = () => {
    setShowProblemModal(false);
    setSelectedProblem(null);
  };

  const handleInviteFriend = () => {
    if (!groupData?.code) {
      alert('No group code available to share.');
      return;
    }
    setShowInviteOptions(true);
  };

  return (
    <>
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
        style={{ height: '285px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h3 className="font-bold text-white text-lg">QUICK ACTIONS</h3>
          </div>
        </div>
        <div className="p-6 space-y-4 flex-1">
          {!showInviteOptions ? (
            <>
              <button
                onClick={handleInviteFriend}
                className="w-full bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d"
              >
                <span>👥</span>
                INVITE FRIEND
              </button>
              <button
                onClick={handleRandomProblem}
                disabled={loadingProblem}
                className={`w-full ${loadingProblem ? 'bg-gray-300' : 'bg-yellow-200 hover:bg-yellow-400'} text-black px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d`}
              >
                <span>{loadingProblem ? '⏳' : '🎯'}</span>
                {loadingProblem ? 'LOADING...' : 'RANDOM PROBLEM'}
              </button>
              {/* Logout button at the bottom */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg border-2 border-black font-bold flex items-center justify-center gap-2 btn-3d shadow"
              >
                <span>🚪</span>
                LOG OUT
              </button>
            </>
          ) : (
            <div className="space-y-3 flex flex-col">
              <button
                onClick={() => setShowInviteOptions(false)}
                className="w-full bg-red-200 hover:bg-red-300 text-black px-4 py-1 rounded border border-black font-bold text-xs"
              >
                ← BACK
              </button>
              <div className="text-center mb-3">
                <h4 className="font-bold text-sm mb-1">
                  Share Group: {groupData.code}
                </h4>
                <p className="text-xs text-gray-600">
                  Choose how to invite friends:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-green-400 hover:bg-green-500 text-white px-4 py-2 rounded border-2 border-black font-bold text-xs btn-3d flex items-center justify-center gap-1"
                >
                  📱 WhatsApp
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded border-2 border-black font-bold text-xs btn-3d flex items-center justify-center gap-1"
                >
                  ✈️ Telegram
                </button>
                <button
                  onClick={handleShareDiscord}
                  className="bg-purple-400 hover:bg-purple-500 text-white px-4 py-2 rounded border-2 border-black font-bold text-xs btn-3d flex items-center justify-center gap-1"
                >
                  🎮 Discord
                </button>
                <button
                  onClick={handleShareEmail}
                  className="bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded border-2 border-black font-bold text-xs btn-3d flex items-center justify-center gap-1"
                >
                  📧 Email
                </button>
              </div>

              <button
                onClick={handleCopyInvite}
                className="w-full bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 rounded-lg border-2 border-black font-bold text-xs btn-3d"
              >
                📋 COPY MESSAGE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Random Problem Modal */}
      <RandomProblemModal
        isOpen={showProblemModal}
        onClose={handleCloseProblemModal}
        problem={selectedProblem}
        onConfirm={handleConfirmProblem}
      />
    </>
  );
};

export default QuickActions;
