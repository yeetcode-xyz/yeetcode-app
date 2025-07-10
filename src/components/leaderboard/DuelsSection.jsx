import React, { useState } from 'react';

const DuelsSection = ({ leaderboard = [], userData }) => {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [error, setError] = useState('');

  // Filter out current user from friends list
  const availableFriends = leaderboard.filter(
    user => user.username !== userData?.leetUsername
  );

  const handleSendChallenge = () => {
    setError('');

    if (!selectedFriend) {
      setError('Please select a friend to challenge!');
      return;
    }

    if (!selectedDifficulty) {
      setError('Please select a problem difficulty!');
      return;
    }

    // Here you would normally send the challenge via API
    alert(
      `Challenge sent to ${selectedFriend} for a ${selectedDifficulty} problem! 🎯`
    );

    // Reset form
    setSelectedFriend('');
    setSelectedDifficulty('');
  };

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">⚔️</span>
          <h3 className="font-bold text-white text-lg">DUELS</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Challenge Friends */}
          <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">Challenge Friend</h4>
              <span className="text-lg">🎯</span>
            </div>
            <div className="space-y-3">
              <select
                className="w-full p-2 border-2 border-black rounded-lg font-medium"
                value={selectedFriend}
                onChange={e => setSelectedFriend(e.target.value)}
              >
                <option value="">Select a friend...</option>
                {availableFriends.length > 0 ? (
                  availableFriends.map(friend => (
                    <option key={friend.username} value={friend.username}>
                      {friend.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No friends in group yet</option>
                )}
              </select>
              <select
                className="w-full p-2 border-2 border-black rounded-lg font-medium"
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
              >
                <option value="">Problem difficulty...</option>
                <option value="Easy">
                  Easy (100 XP + 200 bonus if you win)
                </option>
                <option value="Medium">
                  Medium (300 XP + 200 bonus if you win)
                </option>
                <option value="Hard">
                  Hard (500 XP + 200 bonus if you win)
                </option>
                <option value="Random">
                  Random (? XP + 200 bonus if you win)
                </option>
              </select>
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleSendChallenge}
              className="w-full mt-3 bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold btn-3d"
            >
              Send Challenge
            </button>
            <div className="mt-2 text-xs text-gray-600 text-center">
              💡 Win duels to earn +200 XP bonus on top of regular problem XP!
            </div>
          </div>

          {/* Duel History */}
          <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">Recent Duels</h4>
              <span className="text-lg">📊</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 border border-green-300 rounded">
                <span className="font-medium text-sm">vs Sarah (Medium)</span>
                <div className="text-right">
                  <span className="text-green-600 font-bold text-xs">WON</span>
                  <div className="text-xs text-orange-500">
                    +500 XP (300+200)
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 border border-red-300 rounded">
                <span className="font-medium text-sm">vs Alex (Hard)</span>
                <div className="text-right">
                  <span className="text-red-600 font-bold text-xs">LOST</span>
                  <div className="text-xs text-gray-500">
                    +500 XP (problem only)
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 border border-green-300 rounded">
                <span className="font-medium text-sm">vs John (Easy)</span>
                <div className="text-right">
                  <span className="text-green-600 font-bold text-xs">WON</span>
                  <div className="text-xs text-orange-500">
                    +300 XP (100+200)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuelsSection;
