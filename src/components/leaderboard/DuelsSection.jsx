import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchableDropdown from '../SearchableDropdown';
import {
  getUserDuels,
  getRecentDuels,
  createDuel,
  acceptDuel,
  startDuel,
  rejectDuel,
  recordDuelSubmission,
  searchUser,
  sendInvite,
  generateDuelLink,
} from '../../services/duels';
import { fetchRecentSubmissions } from '../../services/leetcode';

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

  // Main tab state - 3 tabs like leaderboard
  const [mainTab, setMainTab] = useState('normal'); // 'normal', 'wager', or 'history'

  // History sorting state
  const [historySortBy, setHistorySortBy] = useState('recent'); // 'recent', 'oldest', 'wins', 'losses'

  // Wager duel state
  const [wagerAmount, setWagerAmount] = useState('');
  const [acceptingWager, setAcceptingWager] = useState({}); // Map of duelId -> wager amount being entered

  // Email invite state
  const [inviteEmail, setInviteEmail] = useState('');

  // "Anyone" mode state
  const [duelMode, setDuelMode] = useState('group'); // 'group' or 'anyone'
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null); // {exists_on_yeetcode: bool, exists_on_leetcode: bool}
  const [searching, setSearching] = useState(false);

  // Duel link generation state
  const [generatedLink, setGeneratedLink] = useState(null); // {invite_url, token, expires_at}
  const [generatingLink, setGeneratingLink] = useState(false);

  // Refs for component management
  const loadingRef = useRef(false); // Prevent duplicate calls
  const previousDuelsRef = useRef([]); // Track previous duels for notifications
  const pollingIntervalsRef = useRef(new Map()); // Track polling intervals for each duel

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

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all polling intervals when component unmounts
      pollingIntervalsRef.current.forEach((interval, duelId) => {
        console.log(`[POLLING] Cleaning up polling for duel ${duelId}`);
        clearInterval(interval);
      });
      pollingIntervalsRef.current.clear();
    };
  }, []);

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

      // Start polling for any active duels
      duelsWithCompletedFlag.forEach(duel => {
        if (
          duel.status === 'ACTIVE' &&
          !pollingIntervalsRef.current.has(duel.duelId)
        ) {
          console.log(
            `[POLLING] Resuming polling for active duel ${duel.duelId}`
          );
          startDuelPolling(duel.duelId);
        }
      });

      // Return the fresh duels for use in polling
      return duelsWithCompletedFlag;
    } catch (err) {
      console.error('Error loading duels:', err);
      setError('Failed to load duels');
      return [];
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

  // Handle generating a duel invite link
  const handleGenerateLink = async () => {
    if (!selectedDifficulty) {
      setError('Please select a problem difficulty first!');
      return;
    }

    setError('');
    setGeneratingLink(true);

    try {
      const isWager = mainTab === 'wager';
      const wagerNum = isWager ? parseInt(wagerAmount) : null;

      // Validate wager amount for wager duels
      if (isWager) {
        if (!wagerAmount || isNaN(wagerNum) || wagerNum < 25) {
          setError('Wager amount must be at least 25 XP!');
          setGeneratingLink(false);
          return;
        }

        // Check if challenger has enough XP
        const currentUserData = leaderboard.find(
          u => u.username === normalizedCurrentUser
        );
        const currentUserXP = currentUserData?.xp || 0;
        if (currentUserXP < wagerNum) {
          setError(
            `You don't have enough XP! (Have: ${currentUserXP}, Need: ${wagerNum})`
          );
          setGeneratingLink(false);
          return;
        }
      }

      const result = await generateDuelLink(
        normalizedCurrentUser,
        selectedDifficulty,
        isWager,
        wagerNum
      );

      setGeneratedLink(result);
      addNotification('Duel link generated! Copy and share it.', 'success');
    } catch (err) {
      console.error('Error generating link:', err);
      setError(err.message || 'Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    if (!generatedLink?.invite_url) return;

    try {
      await navigator.clipboard.writeText(generatedLink.invite_url);
      addNotification('Link copied to clipboard!', 'success');
    } catch (err) {
      console.error('Error copying link:', err);
      setError('Failed to copy link. Please copy manually.');
    }
  };

  // Handle searching for a user
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) {
      setError('Please enter a username to search!');
      return;
    }

    setError('');
    setSearching(true);
    setSearchResult(null);

    try {
      const result = await searchUser(searchUsername.trim());
      setSearchResult(result);

      if (result.exists_on_yeetcode) {
        // User found on YeetCode, proceed with normal duel creation
        setSelectedFriend(searchUsername.trim().toLowerCase());
      } else if (!result.exists_on_leetcode) {
        setError('Username not found on LeetCode');
      }
      // If exists on LeetCode but not YeetCode, show email input (handled in UI)
    } catch (err) {
      console.error('Error searching user:', err);
      setError(err.message || 'Failed to search user');
    } finally {
      setSearching(false);
    }
  };

  // Handle creating a new duel
  const handleSendChallenge = async () => {
    setError('');

    // Handle "Anyone" mode
    if (duelMode === 'anyone') {
      // If user is on YeetCode, proceed with normal duel
      if (searchResult?.exists_on_yeetcode && searchUsername) {
        if (!selectedDifficulty) {
          setError('Please select a problem difficulty!');
          return;
        }

        // Disable wager duels for invites
        if (mainTab === 'wager') {
          setError(
            'Wager duels are only available for users already on YeetCode'
          );
          return;
        }

        try {
          setActionLoading({ createDuel: true });

          const opponentUsername = searchUsername.trim().toLowerCase();
          const newDuel = await createDuel(
            normalizedCurrentUser,
            opponentUsername,
            selectedDifficulty,
            false,
            null
          );

          await loadDuels();

          setSelectedFriend('');
          setSearchUsername('');
          setSearchResult(null);
          setSelectedDifficulty('');

          addNotification(`Challenge sent to ${opponentUsername}!`, 'success');
          if (window.electronAPI?.notifyDuelEvent) {
            window.electronAPI.notifyDuelEvent({
              type: 'sent',
              opponent: opponentUsername,
            });
          }
        } catch (err) {
          console.error('Error creating duel:', err);
          setError(err.message || 'Failed to send challenge');
        } finally {
          setActionLoading({ createDuel: false });
        }
        return;
      }

      // If user exists on LeetCode but not YeetCode, send invite
      if (
        searchResult?.exists_on_leetcode &&
        !searchResult?.exists_on_yeetcode
      ) {
        if (!inviteEmail.trim()) {
          setError('Please enter an email address to invite this user!');
          return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteEmail)) {
          setError('Please enter a valid email address!');
          return;
        }

        // Disable wager duels for invites
        if (mainTab === 'wager') {
          setError(
            'Wager duels are only available for users already on YeetCode'
          );
          return;
        }

        try {
          setActionLoading({ sendInvite: true });

          await sendInvite(
            normalizedCurrentUser,
            searchUsername.trim(),
            inviteEmail.trim()
          );

          setInviteEmail('');
          setSearchUsername('');
          setSearchResult(null);
          setSelectedDifficulty('');

          addNotification(
            `Invite sent to ${inviteEmail}! They'll receive an email to join YeetCode.`,
            'success'
          );
        } catch (err) {
          console.error('Error sending invite:', err);
          setError(err.message || 'Failed to send invite');
        } finally {
          setActionLoading({ sendInvite: false });
        }
        return;
      }

      // If no search result yet, prompt to search
      if (!searchResult) {
        setError('Please search for a user first!');
        return;
      }

      return;
    }

    // Regular group member challenge flow
    if (!selectedFriend) {
      setError('Please select a friend to challenge!');
      return;
    }

    if (!selectedDifficulty) {
      setError('Please select a problem difficulty!');
      return;
    }

    // Validate wager amount for wager duels
    if (mainTab === 'wager') {
      const wagerNum = parseInt(wagerAmount);
      if (!wagerAmount || isNaN(wagerNum) || wagerNum < 25) {
        setError('Wager amount must be at least 25 XP!');
        return;
      }

      // Check if challenger has enough XP
      const currentUserData = leaderboard.find(
        u => u.username === normalizedCurrentUser
      );
      const currentUserXP = currentUserData?.xp || 0;
      if (currentUserXP < wagerNum) {
        setError(
          `You don't have enough XP! (Have: ${currentUserXP}, Need: ${wagerNum})`
        );
        return;
      }
    }

    try {
      setActionLoading({ createDuel: true });

      const isWagerDuel = mainTab === 'wager';
      const wagerNum = isWagerDuel ? parseInt(wagerAmount) : null;

      const newDuel = await createDuel(
        normalizedCurrentUser,
        selectedFriend,
        selectedDifficulty,
        isWagerDuel,
        wagerNum
      );

      // Refresh duels list to get complete duel data from backend
      await loadDuels();

      setSelectedFriend('');
      setSelectedDifficulty('');
      setWagerAmount('');

      const wagerText = isWagerDuel ? ` (${wagerNum} XP wager)` : '';
      addNotification(
        `Challenge sent to ${selectedFriend}${wagerText}!`,
        'success'
      );
      if (window.electronAPI?.notifyDuelEvent) {
        window.electronAPI.notifyDuelEvent({
          type: 'sent',
          opponent: selectedFriend,
        });
      }
    } catch (err) {
      console.error('Error creating duel:', err);
      setError(err.message || 'Failed to send challenge');
    } finally {
      setActionLoading({ createDuel: false });
    }
  };

  // Handle accepting a duel
  const handleAcceptDuel = async (duelId, duel) => {
    try {
      setActionLoading({ [`accept_${duelId}`]: true });

      // Check if this is a wager duel and validate opponent's wager
      let opponentWager = null;
      if (duel.isWager) {
        const enteredWager = acceptingWager[duelId];
        const wagerNum = parseInt(enteredWager);

        if (!enteredWager || isNaN(wagerNum)) {
          addNotification('Please enter your wager amount!', 'error');
          setActionLoading({ [`accept_${duelId}`]: false });
          return;
        }

        const challengerWager = duel.wagerAmount || duel.challengerWager || 0;
        const minWager = Math.max(25, Math.floor(challengerWager * 0.75));

        if (wagerNum < minWager) {
          addNotification(
            `Wager must be at least ${minWager} XP (75% of challenger's ${challengerWager} XP)!`,
            'error'
          );
          setActionLoading({ [`accept_${duelId}`]: false });
          return;
        }

        // Check if opponent has enough XP
        const currentUserData = leaderboard.find(
          u => u.username === normalizedCurrentUser
        );
        const currentUserXP = currentUserData?.xp || 0;
        if (currentUserXP < wagerNum) {
          addNotification(
            `You don't have enough XP! (Have: ${currentUserXP}, Need: ${wagerNum})`,
            'error'
          );
          setActionLoading({ [`accept_${duelId}`]: false });
          return;
        }

        opponentWager = wagerNum;
      }

      await acceptDuel(duelId, normalizedCurrentUser, opponentWager);

      // Start polling for both participants immediately after acceptance
      startDuelPolling(duelId);

      // Refresh duels to get the updated data
      await loadDuels();

      // Clear the accepting wager state for this duel
      setAcceptingWager(prev => {
        const updated = { ...prev };
        delete updated[duelId];
        return updated;
      });

      const wagerText = opponentWager ? ` (wagering ${opponentWager} XP)` : '';
      addNotification(
        `Duel accepted${wagerText}! The battle begins! We'll track your progress automatically.`,
        'success'
      );
    } catch (err) {
      console.error('Error accepting duel:', err);
      addNotification(err.message || 'Failed to accept duel', 'error');
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

      // Start polling for both participants immediately
      startDuelPolling(duelId);

      // Refresh duels to get updated state
      loadDuels();
    } catch (error) {
      console.error('Failed to start duel:', error);
      addNotification('Failed to start duel. Please try again.', 'error');
    }
  };

  // Start polling LeetCode submissions for both participants
  const startDuelPolling = async duelId => {
    try {
      // Find the duel to get participant info
      const duel = duels.find(d => d.duelId === duelId);
      if (!duel) return;

      // Clear any existing polling for this duel
      if (pollingIntervalsRef.current.has(duelId)) {
        clearInterval(pollingIntervalsRef.current.get(duelId));
      }

      const challenger = duel.challenger;
      const challengee = duel.challengee;
      const problemSlug = duel.problemSlug;
      let duelCompleted = false;

      console.log(
        `[POLLING] Starting LeetCode submission polling for duel ${duelId}, problem: ${problemSlug}`
      );

      // Track which users have already submitted to prevent duplicate recordings
      const submittedUsers = new Set();

      // Start polling every 5 seconds for both participants
      const pollingInterval = setInterval(async () => {
        if (duelCompleted) {
          clearInterval(pollingInterval);
          pollingIntervalsRef.current.delete(duelId);
          return;
        }

        try {
          // Check submissions for both challenger and challengee
          const results = await Promise.all([
            checkLeetCodeSubmission(
              duelId,
              challenger,
              problemSlug,
              submittedUsers
            ),
            checkLeetCodeSubmission(
              duelId,
              challengee,
              problemSlug,
              submittedUsers
            ),
          ]);

          // Check if any result indicates the duel is completed
          if (results.some(r => r.duelCompleted)) {
            duelCompleted = true;
            console.log(
              `[POLLING] Duel ${duelId} already completed, stopping polling`
            );
            clearInterval(pollingInterval);
            pollingIntervalsRef.current.delete(duelId);
            return;
          }

          // Only refresh if a submission was detected
          if (results.some(r => r.submitted)) {
            console.log(
              `[POLLING] Submission detected, refreshing duel ${duelId}`
            );
            const freshDuels = await loadDuels();

            // Check if duel is now completed after refresh using fresh data
            const updatedDuel = freshDuels?.find(d => d.duelId === duelId);
            if (
              updatedDuel &&
              ['COMPLETED', 'TIMEOUT'].includes(updatedDuel.status)
            ) {
              duelCompleted = true;
              console.log(
                `[POLLING] Duel ${duelId} completed, stopping polling`
              );
              clearInterval(pollingInterval);
              pollingIntervalsRef.current.delete(duelId);
            }
          }
        } catch (error) {
          console.error(
            `[POLLING] Error checking LeetCode submissions for duel ${duelId}:`,
            error
          );
          // Don't stop polling on errors, just log them
        }
      }, 5000); // Poll every 5 seconds to reduce load

      // Store the interval so we can clear it later
      pollingIntervalsRef.current.set(duelId, pollingInterval);

      // Set a maximum polling duration (e.g., 2 hours)
      setTimeout(
        () => {
          if (pollingIntervalsRef.current.has(duelId)) {
            console.log(
              `[POLLING] Stopping polling for duel ${duelId} after timeout`
            );
            clearInterval(pollingInterval);
            pollingIntervalsRef.current.delete(duelId);
          }
        },
        2 * 60 * 60 * 1000
      ); // 2 hours
    } catch (error) {
      console.error('Error starting duel polling:', error);
    }
  };

  // Check if a user has submitted the duel problem to LeetCode
  const checkLeetCodeSubmission = async (
    duelId,
    username,
    problemSlug,
    submittedUsers
  ) => {
    try {
      // Get recent submissions from LeetCode GraphQL API via Electron IPC
      const recentSubmissions = await fetchRecentSubmissions(username, 10);

      // Check if any recent submission matches the duel problem
      const matchingSubmission = recentSubmissions.find(
        sub => sub.titleSlug === problemSlug && sub.statusDisplay === 'Accepted'
      );

      if (matchingSubmission) {
        // Check if we've already recorded this user's submission
        if (submittedUsers && submittedUsers.has(username)) {
          console.log(
            `[POLLING] User ${username} already submitted for duel ${duelId}, skipping`
          );
          return { submitted: false, alreadyRecorded: true };
        }

        // Get the duel to find when this specific user started
        const duel = duels.find(d => d.duelId === duelId);
        if (!duel) {
          console.error(`[POLLING] Could not find duel ${duelId} in state`);
          return { submitted: false };
        }

        // Check if duel is already completed - stop polling immediately
        if (['COMPLETED', 'TIMEOUT'].includes(duel.status)) {
          console.log(
            `[POLLING] Duel ${duelId} already ${duel.status}, skipping submission recording`
          );
          return { submitted: false, duelCompleted: true };
        }

        // Determine when this specific user clicked "Start Duel"
        // The duel.startTime is when the first person started, but we need individual start times
        // For now, use the duel.startTime as the baseline for both users
        // TODO: Track individual start times in the backend
        let userStartTime = null;
        if (duel.startTime) {
          userStartTime = new Date(duel.startTime).getTime();
        } else {
          console.error(`[POLLING] No start time for duel ${duelId}`);
          // Fallback: use a default time of 60 seconds
          userStartTime =
            new Date(matchingSubmission.timestamp).getTime() - 60000;
        }

        const submissionTime = new Date(matchingSubmission.timestamp).getTime();
        const elapsedMs = Math.max(0, submissionTime - userStartTime);

        console.log(
          `[POLLING] User ${username} submitted solution for duel ${duelId}, elapsed: ${elapsedMs}ms`
        );

        // Record the submission via backend
        try {
          await recordDuelSubmission(duelId, username, Math.max(0, elapsedMs));
          // Mark this user as having submitted to prevent duplicate recordings
          if (submittedUsers) {
            submittedUsers.add(username);
            console.log(
              `[POLLING] Marked ${username} as submitted for duel ${duelId}`
            );
          }
          return { submitted: true, elapsedMs };
        } catch (recordError) {
          // Check if the error is because duel is already completed
          if (
            recordError.message &&
            recordError.message.includes('Duel already completed')
          ) {
            console.log(
              `[POLLING] Duel ${duelId} already completed, stopping polling`
            );
            return { submitted: false, duelCompleted: true };
          }
          console.error(
            `[POLLING] Failed to record submission for ${username}:`,
            recordError
          );
        }
      }

      return { submitted: false };
    } catch (error) {
      // Don't log every error to avoid spam
      if (!error.message.includes('That user does not exist')) {
        console.error(
          `[POLLING] Error checking LeetCode submissions for ${username}:`,
          error.message
        );
      }
      return { submitted: false };
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

  // Format difficulty from backend (EASY/MEDIUM/HARD) to proper case
  const formatDifficulty = difficulty => {
    if (!difficulty) return 'Unknown';
    return (
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    );
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

    const isWagerDuel = duel.isWager;
    const challengerWager = duel.wagerAmount || duel.challengerWager || 0;
    const minOpponentWager = Math.max(25, Math.floor(challengerWager * 0.75));

    return (
      <div
        key={duel.duelId}
        className={`${isWagerDuel ? 'bg-orange-50 border-orange-400' : 'bg-yellow-50 border-yellow-400'} border-2 rounded-lg p-3 mb-4`}
        style={{
          height: isChallenger ? '85px' : isWagerDuel ? '155px' : '115px',
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-sm" style={{ fontSize: '12px' }}>
              {isChallenger
                ? `Challenge sent to ${otherUserDisplay}`
                : `Challenge from ${otherUserDisplay}`}
              {isWagerDuel && ` 💰`}
            </h5>
            <p className="text-gray-600" style={{ fontSize: '12px' }}>
              {`${formatDifficulty(duel.difficulty)} Problem`}
            </p>
            {isWagerDuel && (
              <p className="text-xs text-orange-700 font-bold">
                💰 Wager: {challengerWager} XP
              </p>
            )}
            {timeRemaining > 0 && (
              <p className="text-xs text-orange-600 font-bold">
                ⏰ Expires in {hoursRemaining}h {minutesRemaining}m
              </p>
            )}
          </div>
          <span
            className={`text-xs px-2 py-1 rounded font-bold ${isWagerDuel ? 'bg-orange-200' : 'bg-yellow-200'}`}
          >
            {isWagerDuel ? '💰 WAGER' : 'PENDING'}
          </span>
        </div>

        {!isChallenger && (
          <>
            {/* Wager input for opponent */}
            {isWagerDuel && (
              <input
                type="number"
                min={minOpponentWager}
                value={acceptingWager[duel.duelId] || ''}
                onChange={e =>
                  setAcceptingWager({
                    ...acceptingWager,
                    [duel.duelId]: e.target.value,
                  })
                }
                placeholder={`Your wager (min ${minOpponentWager} XP)`}
                className="w-full mb-2 border-2 border-orange-400 rounded px-2 py-1 text-xs focus:border-orange-600 focus:outline-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleAcceptDuel(duel.duelId, duel)}
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
          </>
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
              {`${formatDifficulty(duel.difficulty)} Problem`}
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
                {formatDifficulty(duel.difficulty)} Problem
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

          {/* XP banner for winners only */}
          {duel.completed && duel.xpAwarded && won && (
            <div className="mt-2 text-center text-xs text-orange-600 font-bold">
              +{duel.xpAwarded} XP bonus earned!
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
          difficulty: duel.difficulty,
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
            <p className="text-xl text-white mb-2">You won the duel!</p>
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
        {/* Header with tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-white text-lg">⚔️</span>
            <h3 className="font-bold text-white text-lg">DUELS</h3>
            {/* Main Tabs (like leaderboard) */}
            <div className="flex gap-2 ml-4">
              <button
                className={`btn-3d shadow-md px-3 py-1 rounded-lg font-bold border-2 border-b-0 border-white focus:outline-none transition-colors text-sm ${
                  mainTab === 'normal'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-blue-200 text-black hover:bg-yellow-200'
                }`}
                onClick={() => setMainTab('normal')}
              >
                Normal Duels
              </button>
              <button
                className={`btn-3d shadow-md px-3 py-1 rounded-lg font-bold border-2 border-b-0 border-white focus:outline-none transition-colors text-sm ${
                  mainTab === 'wager'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-blue-200 text-black hover:bg-yellow-200'
                }`}
                onClick={() => setMainTab('wager')}
              >
                💰 Wager Duels
              </button>
              <button
                className={`btn-3d shadow-md px-3 py-1 rounded-lg font-bold border-2 border-b-0 border-white focus:outline-none transition-colors text-sm ${
                  mainTab === 'history'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-blue-200 text-black hover:bg-yellow-200'
                }`}
                onClick={() => setMainTab('history')}
              >
                History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6" style={{ height: '313px' }}>
        {/* Normal Duels Tab */}
        {mainTab === 'normal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challenge Settings */}
            <div
              className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
              style={{ height: '265px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Challenge</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDuelMode('group');
                      setSearchUsername('');
                      setSearchResult(null);
                      setInviteEmail('');
                    }}
                    className={`text-xs px-2 py-1 rounded border border-black font-bold ${
                      duelMode === 'group'
                        ? 'bg-blue-200 text-black'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Group Members
                  </button>
                  <button
                    onClick={() => {
                      setDuelMode('anyone');
                      setSelectedFriend('');
                      setSearchUsername('');
                      setSearchResult(null);
                      setInviteEmail('');
                    }}
                    className={`text-xs px-2 py-1 rounded border border-black font-bold ${
                      duelMode === 'anyone'
                        ? 'bg-blue-200 text-black'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Anyone
                  </button>
                  <span className="text-lg">🎯</span>
                </div>
              </div>
              <div className="space-y-2">
                {duelMode === 'anyone' ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchUsername}
                        onChange={e => setSearchUsername(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            handleSearchUser();
                          }
                        }}
                        placeholder="Enter LeetCode username..."
                        className="flex-1 border-2 border-black rounded-lg px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSearchUser}
                        disabled={searching}
                        className="px-3 py-1 bg-blue-200 hover:bg-blue-400 text-black rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50 text-sm"
                      >
                        {searching ? '⏳' : 'Search'}
                      </button>
                    </div>
                    {searchResult && (
                      <>
                        {searchResult.exists_on_yeetcode ? (
                          <div className="p-2 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
                            ✓ User found on YeetCode! You can challenge them.
                          </div>
                        ) : searchResult.exists_on_leetcode ? (
                          <>
                            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-sm">
                              This user isn't on YeetCode yet. Enter their email
                              to invite them:
                            </div>
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              placeholder="Email address..."
                              className="w-full border-2 border-black rounded-lg px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </>
                        ) : null}
                      </>
                    )}
                  </>
                ) : (
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
                )}
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
                  onChange={value => {
                    setSelectedDifficulty(value);
                    setGeneratedLink(null); // Clear link when difficulty changes
                  }}
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
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSendChallenge}
                  disabled={
                    actionLoading.createDuel ||
                    actionLoading.sendInvite ||
                    searching
                  }
                  className="flex-1 bg-blue-200 hover:bg-blue-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50"
                >
                  {actionLoading.createDuel || actionLoading.sendInvite
                    ? '⏳ Sending...'
                    : duelMode === 'anyone' && searchResult?.exists_on_yeetcode
                      ? 'Send Challenge'
                      : duelMode === 'anyone' &&
                          searchResult?.exists_on_leetcode &&
                          !searchResult?.exists_on_yeetcode
                        ? 'Send Invite'
                        : duelMode === 'anyone'
                          ? 'Search First'
                          : 'Send Challenge'}
                </button>
                <button
                  onClick={handleGenerateLink}
                  disabled={
                    generatingLink ||
                    !selectedDifficulty ||
                    (mainTab === 'wager' &&
                      (!wagerAmount || parseInt(wagerAmount) < 25))
                  }
                  className="px-3 py-2 bg-green-200 hover:bg-green-400 text-black rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50 text-sm"
                  title="Generate shareable link"
                >
                  {generatingLink ? '⏳' : '🔗'}
                </button>
              </div>
              {generatedLink && (
                <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded">
                  <div className="text-xs text-gray-600 mb-1">
                    Shareable Duel Link:
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={generatedLink.invite_url}
                      readOnly
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2 py-1 bg-blue-200 hover:bg-blue-400 text-black rounded border border-black font-bold text-xs"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Expires:{' '}
                    {new Date(generatedLink.expires_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Active Normal Duels */}
            <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Active Duels</h4>
                <span className="text-lg">📊</span>
              </div>
              <div
                className="overflow-y-auto custom-scrollbar"
                style={{ height: '190px' }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredDuels
                    .filter(
                      d =>
                        (d.status === 'PENDING' ||
                          d.status === 'ACCEPTED' ||
                          d.status === 'ACTIVE') &&
                        !d.isWager
                    )
                    .map(duel => (
                      <motion.div
                        key={duel.duelId}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{
                          layout: { duration: 0.3, ease: 'easeInOut' },
                          default: { duration: 0.2 },
                        }}
                      >
                        {renderDuel(duel)}
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredDuels.filter(
                  d =>
                    (d.status === 'PENDING' ||
                      d.status === 'ACCEPTED' ||
                      d.status === 'ACTIVE') &&
                    !d.isWager
                ).length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    <div className="text-2xl mb-2">⚔️</div>
                    <div className="text-sm">No active normal duels!</div>
                    <div className="text-xs">
                      Challenge a friend to get started
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wager Duels Tab */}
        {mainTab === 'wager' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challenge Settings */}
            <div
              className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
              style={{ height: '265px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">💰 Wager Challenge</h4>
                <span className="text-lg">🎰</span>
              </div>
              <div className="space-y-2">
                {/* Wager Amount Input */}
                <input
                  type="number"
                  min="25"
                  value={wagerAmount}
                  onChange={e => setWagerAmount(e.target.value)}
                  placeholder="Your wager (min 25 XP)"
                  className="w-full border-2 border-black rounded-lg px-2 py-1 text-sm focus:border-orange-500 focus:outline-none"
                />
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
                  onChange={value => {
                    setSelectedDifficulty(value);
                    setGeneratedLink(null); // Clear link when difficulty changes
                  }}
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
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSendChallenge}
                  disabled={actionLoading.createDuel}
                  className="flex-1 bg-orange-200 hover:bg-orange-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50"
                >
                  {actionLoading.createDuel
                    ? '⏳ Sending...'
                    : 'Send Wager Challenge'}
                </button>
                <button
                  onClick={handleGenerateLink}
                  disabled={
                    generatingLink ||
                    !selectedDifficulty ||
                    !wagerAmount ||
                    parseInt(wagerAmount) < 25
                  }
                  className="px-3 py-2 bg-green-200 hover:bg-green-400 text-black rounded-lg border-2 border-black font-bold btn-3d disabled:opacity-50 text-sm"
                  title="Generate shareable link"
                >
                  {generatingLink ? '⏳' : '🔗'}
                </button>
              </div>
              {generatedLink && (
                <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded">
                  <div className="text-xs text-gray-600 mb-1">
                    Shareable Duel Link:
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={generatedLink.invite_url}
                      readOnly
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2 py-1 bg-blue-200 hover:bg-blue-400 text-black rounded border border-black font-bold text-xs"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Expires:{' '}
                    {new Date(generatedLink.expires_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Active Wager Duels */}
            <div className="bg-white p-4 border-2 border-black rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">Active Wagers</h4>
                <span className="text-lg">💰</span>
              </div>
              <div
                className="overflow-y-auto custom-scrollbar"
                style={{ height: '190px' }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredDuels
                    .filter(
                      d =>
                        (d.status === 'PENDING' ||
                          d.status === 'ACCEPTED' ||
                          d.status === 'ACTIVE') &&
                        d.isWager
                    )
                    .map(duel => (
                      <motion.div
                        key={duel.duelId}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{
                          layout: { duration: 0.3, ease: 'easeInOut' },
                          default: { duration: 0.2 },
                        }}
                      >
                        {renderDuel(duel)}
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredDuels.filter(
                  d =>
                    (d.status === 'PENDING' ||
                      d.status === 'ACCEPTED' ||
                      d.status === 'ACTIVE') &&
                    d.isWager
                ).length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="text-sm">No active wager duels!</div>
                    <div className="text-xs">Start a wager duel to bet XP</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {mainTab === 'history' && (
          <div
            className="bg-white p-4 border-2 border-black rounded-lg shadow-md"
            style={{ height: '265px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">Completed Duels</h4>
              <div className="flex items-center gap-2">
                {/* Sort dropdown */}
                <select
                  value={historySortBy}
                  onChange={e => setHistorySortBy(e.target.value)}
                  className="text-xs border-2 border-black rounded px-2 py-1 font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="wins">Wins First</option>
                  <option value="losses">Losses First</option>
                </select>
                <span className="text-lg">📜</span>
              </div>
            </div>
            <div
              className="overflow-y-auto custom-scrollbar"
              style={{ height: '195px' }}
            >
              {/* Show completed duels */}
              <AnimatePresence mode="popLayout">
                {[...recentDuels]
                  .sort((a, b) => {
                    const aIsWin = a.winner === normalizedCurrentUser;
                    const bIsWin = b.winner === normalizedCurrentUser;

                    switch (historySortBy) {
                      case 'oldest':
                        return (
                          new Date(a.completedAt || 0) -
                          new Date(b.completedAt || 0)
                        );
                      case 'wins':
                        if (aIsWin && !bIsWin) return -1;
                        if (!aIsWin && bIsWin) return 1;
                        return (
                          new Date(b.completedAt || 0) -
                          new Date(a.completedAt || 0)
                        );
                      case 'losses':
                        if (!aIsWin && bIsWin) return -1;
                        if (aIsWin && !bIsWin) return 1;
                        return (
                          new Date(b.completedAt || 0) -
                          new Date(a.completedAt || 0)
                        );
                      case 'recent':
                      default:
                        return (
                          new Date(b.completedAt || 0) -
                          new Date(a.completedAt || 0)
                        );
                    }
                  })
                  .map(duel => {
                    const isWinner = duel.winner === normalizedCurrentUser;
                    const iAmChallenger =
                      duel.challenger === normalizedCurrentUser;
                    const otherUser = iAmChallenger
                      ? duel.challengee
                      : duel.challenger;
                    const otherUserDisplay =
                      leaderboard.find(u => u.username === otherUser)?.name ||
                      otherUser;
                    const myTime = iAmChallenger
                      ? duel.challengerTime
                      : duel.challengeeTime;
                    const theirTime = iAmChallenger
                      ? duel.challengeeTime
                      : duel.challengerTime;
                    const myWager = duel.isWager
                      ? iAmChallenger
                        ? duel.challengerWager
                        : duel.challengeeWager
                      : null;
                    const theirWager = duel.isWager
                      ? iAmChallenger
                        ? duel.challengeeWager
                        : duel.challengerWager
                      : null;

                    return (
                      <motion.div
                        key={duel.duelId}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{
                          layout: { duration: 0.3, ease: 'easeInOut' },
                          default: { duration: 0.2 },
                        }}
                        className={`mb-2 p-2 rounded border-2 ${
                          isWinner
                            ? 'bg-green-100 border-green-400'
                            : 'bg-red-100 border-red-400'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm mb-1">
                              {isWinner ? '🏆 WIN' : '❌ LOSS'}
                              {duel.isWager && ' 💰'}
                              <span className="ml-2 font-normal">
                                vs {otherUserDisplay}
                              </span>
                            </div>
                            <div
                              className="text-gray-700 truncate"
                              title={
                                duel.problemNumber && duel.problemTitle
                                  ? `${duel.problemNumber}. ${duel.problemTitle}`
                                  : duel.problemTitle
                              }
                            >
                              {duel.problemNumber && duel.problemTitle
                                ? `${duel.problemNumber}. ${duel.problemTitle}`
                                : duel.problemTitle ||
                                  `${formatDifficulty(duel.difficulty)} Problem`}
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5">
                              {formatDifficulty(duel.difficulty)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {/* Show times */}
                            <div className="text-xs space-y-0.5 whitespace-nowrap">
                              <div
                                className={
                                  isWinner ? 'font-bold text-green-700' : ''
                                }
                              >
                                You: {myTime ? formatTime(myTime) : 'DNF'}
                              </div>
                              <div
                                className={
                                  !isWinner && theirTime
                                    ? 'font-bold text-red-700'
                                    : ''
                                }
                              >
                                Them:{' '}
                                {theirTime ? formatTime(theirTime) : 'DNF'}
                              </div>
                            </div>
                            {/* Show wager amounts if applicable */}
                            {duel.isWager && (myWager || theirWager) && (
                              <div className="mt-1 text-xs text-orange-700 font-bold border-t border-orange-300 pt-1 whitespace-nowrap">
                                <div>Your wager: {myWager || 0} XP</div>
                                <div>Their wager: {theirWager || 0} XP</div>
                              </div>
                            )}
                            {/* Show XP awarded */}
                            {duel.xpAwarded && isWinner && (
                              <div
                                className={`mt-0.5 font-bold whitespace-nowrap ${duel.isWager ? 'text-orange-600' : 'text-green-600'}`}
                              >
                                +{duel.xpAwarded} XP
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
              {recentDuels.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📜</div>
                  <div className="text-sm">No completed duels yet!</div>
                  <div className="text-xs">
                    Complete some duels to see your history
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DuelsSection;
