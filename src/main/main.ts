import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database/migrations';
import { closeDatabase } from './database/connection';
import { DatabaseService } from './database/service';
import { VoiceService } from './database/voiceService';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Stream Yap Yap'
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database before creating window
app.on('ready', () => {
  console.log('Initializing database...');
  initializeDatabase();
  console.log('Database initialized');
  createWindow();
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('db:getSetting', async (_event, key: string) => {
  return DatabaseService.getSetting(key);
});

ipcMain.handle('db:setSetting', async (_event, key: string, value: string) => {
  DatabaseService.setSetting(key, value);
  return true;
});

ipcMain.handle('db:getAllSettings', async () => {
  return DatabaseService.getAllSettings();
});

ipcMain.handle('db:getViewers', async () => {
  return DatabaseService.getAllViewers();
});

ipcMain.handle('db:getChatHistory', async (_event, limit?: number, offset?: number) => {
  return DatabaseService.getChatHistory(limit, offset);
});

ipcMain.handle('db:searchChatHistory', async (_event, searchTerm: string, limit?: number) => {
  return DatabaseService.searchChatHistory(searchTerm, limit);
});

ipcMain.handle('db:clearChatHistory', async () => {
  DatabaseService.clearChatHistory();
  return true;
});

ipcMain.handle('db:getAvailableVoices', async (_event, provider?: string) => {
  return VoiceService.getAvailableVoices(provider);
});

ipcMain.handle('db:scanVoices', async () => {
  await VoiceService.scanAndSyncVoices();
  return true;
});

ipcMain.handle('db:isVoiceAvailable', async (_event, voiceId: string, provider: string) => {
  return VoiceService.isVoiceAvailable(voiceId, provider);
});

// Test handler
ipcMain.handle('ping', async () => {
  return 'pong';
});
