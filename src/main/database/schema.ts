export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Viewers table
CREATE TABLE IF NOT EXISTS viewers (
  id TEXT PRIMARY KEY,              -- Twitch user ID
  username TEXT NOT NULL,           -- Lowercase username
  display_name TEXT,                -- Display name (capitalization)
  is_moderator BOOLEAN DEFAULT 0,
  is_vip BOOLEAN DEFAULT 0,
  is_subscriber BOOLEAN DEFAULT 0,
  is_banned BOOLEAN DEFAULT 0,
  first_seen_at TEXT,
  last_seen_at TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_viewers_username ON viewers(username);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  emotes TEXT,                      -- JSON string
  badges TEXT,                      -- JSON string
  was_read_by_tts BOOLEAN DEFAULT 0,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_viewer ON chat_messages(viewer_id);

-- Viewer voice preferences table
CREATE TABLE IF NOT EXISTS viewer_voice_preferences (
  viewer_id TEXT PRIMARY KEY,
  voice_id TEXT NOT NULL,
  provider TEXT NOT NULL,           -- 'webspeech', 'aws', 'azure', 'google'
  pitch REAL DEFAULT 1.0,
  speed REAL DEFAULT 1.0,
  volume REAL DEFAULT 1.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

-- Viewer TTS restrictions table
CREATE TABLE IF NOT EXISTS viewer_tts_restrictions (
  viewer_id TEXT PRIMARY KEY,
  is_muted BOOLEAN DEFAULT 0,
  mute_period_mins INTEGER,         -- NULL = permanent
  muted_at TEXT,
  mute_expires_at TEXT,
  has_cooldown BOOLEAN DEFAULT 0,
  cooldown_gap_seconds INTEGER,
  cooldown_period_mins INTEGER,     -- NULL = permanent
  cooldown_set_at TEXT,
  cooldown_expires_at TEXT,
  last_tts_at TEXT,                 -- For cooldown enforcement
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

-- TTS voices table
CREATE TABLE IF NOT EXISTS tts_voices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,           -- 'webspeech', 'aws', 'azure', 'google'
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  region TEXT,
  gender TEXT,
  voice_type TEXT,                  -- 'standard', 'neural', NULL for webspeech
  is_available BOOLEAN DEFAULT 1,   -- Track if voice is currently available
  last_scanned_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(voice_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_voices_provider ON tts_voices(provider);
CREATE INDEX IF NOT EXISTS idx_voices_language ON tts_voices(language_name);

-- Chat commands table
CREATE TABLE IF NOT EXISTS chat_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL UNIQUE,
  command_prefix TEXT DEFAULT '~',
  description TEXT,
  enabled BOOLEAN DEFAULT 1,
  permission_level TEXT DEFAULT 'viewer', -- 'viewer', 'moderator', 'broadcaster'
  rate_limit_seconds INTEGER DEFAULT 0,
  custom_response TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Command usage table
CREATE TABLE IF NOT EXISTS command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  username TEXT NOT NULL,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

CREATE INDEX IF NOT EXISTS idx_usage_command ON command_usage(command_name);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON command_usage(timestamp DESC);

-- TTS access redeems table
CREATE TABLE IF NOT EXISTS tts_access_redeems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id TEXT NOT NULL,
  username TEXT NOT NULL,
  redeem_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

CREATE INDEX IF NOT EXISTS idx_redeems_viewer ON tts_access_redeems(viewer_id);
CREATE INDEX IF NOT EXISTS idx_redeems_active ON tts_access_redeems(is_active, expires_at);

-- Discord settings table
CREATE TABLE IF NOT EXISTS discord_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;
