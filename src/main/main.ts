import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database/migrations';
import { closeDatabase, getDatabase } from './database/connection';
import { DatabaseService } from './database/service';
import { VoiceService } from './database/voiceService';
import { getTwitchService } from './twitch/twitchService';
import { TwitchOAuthService } from './twitch/oauthService';
import { getTwitchApiService } from './twitch/twitchApiService';
import { getOBSServer } from './obs/obsServer';
import { getApiServer } from './api/apiServer';
import { getAwsPollyService } from './tts/awsPollyService';
import { getAzureTtsService } from './tts/azureTtsService';
import { getGoogleTtsService } from './tts/googleTtsService';
import { getVoiceScannerService } from './tts/voiceScannerService';
import { getDiscordService } from './discord/discordService';

let mainWindow: BrowserWindow | null = null;
const twitchService = getTwitchService();
const twitchApiService = getTwitchApiService();
const oauthService = new TwitchOAuthService();
const obsServer = getOBSServer();
const apiServer = getApiServer();
const discordService = getDiscordService();

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
  
  discordService.onConnectionStatus((connected, error) => {
    if (mainWindow) {
      mainWindow.webContents.send('discord:connectionStatus', { connected, error });
    }
  });
  
  // Forward API server events to renderer
  apiServer.on('tts-toggled', (enabled: boolean) => {
    if (mainWindow) {
      mainWindow.webContents.send('tts:status-changed', enabled);
    }
  });
  
  // Start API server (always running)
  apiServer.start().catch(err => {
    console.error('Failed to start API server:', err);
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

  // Auto-connect Discord if enabled
  const discordToken = DatabaseService.getSetting('discord_token');
  const discordClientId = DatabaseService.getSetting('discord_client_id');
  const discordEnabled = DatabaseService.getSetting('discord_enabled');
  
  if (discordEnabled === 'true' && discordToken && discordClientId) {
    console.log('Auto-connecting to Discord...');
    discordService.connect({
      token: discordToken,
      clientId: discordClientId,
      guildId: DatabaseService.getSetting('discord_guild_id') || undefined
    }).catch(err => {
      console.error('Discord auto-connect failed:', err);
    });
  }

  // Auto-start OBS server if enabled
  const obsEnabled = DatabaseService.getSetting('obs_server_enabled');
  if (obsEnabled === 'true') {
    console.log('Auto-starting OBS server...');
    obsServer.start().catch(err => {
      console.error('Failed to start OBS server:', err);
    });
  }

  // Auto-configure TTS providers if enabled
  const awsEnabled = DatabaseService.getSetting('tts_aws_enabled');
  if (awsEnabled === 'true') {
    const accessKeyId = DatabaseService.getSetting('tts_aws_access_key');
    const secretAccessKey = DatabaseService.getSetting('tts_aws_secret_key');
    const region = DatabaseService.getSetting('tts_aws_region');
    const engine = DatabaseService.getSetting('tts_aws_engine');
    
    if (accessKeyId && secretAccessKey && region) {
      console.log('Auto-configuring AWS Polly...');
      const awsService = getAwsPollyService();
      awsService.configure({
        accessKeyId,
        secretAccessKey,
        region,
        engine: (engine as 'standard' | 'neural') || 'neural'
      });
    }
  }

  const azureEnabled = DatabaseService.getSetting('tts_azure_enabled');
  if (azureEnabled === 'true') {
    const subscriptionKey = DatabaseService.getSetting('tts_azure_subscription_key');
    const region = DatabaseService.getSetting('tts_azure_region');
    
    if (subscriptionKey && region) {
      console.log('Auto-configuring Azure TTS...');
      const azureService = getAzureTtsService();
      azureService.configure({ subscriptionKey, region });
    }
  }

  const googleEnabled = DatabaseService.getSetting('tts_google_enabled');
  if (googleEnabled === 'true') {
    const serviceAccountJson = DatabaseService.getSetting('tts_google_service_account_json');
    
    if (serviceAccountJson) {
      console.log('Auto-configuring Google Cloud TTS...');
      const googleService = getGoogleTtsService();
      try {
        googleService.configure({ serviceAccountJson });
      } catch (err) {
        console.error('Failed to configure Google Cloud TTS:', err);
      }
    }
  }

  // Auto-scan voices on startup if any provider is configured
  const lastScan = DatabaseService.getSetting('tts_voices_last_scanned');
  const anyProviderConfigured = 
    (awsEnabled === 'true' && DatabaseService.getSetting('tts_aws_access_key')) ||
    (azureEnabled === 'true' && DatabaseService.getSetting('tts_azure_subscription_key')) ||
    (googleEnabled === 'true' && DatabaseService.getSetting('tts_google_service_account_json'));
  
  if (anyProviderConfigured && !lastScan) {
    console.log('No voices scanned yet, triggering initial scan...');
    setTimeout(async () => {
      try {
        const scannerService = getVoiceScannerService();
        const results = await scannerService.scanAllProviders();
        console.log('Initial voice scan complete:', results);
      } catch (err) {
        console.error('Failed to auto-scan voices:', err);
      }
    }, 2000); // Wait 2 seconds for app to fully initialize
  }
});

