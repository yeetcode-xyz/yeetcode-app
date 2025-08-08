import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import SearchableDropdown from '../SearchableDropdown';
import {
  getUserDuels,
  getRecentDuels,
  createDuel,
  acceptDuel,
  startDuel,
  rejectDuel,
  recordDuelSubmission,
} from '../../services/duels';

const DuelsSection = forwardRef(({ leaderboard = [], userData }, ref) => {
  // Normalize username to lowercase for consistent comparisons
  const normalizedCurrentUser = userData?.leetUsername?.toLowerCase();

  // State management
  const [duels, setDuels] = useState([]);
  const [recentDuels, setRecentDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [lastWinData, setLastWinData] = useState(null);

  // Refs for component management
  const loadingRef = useRef(false); // Prevent duplicate calls
  const previousDuelsRef = useRef([]); // Track previous duels for notifications

  // Filter out current user from friends list (case-insensitive)
  const availableFriends = leaderboard.filter(
    user => user.username !== normalizedCurrentUser
  );

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshDuels: () => {
      if (normalizedCurrentUser) {
        loadDuels();
        loadRecentDuels();
      }
    },
  }));

  // Load duels on component mount (initial load only)
  useEffect(() => {
    if (normalizedCurrentUser) {
      loadDuels();
      loadRecentDuels();
    }
  }, [normalizedCurrentUser]);

  // Load duels from backend
  const loadDuels = async () => {
    if (!normalizedCurrentUser || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      // Load current duels
      const userDuels = await getUserDuels(normalizedCurrentUser);

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
      loadingRef.current = false;
    }
  };

  // Load recent completed duels
  const loadRecentDuels = async () => {
    if (!normalizedCurrentUser) return;

    try {
      const recentDuelsData = await getRecentDuels(normalizedCurrentUser);
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
        normalizedCurrentUser,
        selectedFriend,
        selectedDifficulty
      );

      // Refresh duels list to get complete duel data from backend
      await loadDuels();

      setSelectedFriend('');
      setSelectedDifficulty('');

      addNotification(`Challenge sent to ${selectedFriend}!`, 'success');
      if (window.electronAPI?.notifyDuelEvent) {
        window.electronAPI.notifyDuelEvent({
          type: 'sent',
          opponent: selectedFriend,
        });
      }
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

      await acceptDuel(duelId, normalizedCurrentUser);

      // Refresh duels to get the updated data
      await loadDuels();

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

  // Clean up expired duels manually (only when needed)
  const cleanupExpiredDuels = async () => {
    try {
      const expiredDuels = duels.filter(duel => {
        if (duel.status === 'PENDING') {
          const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
          return new Date(duel.createdAt).getTime() < threeHoursAgo;
        } else if (duel.status === 'ACTIVE') {
          const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
          return (
            duel.startTime && new Date(duel.startTime).getTime() < twoHoursAgo
          );
        }
        return false;
      });

      for (const duel of expiredDuels) {
        try {
          await rejectDuel(duel.duelId);
        } catch (error) {
          console.error(
            `[DUEL] Failed to cleanup expired duel ${duel.duelId}:`,
            error
          );
        }
      }

      if (expiredDuels.length > 0) {
        await loadDuels(); // Reload to reflect changes
      }
    } catch (err) {
      console.error('Error cleaning up expired duels:', err);
    }
  };

  // Handle starting a duel (revealing problem and starting timer)
  const handleStartDuel = async duelId => {
    try {
      await startDuel(duelId, normalizedCurrentUser);

      addNotification(
        "Duel started! Solve the problem - we'll check your progress automatically!",
        'success'
      );

      // Refresh duels to get updated state
      loadDuels();
    } catch (error) {
      console.error('Failed to start duel:', error);
      addNotification('Failed to start duel. Please try again.', 'error');
    }
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
    const isChallenger = duel.challenger === normalizedCurrentUser;
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
        style={{ height: isChallenger ? '85px' : '95px' }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-sm" style={{ fontSize: '12px' }}>
              {isChallenger
                ? `Challenge sent to ${otherUserDisplay}`
                : `Challenge from ${otherUserDisplay} • ${duel.difficulty || 'Unknown'}`}
            </h5>
            <p className="text-gray-600" style={{ fontSize: '12px' }}>
              {isChallenger
                ? `${duel.difficulty || 'Unknown'} • All the best!`
                : ''}
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
    const isChallenger = duel.challenger === normalizedCurrentUser;
    const otherUser = isChallenger ? duel.challengee : duel.challenger;
    const otherUserDisplay =
      leaderboard.find(u => u.username === otherUser)?.name || otherUser;
    const userTime = isChallenger ? duel.challengerTime : duel.challengeeTime;
    const opponentTime = isChallenger
      ? duel.challengeeTime
      : duel.challengerTime;

    // New state logic:
    // -1: User hasn't started yet
    // 0: User clicked "Start Duel" but hasn't finished
    // >0: User finished with completion time
    const userNotStarted = userTime === -1;
    const userStarted = userTime === 0;
    const userCompleted = userTime > 0;
    const showProblem = userStarted || userCompleted;

    // Only show time if it's a completion time (>0)
    const validUserTime = typeof userTime === 'number' && userTime > 0;
    const validOpponentTime =
      typeof opponentTime === 'number' && opponentTime > 0;

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
              {duel.difficulty || 'Unknown'} • Problem Hidden
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
            <div
              className={
                validUserTime
                  ? 'text-green-600'
                  : userStarted
                    ? 'text-blue-600'
                    : 'text-gray-400'
              }
            >
              {validUserTime
                ? formatTime(userTime)
                : userStarted
                  ? '⏱️ Solving...'
                  : userNotStarted
                    ? 'Not started'
                    : 'Not submitted'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-bold">{otherUserDisplay}</div>
            <div
              className={
                validOpponentTime
                  ? 'text-green-600'
                  : opponentTime === 0
                    ? 'text-blue-600'
                    : 'text-gray-400'
              }
            >
              {validOpponentTime
                ? formatTime(opponentTime)
                : opponentTime === 0
                  ? '⏱️ Solving...'
                  : opponentTime === -1
                    ? 'Not started'
                    : 'Not submitted'}
            </div>
          </div>
        </div>

        {/* Show Start Duel if user hasn't started yet */}
        {userNotStarted && (
          <button
            onClick={() => handleStartDuel(duel.duelId)}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold btn-3d"
          >
            🚀 Start Duel
          </button>
        )}

        {/* Show Solve Now if user started but hasn't completed */}
        {userStarted && (
          <div className="space-y-2">
            <button
              onClick={() => handleSolveNow(duel.problemSlug)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold btn-3d"
            >
              💻 Solve Now
            </button>
            <div className="text-center text-xs text-gray-600">
              Click to open problem
            </div>
            <div className="text-center text-xs text-blue-600 font-medium">
              ⏱️ Solving in progress...
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
    const isChallenger = duel.challenger === normalizedCurrentUser;
    const otherUser = isChallenger ? duel.challengee : duel.challenger;
    const otherUserDisplay =
      leaderboard.find(u => u.username === otherUser)?.name || otherUser;
    const userTime = isChallenger ? duel.challengerTime : duel.challengeeTime;
    const opponentTime = isChallenger
      ? duel.challengeeTime
      : duel.challengerTime;

    // Branch on duel.completed for main display logic
    if (duel.completed) {
      const won = duel.winner === normalizedCurrentUser;

      return (
        <div
          key={duel.duelId}
          className={`border-2 rounded-lg p-4 mb-3 ${won ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h5 className="font-bold text-sm">vs {otherUserDisplay}</h5>
              <p className="text-xs text-gray-600">
                {duel.difficulty || 'Unknown'} •{' '}
                {duel.problemTitle || 'Unknown Problem'}
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

    // Handle PENDING duels (not yet accepted)
    if (duel.status === 'PENDING') {
      return renderPendingDuel(duel);
    }

    // Handle ACCEPTED duels (accepted but not started - shows Start Duel button)
    if (duel.status === 'ACCEPTED' || duel.status === 'ACTIVE') {
      return renderActiveDuel(duel);
    }

    return null;
  };

  // Detect new incoming duels and send system notification
  useEffect(() => {
    if (!normalizedCurrentUser) return;
    const prevDuels = previousDuelsRef.current;
    const newDuels = duels.filter(
      duel =>
        duel.status === 'PENDING' &&
        duel.challengee === normalizedCurrentUser &&
        !prevDuels.some(prev => prev.duelId === duel.duelId)
    );
    if (newDuels.length > 0 && window.electronAPI?.notifyDuelEvent) {
      newDuels.forEach(duel => {
        window.electronAPI.notifyDuelEvent({
          type: 'received',
          opponent: duel.challenger,
          problemTitle: duel.problemTitle,
        });
      });
    }
    previousDuelsRef.current = duels;
  }, [duels, normalizedCurrentUser]);

  // Win message component
  const WinMessage = () => {
    if (!showWinMessage || !lastWinData) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 border-4 border-black rounded-xl p-8 shadow-2xl pointer-events-auto">
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
              +{lastWinData.xpAwarded} XP EARNED!
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper: filter out expired duels
  const filterExpiredDuels = duel => {
    const now = Date.now();
    if (duel.status === 'PENDING' || duel.status === 'ACCEPTED') {
      // Handle both old (no Z) and new (with Z) timestamp formats
      const createdAtStr =
        duel.createdAt.includes('Z') || duel.createdAt.includes('+')
          ? duel.createdAt
          : duel.createdAt + 'Z';
      const createdAt = new Date(createdAtStr).getTime();
      // Check if the date is valid
      if (isNaN(createdAt)) {
        return true; // Keep duel if we can't parse the date
      }
      const expiryTime = createdAt + 3 * 60 * 60 * 1000;
      const isExpired = now >= expiryTime;
      return !isExpired; // Keep if not expired
    }
    if (duel.status === 'ACTIVE') {
      if (!duel.startTime) return true; // Defensive: if no startTime, don't filter
      // Handle both old (no Z) and new (with Z) timestamp formats
      const startTimeStr =
        duel.startTime.includes('Z') || duel.startTime.includes('+')
          ? duel.startTime
          : duel.startTime + 'Z';
      const startTime = new Date(startTimeStr).getTime();
      if (isNaN(startTime)) {
        return true; // Keep duel if we can't parse the date
      }
      return now < startTime + 2 * 60 * 60 * 1000; // 2 hours
    }
    return true; // Always show completed duels
  };

  if (loading) {
    return (
      <div className="bg-yellow-100 border-4 border-black rounded-xl overflow-hidden shadow-lg h-[32rem] relative">
        <div className="bg-blue-500 px-6 py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">⚔️</span>
            <h3 className="font-bold text-white text-lg">DUELS</h3>
          </div>
        </div>
        <div className="p-6" style={{ height: '313px' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div
              className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
              style={{ height: '265px' }}
            >
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="h-9 bg-gray-200 rounded w-full mt-3"></div>
            </div>
            <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div
                className="space-y-2 overflow-hidden"
                style={{ height: '190px' }}
              >
                <div className="h-14 bg-gray-200 rounded"></div>
                <div className="h-14 bg-gray-200 rounded"></div>
                <div className="h-14 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredDuels = duels.filter(filterExpiredDuels);
  const pendingDuels = filteredDuels.filter(d => d.status === 'PENDING');
  const activeDuels = filteredDuels.filter(d => d.status === 'ACTIVE');

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
      <div className="p-6" style={{ height: '313px' }}>
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
              <SearchableDropdown
                options={availableFriends.map(friend => ({
                  value: friend.username,
                  label: friend.name,
                }))}
                value={selectedFriend}
                onChange={value => setSelectedFriend(value)}
                placeholder={
                  availableFriends.length > 0
                    ? 'Select a friend...'
                    : 'No friends in group yet'
                }
                disabled={availableFriends.length === 0}
                className="font-medium"
                compact={true}
              />
              <SearchableDropdown
                options={[
                  {
                    value: 'Easy',
                    label: 'Easy (100 XP + 200 bonus if you win)',
                  },
                  {
                    value: 'Medium',
                    label: 'Medium (300 XP + 200 bonus if you win)',
                  },
                  {
                    value: 'Hard',
                    label: 'Hard (500 XP + 200 bonus if you win)',
                  },
                  {
                    value: 'Random',
                    label: 'Random (? XP + 200 bonus if you win)',
                  },
                ]}
                value={selectedDifficulty}
                onChange={value => setSelectedDifficulty(value)}
                placeholder="Problem difficulty..."
                className="font-medium"
                compact={true}
              />
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
                .filter(
                  d =>
                    d.status === 'PENDING' ||
                    d.status === 'ACCEPTED' ||
                    d.status === 'ACTIVE'
                )
                .map(renderDuel)}

              {/* Show completed duels if any */}
              {recentDuels.length > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-600 mt-3 mb-2 border-b border-gray-300 pb-1">
                    RECENT COMPLETED DUELS
                  </div>
                  {/* Show only recent duels from API */}
                  {recentDuels.map(duel => {
                    const isWinner = duel.winner === normalizedCurrentUser;
                    const otherUser =
                      duel.challenger === normalizedCurrentUser
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
});

export default DuelsSection;
