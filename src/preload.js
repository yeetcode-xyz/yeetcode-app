// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// src/preload.js
console.log('🛠 preload.js is running');
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  validateLeetCodeUsername: username =>
    ipcRenderer.invoke('validate-leetcode-username', username),

  createGroup: (username, displayName) =>
    ipcRenderer.invoke('create-group', username, displayName),

  joinGroup: (username, code, displayName) =>
    ipcRenderer.invoke('join-group', username, code, displayName),

  getStatsForGroup: groupId =>
    ipcRenderer.invoke('get-stats-for-group', groupId),

  getUserData: username => ipcRenderer.invoke('get-user-data', username),

  leaveGroup: username => ipcRenderer.invoke('leave-group', username),

  updateDisplayName: (username, displayName) =>
    ipcRenderer.invoke('update-display-name', username, displayName),

  openExternalUrl: url => ipcRenderer.invoke('open-external-url', url),

  fetchRandomProblem: difficulty =>
    ipcRenderer.invoke('fetch-random-problem', difficulty),

  getDailyProblem: username =>
    ipcRenderer.invoke('get-daily-problem', username),

  completeDailyProblem: username =>
    ipcRenderer.invoke('complete-daily-problem', username),

  fixUserXP: username => ipcRenderer.invoke('fix-user-xp', username),

  refreshUserXP: username => ipcRenderer.invoke('refresh-user-xp', username),

  getBounties: username => ipcRenderer.invoke('get-bounties', username),

  updateBountyProgress: (username, bountyId, progress) =>
    ipcRenderer.invoke('update-bounty-progress', username, bountyId, progress),

  checkDailyNotification: () => ipcRenderer.invoke('check-daily-notification'),

  // New methods for tracking app state
  updateAppState: (step, userData, dailyData) =>
    ipcRenderer.invoke('update-app-state', step, userData, dailyData),

  clearAppState: () => ipcRenderer.invoke('clear-app-state'),

  // Duel system methods
  getUserDuels: username => ipcRenderer.invoke('get-user-duels', username),

  createDuel: (challengerUsername, challengeeUsername, difficulty) =>
    ipcRenderer.invoke(
      'create-duel',
      challengerUsername,
      challengeeUsername,
      difficulty
    ),

  acceptDuel: duelId => ipcRenderer.invoke('accept-duel', duelId),

  rejectDuel: duelId => ipcRenderer.invoke('reject-duel', duelId),

  recordDuelSubmission: (duelId, username, elapsedMs) =>
    ipcRenderer.invoke('record-duel-submission', duelId, username, elapsedMs),

  getDuel: duelId => ipcRenderer.invoke('get-duel', duelId),

  fetchLeetCodeSubmissions: (username, limit) =>
    ipcRenderer.invoke('fetch-leetcode-submissions', username, limit),

  simulateDuelCompletion: (duelId, username, timeInSeconds) =>
    ipcRenderer.invoke(
      'simulate-duel-completion',
      duelId,
      username,
      timeInSeconds
    ),
});
