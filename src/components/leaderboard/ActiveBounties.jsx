import React, { useState, useEffect } from 'react';

const ActiveBounties = ({ userData }) => {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBounties = async () => {
      if (!userData?.leetUsername) return;
      try {
        setLoading(true);
        const bountiesData = await window.electronAPI.getBounties(
          userData.leetUsername
        );
        setBounties(bountiesData);
        setError(null);
      } catch (err) {
        setError('Failed to load bounties');
      } finally {
        setLoading(false);
      }
    };
    loadBounties();
  }, [userData?.leetUsername]);

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

  const getBountyIcon = (type, tags) => {
    if (type === 'leetcode') {
      if (tags?.some(tag => tag.toLowerCase().includes('binary tree')))
        return '🌳';
      if (tags?.some(tag => tag.toLowerCase().includes('graph'))) return '📊';
      if (tags?.some(tag => tag.toLowerCase().includes('array'))) return '📋';
      if (tags?.some(tag => tag.toLowerCase().includes('string'))) return '📝';
      return '💻';
    }
    return '⭐';
  };

  const formatTimeRemaining = daysRemaining => {
    if (daysRemaining <= 0) return 'Expired';
    if (daysRemaining === 1) return '1 day left';
    return `${daysRemaining} days left`;
  };

  if (loading) {
    return (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⭐</span>
            <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading bounties...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⭐</span>
            <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  const activeBounties = bounties.filter(bounty => bounty.isActive);

  if (activeBounties.length === 0) {
    return (
      <div
        className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
        style={{ height: '400px' }}
      >
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⭐</span>
            <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div>No active bounties</div>
            <div className="text-sm">Check back later for new challenges!</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg flex flex-col"
      style={{ height: '400px' }}
    >
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">⭐</span>
          <h3 className="font-bold text-white text-lg">ACTIVE BOUNTIES</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ maxHeight: '320px' }}>
        {activeBounties.map(bounty => (
          <div
            key={bounty.bountyId}
            className={`flex flex-row items-start bg-white rounded-xl shadow border border-gray-200 p-4 transition-all ${bounty.progressPercent === 100 ? 'opacity-70' : ''}`}
            style={{ minHeight: '110px' }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mr-4 mt-1 text-3xl">
              {getBountyIcon(bounty.type, bounty.tags)}
            </div>
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="font-bold text-base truncate"
                    title={bounty.title}
                  >
                    {bounty.title}
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${getDifficultyColor(bounty.difficulty)} text-white`}
                  >
                    {bounty.difficulty}
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-orange-500">
                    {bounty.xp} XP
                  </span>
                </div>
              </div>
              <div
                className="text-gray-600 text-sm mt-1 mb-1 truncate"
                title={bounty.description}
              >
                {bounty.description}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">
                  {formatTimeRemaining(bounty.daysRemaining)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${bounty.progressPercent === 100 ? 'bg-green-500' : 'bg-blue-400'}`}
                    style={{ width: `${bounty.progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-700 font-mono ml-2 min-w-[40px] text-right">
                  {bounty.userProgress}/{bounty.count}
                </span>
              </div>
              {bounty.tags && bounty.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {bounty.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveBounties;
