// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any methods you need here
  validateLeetCodeUsername: username =>
    ipcRenderer.invoke('validate-leetcode-username', username),
  joinGroup: (username, code) =>
    ipcRenderer.invoke('join-group', username, code),
  createGroup: username => ipcRenderer.invoke('create-group', username),
  getStatsForGroup: groupId =>
    ipcRenderer.invoke('get-stats-for-group', groupId),
});
