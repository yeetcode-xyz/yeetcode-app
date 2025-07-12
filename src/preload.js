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

  createGroup: username => ipcRenderer.invoke('create-group', username),

  joinGroup: (username, code) =>
    ipcRenderer.invoke('join-group', username, code),

  getStatsForGroup: groupId =>
    ipcRenderer.invoke('get-stats-for-group', groupId),

  getUserData: username => ipcRenderer.invoke('get-user-data', username),

  leaveGroup: username => ipcRenderer.invoke('leave-group', username),

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
});
