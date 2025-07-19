// Duels Service - Handles all duel-related API calls
// These functions communicate with the backend via electronAPI

/**
 * Get all duels for the current user (PENDING and ACTIVE)
 * @param {string} username - LeetCode username
 * @returns {Promise<Array>} Array of duel objects
 */
export const getUserDuels = async username => {
  if (!window.electronAPI?.getUserDuels) {
    throw new Error('getUserDuels API not available');
  }
  return await window.electronAPI.getUserDuels(username);
};

/**
 * Get recent completed duels for the current user
 * @param {string} username - LeetCode username
 * @returns {Promise<Array>} Array of completed duel objects (sorted by date, newest first)
 */
export const getRecentDuels = async username => {
  if (!window.electronAPI?.getRecentDuels) {
    throw new Error('getRecentDuels API not available');
  }
  return await window.electronAPI.getRecentDuels(username);
};

/**
 * Create a new duel challenge
 * @param {string} challengerUsername - Username of challenger
 * @param {string} challengeeUsername - Username of challengee
 * @param {string} difficulty - Problem difficulty (Easy/Medium/Hard/Random)
 * @returns {Promise<Object>} Created duel object
 */
export const createDuel = async (
  challengerUsername,
  challengeeUsername,
  difficulty
) => {
  if (!window.electronAPI?.createDuel) {
    throw new Error('createDuel API not available');
  }
  return await window.electronAPI.createDuel(
    challengerUsername,
    challengeeUsername,
    difficulty
  );
};

/**
 * Accept a pending duel
 * @param {string} duelId - ID of the duel to accept
 * @returns {Promise<Object>} Updated duel object with ACTIVE status and startTime
 */
export const acceptDuel = async duelId => {
  if (!window.electronAPI?.acceptDuel) {
    throw new Error('acceptDuel API not available');
  }
  return await window.electronAPI.acceptDuel(duelId);
};

/**
 * Reject a pending duel
 * @param {string} duelId - ID of the duel to reject
 * @returns {Promise<Object>} Success response
 */
export const rejectDuel = async duelId => {
  if (!window.electronAPI?.rejectDuel) {
    throw new Error('rejectDuel API not available');
  }
  return await window.electronAPI.rejectDuel(duelId);
};

/**
 * Record a duel submission (when user completes the problem)
 * @param {string} duelId - ID of the duel
 * @param {string} username - Username of the user who submitted
 * @param {number} elapsedMs - Time taken to solve in milliseconds
 * @returns {Promise<Object>} Updated duel object, potentially with winner info and XP
 */
export const recordDuelSubmission = async (duelId, username, elapsedMs) => {
  if (!window.electronAPI?.recordDuelSubmission) {
    throw new Error('recordDuelSubmission API not available');
  }
  return await window.electronAPI.recordDuelSubmission(
    duelId,
    username,
    elapsedMs
  );
};

/**
 * Get a specific duel by ID
 * @param {string} duelId - ID of the duel
 * @returns {Promise<Object>} Duel object
 */
export const getDuel = async duelId => {
  if (!window.electronAPI?.getDuel) {
    throw new Error('getDuel API not available');
  }
  return await window.electronAPI.getDuel(duelId);
};

/**
 * Auto-reject expired duels (older than 2 hours)
 * @param {string} username - Username to check duels for
 * @returns {Promise<Array>} Array of rejected duel IDs
 */
export const autoRejectExpiredDuels = async username => {
  const duels = await getUserDuels(username);
  const expiredDuels = duels.filter(duel => {
    if (duel.status !== 'PENDING') return false;
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return new Date(duel.createdAt).getTime() < twoHoursAgo;
  });

  const rejectedIds = [];
  for (const duel of expiredDuels) {
    try {
      await rejectDuel(duel.duelId);
      rejectedIds.push(duel.duelId);
    } catch (error) {
      console.error(`Failed to auto-reject duel ${duel.duelId}:`, error);
    }
  }

  return rejectedIds;
};
