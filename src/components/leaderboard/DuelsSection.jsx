import React, { useState, useEffect, useRef } from 'react';
import {
  getUserDuels,
  createDuel,
  acceptDuel,
  rejectDuel,
  recordDuelSubmission,
  autoRejectExpiredDuels,
} from '../../services/duels';
import { checkSubmissionAfterTime } from '../../services/leetcode';

const DuelsSection = ({ leaderboard = [], userData }) => {
  // State management
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [duelStarts, setDuelStarts] = useState({}); // Track when duels started for timing
  const [notifications, setNotifications] = useState([]);

  // Refs for polling intervals
  const pollingIntervals = useRef({});

  // Filter out current user from friends list
  const availableFriends = leaderboard.filter(
    user => user.username !== userData?.leetUsername
  );

  // Load duels on component mount
  useEffect(() => {
    if (userData?.leetUsername) {
      loadDuels();
    }
  }, [userData?.leetUsername]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  // Load duels from backend
  const loadDuels = async () => {
    if (!userData?.leetUsername) return;

    try {
      setLoading(true);

      // Auto-reject expired duels first
      await autoRejectExpiredDuels(userData.leetUsername);

      // Load current duels
      const userDuels = await getUserDuels(userData.leetUsername);

      // Add completed property to each duel
      const duelsWithCompletedFlag = userDuels.map(duel => ({
        ...duel,
        completed: duel.status === 'COMPLETED',
      }));

      setDuels(duelsWithCompletedFlag);
      setError('');
    } catch (err) {
      console.error('Error loading duels:', err);
      setError('Failed to load duels');
    } finally {
      setLoading(false);
    }
  };

  // Add notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Handle creating a new duel
  const handleSendChallenge = async () => {
    setError('');

    if (!selectedFriend) {
      setError('Please select a friend to challenge!');
      return;
    }

    if (!selectedDifficulty) {
      setError('Please select a problem difficulty!');
      return;
    }

    try {
      setActionLoading({ createDuel: true });

      const newDuel = await createDuel(
        userData.leetUsername,
        selectedFriend,
        selectedDifficulty
      );

      setDuels(prev => [...prev, newDuel]);
      setSelectedFriend('');
      setSelectedDifficulty('');

      addNotification(`Challenge sent to ${selectedFriend}!`, 'success');
    } catch (err) {
      console.error('Error creating duel:', err);
      setError('Failed to send challenge');
    } finally {
      setActionLoading({ createDuel: false });
    }
  };

  // Handle accepting a duel
  const handleAcceptDuel = async duelId => {
    try {
      setActionLoading({ [`accept_${duelId}`]: true });

      const updatedDuel = await acceptDuel(duelId);

      setDuels(prev =>
        prev.map(duel =>
          duel.duelId === duelId
            ? { ...updatedDuel, completed: updatedDuel.status === 'COMPLETED' }
            : duel
        )
      );

      addNotification('Duel accepted! The battle begins!', 'success');
    } catch (err) {
      console.error('Error accepting duel:', err);
      addNotification('Failed to accept duel', 'error');
    } finally {
      setActionLoading({ [`accept_${duelId}`]: false });
    }
  };

  // Handle rejecting a duel
  const handleRejectDuel = async duelId => {
    try {
      setActionLoading({ [`reject_${duelId}`]: true });

      await rejectDuel(duelId);

      setDuels(prev => prev.filter(duel => duel.duelId !== duelId));

      addNotification('Duel rejected', 'info');
    } catch (err) {
      console.error('Error rejecting duel:', err);
      addNotification('Failed to reject duel', 'error');
    } finally {
      setActionLoading({ [`reject_${duelId}`]: false });
    }
  };

  // Handle starting a duel (revealing problem and starting timer)
  const handleStartDuel = (duelId, problemSlug) => {
    const startTime = Date.now();
    setDuelStarts(prev => ({ ...prev, [duelId]: startTime }));

    addNotification(
      "Duel started! Solve the problem and we'll detect your submission automatically!",
      'success'
    );

    // Start polling for submission using real LeetCode API
    startSubmissionPolling(duelId, problemSlug, startTime);
  };

  // Start polling for LeetCode submissions using real API
  const startSubmissionPolling = (duelId, problemSlug, startTime) => {
    if (pollingIntervals.current[duelId]) {
      clearInterval(pollingIntervals.current[duelId]);
    }

    pollingIntervals.current[duelId] = setInterval(async () => {
      try {
        const submission = await checkSubmissionAfterTime(
          userData.leetUsername,
          problemSlug,
          startTime
        );

        if (submission) {
          // Found a submission! Record it
          const elapsedMs =
            new Date(submission.timestamp).getTime() - startTime;

          await recordDuelSubmission(duelId, userData.leetUsername, elapsedMs);

          // Stop polling
          clearInterval(pollingIntervals.current[duelId]);
          delete pollingIntervals.current[duelId];

          // Reload duels to get updated state
          await loadDuels();

          addNotification(
            'Submission detected and recorded! Waiting for opponent...',
            'success'
          );
        }
      } catch (error) {
        console.error('Error checking submission:', error);
      }
    }, 1000); // Poll every 1 second
  };

  // Handle manual "Solve Now" click
  const handleSolveNow = problemSlug => {
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(
        `https://leetcode.com/problems/${problemSlug}/`
      );
    } else {
      window.open(`https://leetcode.com/problems/${problemSlug}/`, '_blank');
    }
  };

  // Get time display
  const formatTime = milliseconds => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render pending duel
  const renderPendingDuel = duel => {
    const isChallenger = duel.challenger === userData.leetUsername;
    const otherUser = isChallenger ? duel.challengee : duel.challenger;
    const otherUserDisplay =
      leaderboard.find(u => u.username === otherUser)?.name || otherUser;

    return (
      <div
        key={duel.duelId}
        className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 mb-4"
        style={{ height: '85px' }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-sm" style={{ fontSize: '12px' }}>
              {isChallenger
                ? `Challenge sent to ${otherUserDisplay}`
                : `Challenge from ${otherUserDisplay} • ${duel.difficulty}`}
            </h5>
            <p className="text-gray-600" style={{ fontSize: '12px' }}>
              {isChallenger ? `${duel.difficulty} • All the best!` : ''}
            </p>
          </div>
          <span className="text-xs bg-yellow-200 px-2 py-1 rounded font-bold">
            PENDING
          </span>
        </div>

        {!isChallenger && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAcceptDuel(duel.duelId)}
              disabled={actionLoading[`accept_${duel.duelId}`]}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold btn-3d disabled:opacity-50"
            >
              {actionLoading[`accept_${duel.duelId}`] ? '⏳' : '✅'} Accept
            </button>
            <button
              onClick={() => handleRejectDuel(duel.duelId)}
              disabled={actionLoading[`reject_${duel.duelId}`]}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold btn-3d disabled:opacity-50"
            >
              {actionLoading[`reject_${duel.duelId}`] ? '⏳' : '❌'} Reject
            </button>
          </div>
        )}

        {isChallenger && (
          <div className="text-center">
            <p className="text-xs text-gray-600">Waiting for response...</p>
          </div>
        )}
      </div>
    );
  };

  // Render active duel
  const renderActiveDuel = duel => {
    const isChallenger = duel.challenger === userData.leetUsername;
    const otherUser = isChallenger ? duel.challengee : duel.challenger;
    const otherUserDisplay =
      leaderboard.find(u => u.username === otherUser)?.name || otherUser;
    const userTime = isChallenger ? duel.challengerTime : duel.challengeeTime;
    const opponentTime = isChallenger
      ? duel.challengeeTime
      : duel.challengerTime;
    const duelStarted = duelStarts[duel.duelId];
    const showProblem = duelStarted || userTime !== null;

    // Only show time if it's a valid number
    const validUserTime = typeof userTime === 'number' && !isNaN(userTime);
    const validOpponentTime =
      typeof opponentTime === 'number' && !isNaN(opponentTime);

    return (
      <div
        key={duel.duelId}
        className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-3"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-sm">Dueling {otherUserDisplay}</h5>
            <p className="text-gray-600" style={{ fontSize: '12px' }}>
              {duel.difficulty} •{' '}
              Problem Hidden
            </p>
          </div>
          <span className="text-xs bg-blue-200 px-2 py-1 rounded font-bold">
            ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="text-center">
            <div className="font-bold">You</div>
            <div className={validUserTime ? 'text-green-600' : 'text-gray-400'}>
              {validUserTime ? formatTime(userTime) : 'Not submitted'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-bold">{otherUserDisplay}</div>
            <div
              className={validOpponentTime ? 'text-green-600' : 'text-gray-400'}
            >
              {validOpponentTime ? formatTime(opponentTime) : 'Not submitted'}
            </div>
          </div>
        </div>

        {/* Show Start Duel if user's time is null and duel hasn't started for them */}
        {userTime == null && !duelStarted && (
          <button
            onClick={() => handleStartDuel(duel.duelId, duel.problemSlug)}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold btn-3d"
          >
            🚀 Start Duel
          </button>
        )}

        {/* Show Solve Now only if duelStarted is true and userTime is null */}
        {duelStarted && userTime == null && (
          <div className="space-y-2">
            <button
              onClick={() => handleSolveNow(duel.problemSlug)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold btn-3d"
            >
              💻 Solve Now
            </button>
            <div className="text-center text-xs text-gray-600">
              {pollingIntervals.current[duel.duelId]
                ? '🔍 Automatically detecting your submission...'
                : 'Click to open problem'}
            </div>
          </div>
        )}

        {validUserTime && (
          <div className="text-center">
            <p className="text-sm text-green-600 font-bold">
              ✅ You submitted in {formatTime(userTime)}
            </p>
            <p className="text-xs text-gray-600">
              {validOpponentTime
                ? 'Both submitted! Check results below.'
                : 'Waiting for opponent to finish...'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render duel with completed check
  const renderDuel = duel => {
    const isChallenger = duel.challenger === userData.leetUsername;
    const otherUser = isChallenger ? duel.challengee : duel.challenger;
    const otherUserDisplay =
      leaderboard.find(u => u.username === otherUser)?.name || otherUser;
    const userTime = isChallenger ? duel.challengerTime : duel.challengeeTime;
    const opponentTime = isChallenger
      ? duel.challengeeTime
      : duel.challengerTime;

    // Branch on duel.completed for main display logic
    if (duel.completed) {
      const won = duel.winner === userData.leetUsername;

      return (
        <div
          key={duel.duelId}
          className={`border-2 rounded-lg p-4 mb-3 ${won ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h5 className="font-bold text-sm">vs {otherUserDisplay}</h5>
              <p className="text-xs text-gray-600">
                {duel.difficulty} • {duel.problemTitle}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded font-bold ${won ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
            >
              {won ? 'WON' : 'LOST'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="text-center">
              <div className="font-bold">You</div>
              <div
                className={won ? 'text-green-600 font-bold' : 'text-red-600'}
              >
                {formatTime(userTime)}
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold">{otherUserDisplay}</div>
              <div
                className={!won ? 'text-green-600 font-bold' : 'text-red-600'}
              >
                {formatTime(opponentTime)}
              </div>
            </div>
          </div>

          {/* Disabled COMPLETED button */}
          <button
            disabled={true}
            className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded font-bold border-2 border-gray-400 cursor-not-allowed"
          >
            ✅ COMPLETED
          </button>

          {/* Winner badge and XP banner only when duel.completed === true */}
          {duel.completed && won && (
            <div className="mt-2 text-center text-xs text-orange-600 font-bold">
              +{duel.xpAwarded} XP earned!
            </div>
          )}
        </div>
      );
    }

    // Handle PENDING duels
    if (duel.status === 'PENDING') {
      return renderPendingDuel(duel);
    }

    // Handle ACTIVE duels
    if (duel.status === 'ACTIVE') {
      return renderActiveDuel(duel);
    }

    return null;
  };

  // When duels are reloaded, reset duelStarts for duels that are not started
  useEffect(() => {
    setDuelStarts(prev => {
      const newStarts = { ...prev };
      duels.forEach(duel => {
        const isChallenger = duel.challenger === userData.leetUsername;
        const userTime = isChallenger
          ? duel.challengerTime
          : duel.challengeeTime;
        if (!userTime) {
          newStarts[duel.duelId] = undefined;
        }
      });
      return newStarts;
    });
  }, [duels, userData.leetUsername]);

  if (loading) {
    return (
      <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg">
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⚔️</span>
            <h3 className="font-bold text-white text-lg">DUELS</h3>
          </div>
        </div>
        <div className="p-6 text-center text-gray-600">Loading duels...</div>
      </div>
    );
  }

  const pendingDuels = duels.filter(d => d.status === 'PENDING');
  const activeDuels = duels.filter(d => d.status === 'ACTIVE');
  const completedDuels = duels.filter(d => d.completed).slice(0, 3); // Show last 3 completed

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg h-[32rem] relative">
      {/* Notifications (fixed bar at the top) */}
      {notifications.length > 0 && (
        <div className="absolute left-0 right-0 top-0 z-20 flex flex-col items-center pointer-events-none">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`mt-2 px-3 py-1 rounded border-2 border-white shadow text-xs font-bold flex items-center gap-2 pointer-events-auto
                ${notification.type === 'success' ? 'bg-green-600 text-white' : ''}
                ${notification.type === 'error' ? 'bg-red-600 text-white' : ''}
                ${notification.type === 'info' ? 'bg-blue-600 text-white' : ''}
              `}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}
      <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">⚔️</span>
          <h3 className="font-bold text-white text-lg">DUELS</h3>
        </div>
      </div>
      <div className="p-6" style={{ height: '310px' }}>
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
              disabled={actionLoading.createDuel}
              className="w-full mt-3 bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50"
            >
              {actionLoading.createDuel ? '⏳ Sending...' : 'Send Challenge'}
            </button>
            <div className="mt-2 text-xs text-gray-600 text-center">
              💡 Win duels to earn +200 XP bonus on top of regular problem XP!
            </div>
          </div>

          {/* Active Duels & History */}
          <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">Your Duels</h4>
              <span className="text-lg">📊</span>
            </div>

            <div
              className="overflow-y-auto custom-scrollbar"
              style={{ height: '190px' }}
            >
              {/* Render all duels using the new branching logic */}
              {duels.map(renderDuel)}

              {duels.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-2xl mb-2">⚔️</div>
                  <div className="text-sm">No duels yet!</div>
                  <div className="text-xs">
                    Challenge a friend to get started
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuelsSection;
