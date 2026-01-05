import { getDatabase } from './connection';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

export function initializeDatabase(): void {
  const db = getDatabase();
  
  // Check current schema version
  const versionTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='schema_version'
  `).get();
  
  let currentVersion = 0;
  
  if (versionTable) {
    const versionRow = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number };
    currentVersion = versionRow?.version || 0;
  }
  
  // Run migrations if needed
  if (currentVersion < SCHEMA_VERSION) {
    console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);
    
    // Execute schema
    db.exec(SCHEMA_SQL);
    
    // Update schema version
    db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    
    console.log('Database migration completed');
  } else {
    console.log(`Database is up to date (version ${currentVersion})`);
  }
  
  // Insert default settings if not exists
  insertDefaultSettings();
  
  // Insert default commands if not exists
  insertDefaultCommands();
}

function insertDefaultSettings(): void {
  const db = getDatabase();
  
  const defaultSettings = [
    { key: 'twitch_connected', value: 'false' },
    { key: 'tts_enabled', value: 'true' },
    { key: 'tts_provider', value: 'webspeech' },
    { key: 'tts_default_voice', value: '' },
    { key: 'tts_default_volume', value: '1.0' },
    { key: 'tts_default_speed', value: '1.0' },
    { key: 'tts_default_pitch', value: '1.0' },
    { key: 'obs_browser_source_enabled', value: 'false' },
    { key: 'obs_browser_source_port', value: '8080' },
    { key: 'mute_in_app_when_obs', value: 'true' },
    { key: 'auto_connect', value: 'true' }
  ];
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  
  for (const setting of defaultSettings) {
    insertStmt.run(setting.key, setting.value);
  }
}

function insertDefaultCommands(): void {
  const db = getDatabase();
  
  const defaultCommands = [
    {
      command_name: 'setvoice',
      description: 'Set your TTS voice',
      permission_level: 'viewer',
      enabled: 1
    },
    {
      command_name: 'mutevoice',
      description: 'Mute a viewer\'s TTS (Moderator only)',
      permission_level: 'moderator',
      enabled: 1
    },
    {
      command_name: 'unmutevoice',
      description: 'Unmute a viewer\'s TTS (Moderator only)',
      permission_level: 'moderator',
      enabled: 1
    },
    {
      command_name: 'cooldown',
      description: 'Set TTS cooldown for a viewer (Moderator only)',
      permission_level: 'moderator',
      enabled: 1
    },
    {
      command_name: 'voices',
      description: 'List available TTS voices',
      permission_level: 'viewer',
      enabled: 1
    }
  ];
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO chat_commands (command_name, description, permission_level, enabled)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const cmd of defaultCommands) {
    insertStmt.run(cmd.command_name, cmd.description, cmd.permission_level, cmd.enabled);
  }
}
