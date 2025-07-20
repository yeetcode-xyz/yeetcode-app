import React, { useState, useEffect, useRef } from 'react';
import {
  getUserDuels,
  getRecentDuels,
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
  const [recentDuels, setRecentDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [duelStarts, setDuelStarts] = useState({}); // Track when duels started for timing
  const [notifications, setNotifications] = useState([]);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [lastWinData, setLastWinData] = useState(null);

  // Refs for polling intervals and backoff tracking
  const pollingIntervals = useRef({});
  const pollingBackoff = useRef({}); // Track backoff intervals for each duel

  // Filter out current user from friends list (case-insensitive)
  const availableFriends = leaderboard.filter(
    user => user.username !== userData?.leetUsername?.toLowerCase()
  );

  // Load duels on component mount
  useEffect(() => {
    if (userData?.leetUsername) {
      loadDuels();
      loadRecentDuels();
    }
  }, [userData?.leetUsername]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      // Clear backoff tracking
      pollingBackoff.current = {};
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

  // Load recent completed duels
  const loadRecentDuels = async () => {
    if (!userData?.leetUsername) return;

    try {
      const recentDuelsData = await getRecentDuels(userData.leetUsername);
      setRecentDuels(recentDuelsData);
    } catch (err) {
      console.error('Error loading recent duels:', err);
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

    // Initialize backoff for this duel
    pollingBackoff.current[duelId] = {
      interval: 1000, // Start with 1 second
      maxInterval: 30000, // Max 30 seconds
      attempts: 0,
    };

    const pollForSubmission = async () => {
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
          delete pollingBackoff.current[duelId];

          // Reload duels to get updated state
          await loadDuels();
          await loadRecentDuels();

          // Check if this submission completed the duel
          const updatedDuel = await getDuel(duelId);
          if (updatedDuel && updatedDuel.status === 'COMPLETED') {
            const isWinner = updatedDuel.winner === userData.leetUsername;
            if (isWinner) {
              setLastWinData({
                duelId,
                problemTitle: updatedDuel.problemTitle,
                xpAwarded: updatedDuel.xpAwarded,
                time: elapsedMs,
              });
              setShowWinMessage(true);
              setTimeout(() => setShowWinMessage(false), 5000); // Hide after 5 seconds
            }
          }

          addNotification(
            'Submission detected and recorded! Waiting for opponent...',
            'success'
          );
        } else {
          // No submission found, increase backoff interval
          const backoff = pollingBackoff.current[duelId];
          if (backoff) {
            backoff.attempts++;
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
            backoff.interval = Math.min(
              1000 * Math.pow(2, Math.floor(backoff.attempts / 3)),
              backoff.maxInterval
            );

            console.log(
              `[DUEL] Polling backoff: ${backoff.interval}ms for duel ${duelId}`
            );

            // Schedule next poll with new interval
            clearInterval(pollingIntervals.current[duelId]);
            pollingIntervals.current[duelId] = setTimeout(
              pollForSubmission,
              backoff.interval
            );
          }
        }
      } catch (error) {
        console.error('Error checking submission:', error);
        // On error, also increase backoff
        const backoff = pollingBackoff.current[duelId];
        if (backoff) {
          backoff.attempts++;
          backoff.interval = Math.min(
            backoff.interval * 2,
            backoff.maxInterval
          );

          // Schedule retry with backoff
          clearInterval(pollingIntervals.current[duelId]);
          pollingIntervals.current[duelId] = setTimeout(
            pollForSubmission,
            backoff.interval
          );
        }
      }
    };

    // Start initial poll
    pollingIntervals.current[duelId] = setTimeout(
      pollForSubmission,
      pollingBackoff.current[duelId].interval
    );
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

    // Calculate time remaining for 3-hour timeout
    const createdAt = new Date(duel.createdAt).getTime();
    const threeHoursFromCreation = createdAt + 3 * 60 * 60 * 1000;
    const timeRemaining = threeHoursFromCreation - Date.now();
    const hoursRemaining = Math.max(
      0,
      Math.floor(timeRemaining / (60 * 60 * 1000))
    );
    const minutesRemaining = Math.max(
      0,
      Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
    );

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
            {timeRemaining > 0 && (
              <p className="text-xs text-orange-600 font-bold">
                ⏰ Expires in {hoursRemaining}h {minutesRemaining}m
              </p>
            )}
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

    // Calculate time remaining for 2-hour timeout (for active duels)
    const startTime = duel.startTime
      ? new Date(duel.startTime).getTime()
      : null;
    let timeRemaining = null;
    let hoursRemaining = 0;
    let minutesRemaining = 0;

    if (startTime) {
      const twoHoursFromStart = startTime + 2 * 60 * 60 * 1000;
      timeRemaining = twoHoursFromStart - Date.now();
      hoursRemaining = Math.max(
        0,
        Math.floor(timeRemaining / (60 * 60 * 1000))
      );
      minutesRemaining = Math.max(
        0,
        Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
      );
    }

    return (
      <div
        key={duel.duelId}
        className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-3"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-sm">Dueling {otherUserDisplay}</h5>
            <p className="text-gray-600" style={{ fontSize: '12px' }}>
              {duel.difficulty} • Problem Hidden
            </p>
            {timeRemaining > 0 && (
              <p className="text-xs text-orange-600 font-bold">
                ⏰ Expires in {hoursRemaining}h {minutesRemaining}m
              </p>
            )}
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

  // Win message component
  const WinMessage = () => {
    if (!showWinMessage || !lastWinData) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 border-4 border-black rounded-xl p-8 shadow-2xl pointer-events-auto animate-bounce">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-2">VICTORY!</h2>
            <p className="text-xl text-white mb-2">
              You won the duel against {lastWinData.problemTitle}!
            </p>
            <p className="text-lg text-white mb-4">
              Time: {formatTime(lastWinData.time)}
            </p>
            <div className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold text-xl">
              +{lastWinData.xpAwarded} XP EARNED! 🎉
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper: filter out expired duels
  const filterExpiredDuels = duel => {
    const now = Date.now();
    if (duel.status === 'PENDING') {
      const createdAt = new Date(duel.createdAt).getTime();
      return now < createdAt + 3 * 60 * 60 * 1000; // 3 hours
    }
    if (duel.status === 'ACTIVE') {
      if (!duel.startTime) return true; // Defensive: if no startTime, don't filter
      const startTime = new Date(duel.startTime).getTime();
      return now < startTime + 2 * 60 * 60 * 1000; // 2 hours
    }
    return true; // Always show completed duels
  };

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

  const filteredDuels = duels.filter(filterExpiredDuels);
  const pendingDuels = filteredDuels.filter(d => d.status === 'PENDING');
  const activeDuels = filteredDuels.filter(d => d.status === 'ACTIVE');
  const completedDuels = filteredDuels
    .filter(d => d.status === 'COMPLETED')
    .slice(0, 5); // Show last 5 completed

  return (
    <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg h-[32rem] relative">
      {/* Win message overlay */}
      <WinMessage />

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
      <div className="p-6" style={{ height: '307px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Challenge Friends */}
          <div
            className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
            style={{ height: '265px' }}
          >
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
              {/* Show active and pending duels first */}
              {filteredDuels
                .filter(d => d.status === 'PENDING' || d.status === 'ACTIVE')
                .map(renderDuel)}

              {/* Show completed duels if any */}
              {completedDuels.length > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-600 mt-3 mb-2 border-b border-gray-300 pb-1">
                    RECENT COMPLETED DUELS
                  </div>
                  {completedDuels.map(duel => {
                    const isWinner = duel.winner === userData.leetUsername;
                    const otherUser =
                      duel.challenger === userData.leetUsername
                        ? duel.challengee
                        : duel.challenger;
                    const otherUserDisplay =
                      leaderboard.find(u => u.username === otherUser)?.name ||
                      otherUser;

                    return (
                      <div
                        key={duel.duelId}
                        className={`mb-2 p-2 rounded border-2 ${
                          isWinner
                            ? 'bg-green-100 border-green-400'
                            : 'bg-gray-100 border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold">
                              {isWinner ? '🏆 WIN' : '❌ LOSS'}
                            </span>
                            <span className="ml-2">vs {otherUserDisplay}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{duel.problemTitle}</div>
                            <div className="text-gray-600">
                              {duel.difficulty}
                            </div>
                            {isWinner && duel.xpAwarded && (
                              <div className="text-green-600 font-bold">
                                +{duel.xpAwarded} XP
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {filteredDuels.length === 0 && (
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
