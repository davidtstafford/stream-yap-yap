import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database/migrations';
import { closeDatabase, getDatabase } from './database/connection';
import { DatabaseService } from './database/service';
import { VoiceService } from './database/voiceService';
import { getTwitchService } from './twitch/twitchService';
import { TwitchOAuthService } from './twitch/oauthService';

let mainWindow: BrowserWindow | null = null;
const twitchService = getTwitchService();
const oauthService = new TwitchOAuthService();

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
  
  // Set up Twitch service callbacks to send events to renderer
  twitchService.onMessage((message) => {
    if (mainWindow) {
      mainWindow.webContents.send('twitch:message', message);
    }
  });
  
  twitchService.onConnectionStatus((connected, error) => {
    if (mainWindow) {
      mainWindow.webContents.send('twitch:connectionStatus', { connected, error });
    }
  });
  
  // Auto-connect if enabled
  const autoConnect = DatabaseService.getSetting('auto_connect');
  const twitchToken = DatabaseService.getSetting('twitch_token');
  const twitchUsername = DatabaseService.getSetting('twitch_username');
  
  if (autoConnect === 'true' && twitchToken && twitchUsername) {
    console.log('Auto-connecting to Twitch...');
    twitchService.connect({
      username: twitchUsername,
      token: twitchToken,
      channels: [twitchUsername] // Connect to own channel
    }).catch(err => {
      console.error('Auto-connect failed:', err);
    });
  }
});

app.on('window-all-closed', () => {
  twitchService.destroy();
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

// IPC handlers for Twitch OAuth
ipcMain.handle('twitch:authenticateOAuth', async () => {
  try {
    const result = await oauthService.authenticate();
    
    // Save token and username to database
    DatabaseService.setSetting('twitch_token', result.token);
    DatabaseService.setSetting('twitch_username', result.username);
    
    return {
      success: true,
      token: result.token,
      username: result.username
    };
  } catch (error) {
    console.error('OAuth authentication failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('twitch:validateToken', async (_event, token: string) => {
  try {
    const isValid = await oauthService.validateToken(token);
    return { success: true, valid: isValid };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('db:getAllSettings', async () => {
  return DatabaseService.getAllSettings();
});

ipcMain.handle('db:getViewers', async () => {
  return DatabaseService.getAllViewers();
});

ipcMain.handle('db:getChatHistory', async (_event, limit?: number, offset?: number) => {
  const messages = DatabaseService.getChatHistory(limit, offset);
  console.log(`getChatHistory called: returning ${messages.length} messages`);
  return messages;
});

ipcMain.handle('db:searchChatHistory', async (_event, searchTerm: string, limit?: number) => {
  return DatabaseService.searchChatHistory(searchTerm, limit);
});

ipcMain.handle('db:clearChatHistory', async () => {
  DatabaseService.clearChatHistory();
  return true;
});

ipcMain.handle('db:getChatHistoryCount', async () => {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as { count: number };
  console.log(`Total messages in database: ${result.count}`);
  return result.count;
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

// Twitch IPC handlers
ipcMain.handle('twitch:connect', async (_event, params: { token: string; channels: string[] } | string, tokenOrChannels?: string | string[]) => {
  try {
    let username: string;
    let token: string;
    let channels: string[];

    // Handle both old format (username, token) and new format ({ token, channels })
    if (typeof params === 'string') {
      // Old format: username, token
      username = params;
      token = tokenOrChannels as string;
      channels = [username];
    } else {
      // New format: { token, channels }
      token = params.token;
      channels = params.channels;
      username = channels[0]; // Use first channel as username
    }

    await twitchService.connect({
      username,
      token,
      channels
    });
    
    // Save credentials
    DatabaseService.setSetting('twitch_username', username.toLowerCase());
    DatabaseService.setSetting('twitch_token', token);
    DatabaseService.setSetting('twitch_connected', 'true');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:disconnect', async () => {
  try {
    await twitchService.disconnect();
    DatabaseService.setSetting('twitch_connected', 'false');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:isConnected', async () => {
  return twitchService.isConnected();
});

ipcMain.handle('twitch:forgetCredentials', async () => {
  await twitchService.disconnect();
  DatabaseService.setSetting('twitch_username', '');
  DatabaseService.setSetting('twitch_token', '');
  DatabaseService.setSetting('twitch_connected', 'false');
  return { success: true };
});

// TTS restriction handlers
ipcMain.handle('db:getViewerTTSRestrictions', async (_event, viewerId: string) => {
  const db = getDatabase();
  const restrictions = db.prepare(`
    SELECT * FROM viewer_tts_restrictions WHERE viewer_id = ?
  `).get(viewerId);
  return restrictions;
});

ipcMain.handle('db:getViewerVoicePreference', async (_event, viewerId: string) => {
  const db = getDatabase();
  const preference = db.prepare(`
    SELECT * FROM viewer_voice_preferences WHERE viewer_id = ?
  `).get(viewerId);
  return preference;
});

ipcMain.handle('db:updateLastTTSTime', async (_event, viewerId: string) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE viewer_tts_restrictions 
    SET last_tts_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE viewer_id = ?
  `).run(now, viewerId);
  return true;
});

// Test handler
ipcMain.handle('ping', async () => {
  return 'pong';
});
