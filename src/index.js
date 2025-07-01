import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import electronSquirrelStartup from 'electron-squirrel-startup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Mock OAuth login
const mockOAuthLogin = async () => {
  return { name: 'Test User', email: 'test@example.com', token: 'mocktoken' };
};

// Mock Lambda validation
const mockValidateLeetCode = async (username) => {
  // Simulate API call
  await new Promise((r) => setTimeout(r, 500));
  return username && username.length > 2;
};

// Mock group join/create
const mockJoinGroup = async (inviteCode) => {
  await new Promise((r) => setTimeout(r, 500));
  return inviteCode === '12345';
};
const mockCreateGroup = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return '12345';
};

// Mock leaderboard fetch
const mockFetchLeaderboard = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [
    { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
    { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
    { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
  ];
};