app.on('window-all-closed', () => {
  twitchService.destroy();
  discordService.destroy();
  obsServer.stop();
  apiServer.stop();
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
    
    // Get user info to retrieve user ID
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${result.token}`,
        'Client-Id': oauthService.getClientId()
      }
    });
    
    const userData = await response.json() as { data: Array<{ id: string; login: string }> };
    const userId = userData.data[0].id;
    
    // Save token, username, user ID, and client ID to database
    DatabaseService.setSetting('twitch_token', result.token);
    DatabaseService.setSetting('twitch_username', result.username);
    DatabaseService.setSetting('twitch_user_id', userId);
    DatabaseService.setSetting('twitch_client_id', oauthService.getClientId());
    
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

ipcMain.handle('db:syncWebSpeechVoices', async (_event, voices: any[]) => {
  return VoiceService.syncWebSpeechVoices(voices);
});

ipcMain.handle('db:isVoiceAvailable', async (_event, voiceId: string, provider: string) => {
  return VoiceService.isVoiceAvailable(voiceId, provider);
});

// OBS Server handlers
ipcMain.handle('obs:start', async () => {
  try {
    await obsServer.start();
    return { success: true, url: obsServer.getURL() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('obs:stop', async () => {
  try {
    await obsServer.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('obs:getStatus', () => {
  return {
    running: obsServer.isRunning(),
    url: obsServer.getURL()
  };
});
ipcMain.handle('api:getUrl', async () => {
  return apiServer.getURL();
});
ipcMain.handle('obs:broadcastEvent', (_event, event: { type: string; item?: any }) => {
  obsServer.broadcast(event);
  return true;
});

// Wait for OBS audio completion
ipcMain.handle('obs:waitForAudioComplete', () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[Main] ⚠️ TIMEOUT waiting for audio completion after 30 seconds');
      obsServer.off('audioComplete', handler);
      resolve({ success: false, error: 'Timeout waiting for audio completion' });
    }, 30000); // 30 second timeout
    
    const handler = () => {
      clearTimeout(timeout);
      obsServer.off('audioComplete', handler);
      resolve({ success: true });
    };
    
    obsServer.once('audioComplete', handler);
  });
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

// Discord handlers
ipcMain.handle('discord:connect', async (_event, config: { token: string; clientId: string; guildId?: string }) => {
  try {
    await discordService.connect({
      token: config.token,
      clientId: config.clientId,
      guildId: config.guildId
    });
    
    // Save credentials
    DatabaseService.setSetting('discord_token', config.token);
    DatabaseService.setSetting('discord_client_id', config.clientId);
    if (config.guildId) {
      DatabaseService.setSetting('discord_guild_id', config.guildId);
    }
    DatabaseService.setSetting('discord_enabled', 'true');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('discord:disconnect', async () => {
  try {
    await discordService.disconnect();
    DatabaseService.setSetting('discord_enabled', 'false');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('discord:isConnected', async () => {
  return discordService.isConnected();
});

ipcMain.handle('discord:forgetCredentials', async () => {
  await discordService.disconnect();
  DatabaseService.setSetting('discord_token', '');
  DatabaseService.setSetting('discord_client_id', '');
  DatabaseService.setSetting('discord_guild_id', '');
  DatabaseService.setSetting('discord_enabled', 'false');
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

// General database query and execution handlers
ipcMain.handle('db:query', async (_event, sql: string, params: any[] = []) => {
  const db = getDatabase();
  try {
    return db.prepare(sql).all(...params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
});

ipcMain.handle('db:execute', async (_event, sql: string, params: any[] = []) => {
  const db = getDatabase();
  try {
    return db.prepare(sql).run(...params);
  } catch (error) {
    console.error('Database execute error:', error);
    throw error;
  }
});

ipcMain.handle('db:getViewer', async (_event, viewerId: string) => {
  return DatabaseService.getViewerById(viewerId);
});

// Test handler
ipcMain.handle('ping', async () => {
  return 'pong';
});

// Twitch API handlers for viewer management
ipcMain.handle('twitch:api:configure', async (_event, config: { clientId: string; accessToken: string; broadcasterId: string; broadcasterUsername: string }) => {
  try {
    twitchApiService.configure(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:syncAllStatuses', async () => {
  try {
    await twitchApiService.syncAllStatuses();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:addModerator', async (_event, username: string) => {
  try {
    await twitchApiService.addModerator(username);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:removeModerator', async (_event, username: string) => {
  try {
    await twitchApiService.removeModerator(username);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:addVip', async (_event, username: string) => {
  try {
    await twitchApiService.addVip(username);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:removeVip', async (_event, username: string) => {
  try {
    await twitchApiService.removeVip(username);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:banUser', async (_event, username: string, reason?: string, duration?: number) => {
  try {
    await twitchApiService.banUser(username, reason, duration);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('twitch:api:unbanUser', async (_event, username: string) => {
  try {
    await twitchApiService.unbanUser(username);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// TTS Provider handlers
ipcMain.handle('tts:aws:configure', async (_event, config: { accessKeyId: string; secretAccessKey: string; region: string; engine: 'standard' | 'neural' }) => {
  try {
    const awsService = getAwsPollyService();
    awsService.configure(config);
    
    // Save configuration to database
    await DatabaseService.setSetting('tts_aws_access_key', config.accessKeyId);
    await DatabaseService.setSetting('tts_aws_secret_key', config.secretAccessKey);
    await DatabaseService.setSetting('tts_aws_region', config.region);
    await DatabaseService.setSetting('tts_aws_engine', config.engine);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:aws:testConnection', async () => {
  try {
    const awsService = getAwsPollyService();
    const isConnected = await awsService.testConnection();
    return { success: isConnected };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:azure:configure', async (_event, config: { subscriptionKey: string; region: string }) => {
  try {
    const azureService = getAzureTtsService();
    azureService.configure(config);
    
    // Save configuration to database
    await DatabaseService.setSetting('tts_azure_subscription_key', config.subscriptionKey);
    await DatabaseService.setSetting('tts_azure_region', config.region);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:azure:testConnection', async () => {
  try {
    const azureService = getAzureTtsService();
    const isConnected = await azureService.testConnection();
    return { success: isConnected };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:google:configure', async (_event, config: { serviceAccountJson: string }) => {
  try {
    const googleService = getGoogleTtsService();
    googleService.configure(config);
    
    // Save configuration to database
    await DatabaseService.setSetting('tts_google_service_account_json', config.serviceAccountJson);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:google:testConnection', async () => {
  try {
    const googleService = getGoogleTtsService();
    const isConnected = await googleService.testConnection();
    return { success: isConnected };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:scanVoices', async () => {
  try {
    const scannerService = getVoiceScannerService();
    const results = await scannerService.scanAllProviders();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('tts:synthesize', async (_event, { text, voiceId, provider, speed, volume }) => {
  try {
    let audioBuffer: Buffer;
    
    switch (provider) {
      case 'aws': {
        const awsService = getAwsPollyService();
        audioBuffer = await awsService.synthesize(text, voiceId, { speed, volume });
        break;
      }
      case 'azure': {
        const azureService = getAzureTtsService();
        audioBuffer = await azureService.synthesize(text, voiceId, { speed, volume });
        break;
      }
      case 'google': {
        const googleService = getGoogleTtsService();
        audioBuffer = await googleService.synthesize(text, voiceId, { speed, volume });
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Return audio as base64 for playback in renderer
    const base64Audio = audioBuffer.toString('base64');
    return { success: true, audioData: base64Audio };
  } catch (error) {
    console.error('TTS synthesis error:', error);
    return { success: false, error: String(error) };
  }
});

