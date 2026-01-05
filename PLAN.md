# Stream Yap Yap - Development Plan

## Executive Summary

**Stream Yap Yap** is a focused, stable Twitch Chat-to-TTS application that combines the reliability of Stream Mesh with the UI/UX features of Stream Synth, while avoiding the complexity and instability issues that plagued Stream Synth.

### Core Philosophy
- **Simplicity First**: Avoid over-engineering and unnecessary database writes
- **Proven Patterns**: Use TMI.js (like Stream Mesh) instead of EventSub WebSockets
- **Stability Over Features**: Prioritize reliability and message capture rate
- **Selective Database Usage**: Only persist what's truly needed
- **Case Insensitivity**: All user inputs (usernames, voice names, command arguments) must be handled case-insensitively to prevent issues with mixed capitalization

---

## Problem Statement

### Stream Mesh Issues
- ❌ Locked to AWS Polly only
- ❌ Built generically for multi-platform (unnecessary complexity)
- ❌ Outdated UI patterns
- ✅ Stable and reliable TMI.js implementation
- ✅ Excellent TTS queue management (no overlapping)
- ✅ Great OBS browser source integration

### Stream Synth Issues
- ❌ 30% message loss in production
- ❌ Over-complicated architecture (EventSub → DB → Event Bus → Action)
- ❌ Database write bottlenecks causing failures
- ❌ Chat commands not working reliably
- ❌ Overall instability
- ✅ Great TTS UI/UX design
- ✅ Multi-provider TTS support (WebSpeech, AWS, Azure, GCP)
- ✅ Excellent viewer management features

### Solution: Stream Yap Yap
Combine the stability of Stream Mesh (TMI.js, simple architecture) with the features of Stream Synth (multi-provider TTS, viewer management), while eliminating unnecessary complexity.

---

## Architecture Decisions

### 1. Chat Capture: TMI.js (Like Stream Mesh)
**Why TMI.js over EventSub WebSockets?**
- Stream Mesh proves TMI.js is stable and reliable
- Stream Synth's EventSub + DB-first approach caused 30% message loss
- TMI.js provides direct, low-latency chat messages
- No intermediate database writes for real-time chat

**Implementation:**
```
Twitch Chat → TMI.js → In-Memory Queue → TTS Processing
                     ↓
                 UI Update (React State)
                     ↓
                 Database (History Only)
```

### 2. Database Strategy: Minimal & Async
**Philosophy**: Database is for persistence, NOT for event routing

**What Gets Stored:**
- ✅ Chat history (async, batched)
- ✅ Viewer list and metadata
- ✅ Voice preferences per viewer
- ✅ TTS restrictions (mute/cooldown)
- ✅ Settings and configuration
- ✅ Discord bot settings

**What Does NOT Get Stored:**
- ❌ Real-time chat flow (use React state)
- ❌ Intermediate TTS processing states
- ❌ Active TTS queue

**Implementation:**
- Use `better-sqlite3` (proven in Stream Synth)
- Batch writes for chat history (every 5 seconds or 50 messages)
- All database writes are async and non-blocking
- Failed writes don't break TTS processing

### 3. TTS Queue: In-Memory with OBS Export
**Based on Stream Mesh's proven queue system:**
- Sequential playback (FIFO)
- No overlapping audio
- Support for both in-app playback and OBS browser source
- Mute in-app option when using OBS (prevent echo)
- Provider-agnostic (works with WebSpeech, AWS, Azure, GCP)

### 4. Technology Stack

**Backend:**
- `Electron` - Desktop application framework
- `better-sqlite3` - Embedded SQL database
- `tmi.js` - Twitch IRC/chat client (proven stability)
- `@aws-sdk/client-polly` - AWS TTS
- `microsoft-cognitiveservices-speech-sdk` - Azure TTS
- `@google-cloud/text-to-speech` - Google Cloud TTS
- `discord.js` - Discord bot integration
- `express` - HTTP server for browser source

**Frontend:**
- `React 18` - UI framework
- `TypeScript` - Type safety
- `CSS` - Styling (keep it simple)

**Build:**
- `Webpack` - Bundling
- `electron-builder` - Distribution

---

## Database Schema

### 1. `settings` Table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Stores:**
- Twitch auth token (encrypted)
- Twitch username
- TTS provider settings
- Default voice settings
- Volume/speed/pitch defaults
- OBS browser source enabled
- Mute in-app when using OBS

### 2. `viewers` Table
```sql
CREATE TABLE viewers (
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
```

### 3. `chat_messages` Table
```sql
CREATE TABLE chat_messages (
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

CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX idx_chat_viewer ON chat_messages(viewer_id);
```

### 4. `viewer_voice_preferences` Table
```sql
CREATE TABLE viewer_voice_preferences (
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
```

### 5. `viewer_tts_restrictions` Table
```sql
CREATE TABLE viewer_tts_restrictions (
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
```

### 6. `tts_voices` Table
```sql
CREATE TABLE tts_voices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,           -- 'webspeech', 'aws', 'azure', 'google'
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  region TEXT,
  gender TEXT,
  is_available BOOLEAN DEFAULT 1,   -- Track if voice is currently available
  last_scanned_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(voice_id, provider)
);

CREATE INDEX idx_voices_provider ON tts_voices(provider);
CREATE INDEX idx_voices_language ON tts_voices(language_name);
```

### 7. `chat_commands` Table
```sql
CREATE TABLE chat_commands (
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
```

### 8. `command_usage` Table
```sql
CREATE TABLE command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  username TEXT NOT NULL,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (viewer_id) REFERENCES viewers(id)
);

CREATE INDEX idx_usage_command ON command_usage(command_name);
CREATE INDEX idx_usage_timestamp ON command_usage(timestamp DESC);
```

### 9. `tts_access_redeems` Table
```sql
CREATE TABLE tts_access_redeems (
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

CREATE INDEX idx_redeems_viewer ON tts_access_redeems(viewer_id);
CREATE INDEX idx_redeems_active ON tts_access_redeems(is_active, expires_at);
```

### 10. `discord_settings` Table
```sql
CREATE TABLE discord_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Stores:**
- bot_token (encrypted)
- bot_id
- bot_status
- auto_start_enabled

---

## Feature Breakdown

### Navigation Structure

```
┌─────────────────────────────────────────────────────┐
│  Stream Yap Yap                                     │
├─────────────────────────────────────────────────────┤
│ 📡 Connection                                       │
│ 💬 Chat                                             │
│ 📜 Chat History                                     │
│ 👥 Viewers                                          │
│ 🔊 TTS                                              │
│    ├─ Main (Connect & Configure)                   │
│    ├─ TTS Rules                                     │
│    ├─ TTS Access                                    │
│    ├─ Viewer Voice Settings                        │
│    └─ Viewer TTS Restrictions                      │
│ ⚡ Chat Commands                                    │
│ 🎮 Discord Bot                                      │
└─────────────────────────────────────────────────────┘
```

---

## Detailed Feature Specifications

### 1. Connection Screen

**Purpose:** Authenticate with Twitch and manage connection state

**UI Elements:**
- Connection status indicator (connected/disconnected)
- Username display when connected
- "Connect to Twitch" button (OAuth flow)
- "Disconnect" button
- "Forget Credentials" button
- Auto-connect toggle (default: ON)

**Implementation:**
```typescript
// OAuth flow using Twitch's OAuth2
// Store encrypted token in database
// Auto-connect on app launch if token exists
// Use TMI.js for connection (NOT EventSub)
```

**Persistence:**
- Store `twitch_token` (encrypted) in `settings` table
- Store `twitch_username` in `settings` table
- Store `auto_connect` boolean in `settings` table

---

### 2. Chat Screen

**Purpose:** Display real-time chat messages as they come in

**UI Elements:**
- Live scrolling chat feed
- Username + message display
- Badges display (mod, VIP, subscriber)
- Timestamp per message
- Auto-scroll toggle
- "Clear Chat" button
- TTS indicator (🔊 when message is being read)

**Implementation:**
```typescript
// TMI.js message event → React state update
// Display in UI immediately (no database delay)
// Batch write to database every 5 seconds
// Max 500 messages in UI state (performance)
```

**Data Flow:**
```
TMI.js 'message' event
  → Parse message + userstate
  → Update React state (instant UI update)
  → Add to batch queue for DB write
  → Process for TTS (if enabled)
```

---

### 3. Chat History Screen

**Purpose:** View and search historical chat messages

**UI Elements:**
- Table/list of past messages
- Search bar (username or message content)
- Date range filter
- Viewer filter (dropdown)
- Pagination (50 messages per page)
- Export to CSV button
- "Clear All History" button (with confirmation)

**Implementation:**
```sql
-- Query with filters
SELECT * FROM chat_messages
WHERE username LIKE ?
  AND message LIKE ?
  AND timestamp BETWEEN ? AND ?
ORDER BY timestamp DESC
LIMIT 50 OFFSET ?;
```

---

### 4. Viewers Screen

**Purpose:** Manage viewer list and permissions

**UI Elements:**
- Table of all viewers with columns:
  - Username / Display Name
  - Moderator status (✓/✗)
  - VIP status (✓/✗)
  - Subscriber status (✓/✗)
  - Banned status (✓/✗)
  - Message count
  - Last seen
- Search bar (filter by username)
- Status filter (All / Mods / VIPs / Subscribers / Banned)
- "Sync Status" button (fetches from Twitch API)
- "Auto-sync on startup" toggle

**Action Buttons per Viewer:**
- Make/Remove Moderator
- Add/Remove VIP
- Ban/Unban

**Twitch API Integration:**
```typescript
// API endpoints to use:
// GET /moderation/moderators - Get mod list
// POST /moderation/moderators - Add mod
// DELETE /moderation/moderators - Remove mod
// GET /channels/vips - Get VIP list
// POST /channels/vips - Add VIP
// DELETE /channels/vips - Remove VIP
// GET /moderation/banned - Get ban list
// POST /moderation/bans - Ban user
// DELETE /moderation/bans - Unban user
// GET /subscriptions/user - Check if user is subscribed
```

---

### 5. TTS Main Screen

**Purpose:** Configure TTS providers and global settings

**UI Sections:**

#### A. Provider Connection
- **WebSpeech**
  - Toggle: Enable/Disable
  - Info: "Uses browser's built-in voices (free)"
  
- **AWS Polly**
  - Toggle: Enable/Disable
  - Engine selector: Standard / Neural
  - Access Key input
  - Secret Key input
  - Region dropdown
  - "Test Connection" button
  
- **Azure Cognitive Services**
  - Toggle: Enable/Disable
  - Subscription Key input
  - Region dropdown
  - "Test Connection" button
  
- **Google Cloud TTS**
  - Toggle: Enable/Disable
  - Service Account JSON upload
  - "Test Connection" button

#### B. Default Voice Settings
- Voice dropdown (all available voices from enabled providers)
- Volume slider (0-100%)
- Speed slider (0.5x - 2.0x)
- Pitch slider (-10 to +10 semitones)
- Test text input box
- "Test Voice" button (speaks the test text)

#### C. OBS Browser Source
- Toggle: Enable OBS Browser Source
- URL display (e.g., `http://localhost:8765/tts-overlay`)
- "Copy URL" button
- Toggle: Mute in-app when using OBS (prevent echo)

**Voice Management:**
- Scan button: "Scan for Voices" (updates database with available voices)
- Last scanned timestamp display
- Auto-scan on app startup (if enabled in settings)

---

### 6. TTS Rules Screen

**Purpose:** Configure message filtering and TTS behavior

**Based on:** `TTSRulesTab.tsx` from Stream Synth

**Sections:**

#### A. Message Filtering
- ☑ Filter out commands (messages starting with ~ or !)
- ☑ Filter out URLs (messages containing links)
- ☑ Filter out bots
  - Default bot list: Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Wizebot
  - Custom bot list editor (add/remove usernames)

#### B. Username Announcement
- ☑ Announce username before message
- Announcement style:
  - "Username says: message"
  - "From Username: message"
  - "Username: message"
  - Just the message (no username)

#### C. Message Length Limits
- Min message length slider (0-50 characters)
- Max message length slider (50-500 characters)

#### D. Duplicate Detection
- ☑ Skip duplicate messages
- Duplicate detection window (60-600 seconds)

#### E. Rate Limiting & Cooldowns
- **Per-User Cooldown:**
  - ☑ Enable user cooldown
  - Cooldown period slider (5-300 seconds)
  
- **Global Cooldown:**
  - ☑ Enable global cooldown
  - Cooldown period slider (1-60 seconds)

#### F. Emote & Emoji Limits
- ☑ Limit emotes per message
- Max emotes slider (1-20)
- ☑ Limit emojis per message
- Max emojis slider (1-20)

#### G. Character Repetition
- ☑ Limit repeated characters
- Max repetition slider (1-10)
- Example: "heeeeello" → "helo"

#### H. Blocked Words
- Word input box
- Add button
- List of blocked words with remove buttons
- Case-insensitive matching

---

### 7. TTS Access Screen

**Purpose:** Restrict TTS usage to specific user groups or redeems

**Master Toggle:**
- ☑ Limit TTS Access
  - When OFF: Everyone can use TTS (default)
  - When ON: Only selected groups can use TTS

**Access Groups (checkboxes, when master toggle is ON):**
- ☑ Subscribers
- ☑ VIPs
- ☑ Moderators
- ☑ Redeem Users

**Redeem Configuration (when Redeem Users is checked):**
- Redeem Name input: "Give Me TTS"
- Duration input: 30 (minutes)
- Info text: "Users who redeem this channel point reward will get TTS access for the specified duration"

**Active Redeems Table:**
- Columns: Username | Redeemed At | Expires At | Time Remaining
- Action: "Remove Access" button per row

**Implementation:**
```typescript
// Listen for EventSub channel.channel_points_custom_reward_redemption.add
// When redeem matches configured name:
//   1. Add entry to tts_access_redeems table
//   2. Grant TTS access for duration
//   3. Automatically expire when time is up

// Before processing TTS:
//   - Check if master toggle is ON
//   - If yes, verify user has at least one access method
//   - If no access, skip TTS for this message
```

---

### 8. Viewer Voice Settings Screen

**Purpose:** Set custom voice preferences per viewer

**Based on:** `ViewerVoiceSettingsTab.tsx` from Stream Synth

**UI Flow:**

#### A. Viewer Search
- Search input box (search by username)
- Dropdown of search results
- Select viewer to configure

#### B. Voice Selection Panel (when viewer is selected)
- **Voice Filters:**
  - Provider filter (All / WebSpeech / AWS / Azure / Google)
  - Language filter dropdown
  - Gender filter dropdown
  - Voice search input
  
- **Voice List:**
  - Dropdown or list of filtered voices
  - Format: "Voice Name (Language, Gender, Provider)"
  
- **Voice Settings:**
  - Pitch slider (-10 to +10)
  - Speed slider (0.5x - 2.0x)
  - Volume slider (0-100%)
  
- **Actions:**
  - "Test Voice" button
  - "Save" button
  - "Cancel" button

#### C. Existing Settings Table
- Columns: Viewer | Voice | Provider | Pitch | Speed | Volume | Actions
- Actions: Edit button, Delete button

**Validation:**
- Warning if voice requires premium provider and user doesn't have access
- Example: "⚠️ This voice requires Premium Voice Access. If this viewer doesn't have access (subscriber/VIP/active redeem), the global default voice will be used instead."

---

### 9. Viewer TTS Restrictions Screen

**Purpose:** Mute or apply cooldowns to specific viewers

**Based on:** `ViewerTTSRestrictionsTab.tsx` from Stream Synth

**UI Sections:**

#### A. Add Restriction
- Viewer search input
- Search results dropdown
- Select viewer

**Restriction Type:**
- Radio buttons: Mute / Cooldown

**Mute Configuration (if Mute selected):**
- Duration input (minutes)
- 0 = permanent mute
- "Apply Mute" button

**Cooldown Configuration (if Cooldown selected):**
- Cooldown gap input (seconds between TTS)
- Duration input (minutes)
- 0 = permanent cooldown
- "Apply Cooldown" button

#### B. Muted Users Table
- Columns: Username | Muted At | Expires At | Time Remaining | Actions
- Actions: "Remove Mute" button

#### C. Cooldown Users Table
- Columns: Username | Gap (seconds) | Set At | Expires At | Time Remaining | Actions
- Actions: "Remove Cooldown" button

**Real-time Updates:**
- Poll backend every 30 seconds for changes
- Listen for IPC events when restrictions change
- Update "Time Remaining" displays every 10 seconds

**Chat Command Integration:**
- Commands like `~mutevoice @username 30` should update this table
- Commands like `~unmutevoice @username` should update this table

---

### 10. Chat Commands Screen

**Purpose:** Configure and manage chat commands

**Based on:** `chat-commands.tsx` from Stream Synth

**UI Layout:**

#### A. Command Information Box
- Info text: "All commands use the `~` prefix by default (e.g., `~hello`)"
- List of available commands by permission level

#### B. Commands Table
- Columns:
  - Command Name (e.g., "hello")
  - Prefix (e.g., "~")
  - Enabled (toggle)
  - Permission Level (Viewer / Moderator / Broadcaster)
  - Rate Limit (seconds)
  - Actions (Edit / View Stats)

**Available Commands:**

| Command | Permission | Default Response | Purpose |
|---------|------------|------------------|---------|
| `~hello` | Viewer | "Hello, {username}!" | Greeting |
| `~voices` | Viewer | Link to voices webpage | Show available voices |
| `~setvoice` | Viewer | "Voice set to {voiceId}" | Set own voice |
| `~setvoicepitch` | Viewer | "Pitch set to {pitch}" | Set own pitch |
| `~setvoicespeed` | Viewer | "Speed set to {speed}" | Set own speed |
| `~mutevoice` | Moderator | "Muted {username} for {duration}" | Mute user's TTS |
| `~unmutevoice` | Moderator | "Unmuted {username}" | Unmute user's TTS |
| `~cooldownvoice` | Moderator | "Cooldown set for {username}" | Apply TTS cooldown |
| `~mutetts` | Moderator | "TTS muted globally" | Disable all TTS |
| `~unmutetts` | Moderator | "TTS unmuted globally" | Enable all TTS |

#### C. Edit Command Modal
When clicking "Edit" on a command:
- Enabled toggle
- Permission level dropdown (Viewer / Moderator / Broadcaster)
- Rate limit input (seconds)
- Custom response textarea (optional override)
- "Save" / "Cancel" buttons

#### D. Usage Stats Modal
When clicking "View Stats":
- Table of recent command usage:
  - Columns: Username | Timestamp | Success/Failure | Error Message
- "Close" button

---

### 11. Discord Bot Screen

**Purpose:** Enable Discord voice discovery integration

**Based on:** `discord-bot.tsx` from Stream Synth

**UI Sections:**

#### A. Bot Status
- Connection indicator (🟢 Connected / 🔴 Disconnected)
- Bot ID display (when connected)
- Latency display (when connected)
- Uptime display (when connected)

#### B. Bot Configuration
- Bot Token input (password field)
- "Save Token" button
- Token saved indicator
- "Show Setup Guide" button

#### C. Bot Controls
- "Start Bot" button (disabled if no token)
- "Stop Bot" button (enabled when connected)
- Auto-start on app launch toggle

#### D. Setup Guide Modal
Step-by-step wizard:

**Step 1: Create Discord Application**
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name and create
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy bot token
7. Enable "Message Content Intent" (required for slash commands)

**Step 2: Enter Bot Token**
- Token input field
- "Save and Continue" button

**Step 3: Generate Bot Invite URL**
- Show generated invite URL with proper scopes:
  - `bot` scope
  - `applications.commands` scope
  - Permissions: Send Messages, Use Slash Commands
- "Copy Invite URL" button

**Step 4: Invite Bot to Server**
- Instructions to paste URL and invite bot
- "I've invited the bot" button

**Step 5: Start Using Voice Discovery**
- Instructions for using `/voices` command in Discord
- "Done" button (closes modal)

**Discord Bot Functionality:**
- Slash command: `/voices` - Search and display available TTS voices
- Slash command: `/voice <voice_name>` - Set TTS voice (requires Twitch link)
- Pagination for voice list (25 voices per page)
- Voice filtering by provider, language, gender

---

## Implementation Phases

### Phase 1: Core Foundation (Week 1)
- [ ] Project setup (Electron + React + TypeScript + Webpack)
- [ ] Database setup (better-sqlite3 + migrations)
- [ ] Settings persistence
- [ ] Navigation structure
- [ ] Connection screen (Twitch OAuth)
- [ ] TMI.js integration (connect to chat)

### Phase 2: Chat & History (Week 1-2)
- [ ] Real-time chat display
- [ ] Chat message batching to database
- [ ] Chat history screen with search/filters
- [ ] Viewer tracking (auto-populate from chat)

### Phase 3: Viewer Management (Week 2)
- [ ] Viewers screen
- [ ] Twitch API integration (mod/VIP/ban/subscriber status)
- [ ] Sync functionality
- [ ] Mod/VIP/Ban actions

### Phase 4: TTS Core (Week 2-3)
- [ ] TTS Main screen
- [ ] WebSpeech integration
- [ ] AWS Polly integration
- [ ] Azure TTS integration
- [ ] Google Cloud TTS integration
- [ ] Voice scanning and database storage
- [ ] Default voice settings
- [ ] Voice testing

### Phase 5: TTS Queue & Playback (Week 3)
- [ ] In-memory TTS queue (based on Stream Mesh)
- [ ] Sequential playback (no overlapping)
- [ ] In-app audio playback
- [ ] OBS browser source server
- [ ] Browser source HTML/JS
- [ ] Mute in-app option

### Phase 6: TTS Rules (Week 3-4)
- [ ] TTS Rules screen
- [ ] Message filtering logic
- [ ] Username announcement
- [ ] Length limits
- [ ] Duplicate detection
- [ ] Rate limiting & cooldowns
- [ ] Emote/emoji limits
- [ ] Character repetition limits
- [ ] Blocked words

### Phase 7: TTS Access Control (Week 4)
- [ ] TTS Access screen
- [ ] Access restriction logic (subscriber/VIP/mod)
- [ ] Twitch redeem EventSub listener
- [ ] Redeem-based access grants
- [ ] Active redeems table

### Phase 8: Per-Viewer Customization (Week 4-5)
- [ ] Viewer Voice Settings screen
- [ ] Voice preference storage per viewer
- [ ] Viewer TTS Restrictions screen
- [ ] Mute functionality
- [ ] Cooldown functionality
- [ ] Real-time updates and expiration

### Phase 9: Chat Commands (Week 5)
- [ ] Chat Commands screen
- [ ] Command processor integration with TMI.js
- [ ] All viewer commands (~hello, ~voices, ~setvoice, etc.)
- [ ] All moderator commands (~mutevoice, ~unmutevoice, etc.)
- [ ] Command usage tracking
- [ ] Rate limiting enforcement

### Phase 10: Discord Bot (Week 5-6)
- [ ] Discord Bot screen
- [ ] Discord bot client (discord.js)
- [ ] Slash command registration
- [ ] /voices command with pagination
- [ ] /voice command for setting preference
- [ ] Setup guide modal

### Phase 11: Polish & Testing (Week 6)
- [ ] Error handling and user feedback
- [ ] Loading states
- [ ] Confirmation dialogs
- [ ] UI polish
- [ ] Performance optimization
- [ ] Stability testing
- [ ] Message capture rate testing

### Phase 12: Build & Distribution (Week 6)
- [ ] electron-builder configuration
- [ ] macOS build
- [ ] Windows build (optional)
- [ ] Documentation
- [ ] README with setup instructions

---

## File Structure

```
stream-yap-yap/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── PLAN.md (this file)
├── README.md
├── assets/
│   ├── icon.icns
│   └── icon.png
├── src/
│   ├── main.ts                        # Electron main process
│   ├── preload.ts                     # Electron preload script
│   ├── index.html                     # Frontend entry
│   │
│   ├── backend/
│   │   ├── database/
│   │   │   ├── connection.ts          # Database initialization
│   │   │   ├── migrations.ts          # Schema migrations
│   │   │   └── repositories/
│   │   │       ├── settings.repository.ts
│   │   │       ├── viewers.repository.ts
│   │   │       ├── chat-messages.repository.ts
│   │   │       ├── voice-preferences.repository.ts
│   │   │       ├── tts-restrictions.repository.ts
│   │   │       ├── tts-voices.repository.ts
│   │   │       ├── chat-commands.repository.ts
│   │   │       ├── command-usage.repository.ts
│   │   │       ├── tts-access-redeems.repository.ts
│   │   │       └── discord-settings.repository.ts
│   │   │
│   │   ├── services/
│   │   │   ├── twitch-oauth.service.ts         # OAuth flow
│   │   │   ├── twitch-irc.service.ts           # TMI.js wrapper
│   │   │   ├── twitch-api.service.ts           # Twitch API calls
│   │   │   ├── twitch-eventsub.service.ts      # EventSub (for redeems only)
│   │   │   ├── chat-command.service.ts         # Command processor
│   │   │   ├── tts-queue.service.ts            # TTS queue manager
│   │   │   ├── tts-webspeech.service.ts        # WebSpeech provider
│   │   │   ├── tts-aws.service.ts              # AWS Polly provider
│   │   │   ├── tts-azure.service.ts            # Azure TTS provider
│   │   │   ├── tts-google.service.ts           # Google Cloud TTS provider
│   │   │   ├── tts-voice-scanner.service.ts    # Voice discovery
│   │   │   ├── tts-access-control.service.ts   # Access restrictions
│   │   │   ├── tts-rules.service.ts            # Message filtering
│   │   │   ├── browser-source-server.service.ts # HTTP server for OBS
│   │   │   ├── discord-bot.service.ts          # Discord bot client
│   │   │   └── crypto.service.ts               # Encrypt/decrypt tokens
│   │   │
│   │   ├── ipc/
│   │   │   ├── connection.handlers.ts
│   │   │   ├── chat.handlers.ts
│   │   │   ├── viewers.handlers.ts
│   │   │   ├── tts.handlers.ts
│   │   │   ├── chat-commands.handlers.ts
│   │   │   └── discord.handlers.ts
│   │   │
│   │   └── public/
│   │       ├── tts-browser-source.html         # OBS overlay
│   │       ├── tts-browser-source.js
│   │       └── tts-browser-source.css
│   │
│   └── frontend/
│       ├── app.tsx                    # Root React component
│       ├── components/
│       │   ├── Menu.tsx               # Navigation menu
│       │   ├── StatusIndicator.tsx
│       │   ├── VoiceSelector.tsx
│       │   ├── ViewerSearch.tsx
│       │   └── ConfirmDialog.tsx
│       │
│       ├── screens/
│       │   ├── Connection.tsx
│       │   ├── Chat.tsx
│       │   ├── ChatHistory.tsx
│       │   ├── Viewers.tsx
│       │   ├── TTS/
│       │   │   ├── TTSMain.tsx
│       │   │   ├── TTSRules.tsx
│       │   │   ├── TTSAccess.tsx
│       │   │   ├── ViewerVoiceSettings.tsx
│       │   │   └── ViewerTTSRestrictions.tsx
│       │   ├── ChatCommands.tsx
│       │   └── DiscordBot.tsx
│       │
│       ├── hooks/
│       │   ├── useConnection.ts
│       │   ├── useChat.ts
│       │   ├── useViewers.ts
│       │   ├── useTTS.ts
│       │   └── useIPC.ts
│       │
│       ├── types/
│       │   ├── twitch.types.ts
│       │   ├── tts.types.ts
│       │   ├── chat.types.ts
│       │   └── viewer.types.ts
│       │
│       └── styles/
│           ├── app.css
│           ├── connection.css
│           ├── chat.css
│           ├── viewers.css
│           ├── tts.css
│           └── commands.css
│
└── release/                           # Built apps (electron-builder output)
```

---

## Key Technical Decisions

### 1. Why TMI.js instead of EventSub?
**Evidence from existing apps:**
- Stream Mesh uses TMI.js → stable, no message loss
- Stream Synth uses EventSub → 30% message loss, unreliable

**Reasoning:**
- TMI.js connects directly to Twitch IRC
- Lower latency, simpler architecture
- No database dependency for chat flow
- EventSub only needed for channel point redeems (TTS Access feature)

### 2. Why Batch Database Writes?
**Problem in Stream Synth:**
- Every message → immediate DB write → blocking
- Under load, writes fail → messages lost → TTS fails

**Solution in Stream Yap Yap:**
- Messages → React state (instant UI update)
- Messages → in-memory queue
- Batch write every 5 seconds OR 50 messages
- If DB write fails, chat and TTS still work

### 3. Why In-Memory TTS Queue?
**Based on Stream Mesh's proven pattern:**
- Queue in memory, not database
- Simple FIFO structure
- No overlapping audio (wait for current to finish)
- Database only for history/config, not active processing

### 4. Provider-Agnostic TTS
**Support 4 providers:**
1. **WebSpeech** (free, built-in, low quality)
2. **AWS Polly** (paid, high quality, neural voices)
3. **Azure** (paid, high quality, extensive language support)
4. **Google Cloud** (paid, high quality, WaveNet voices)

**Implementation:**
- Abstract interface for all providers
- Voice database tracks all available voices
- User selects default voice (any provider)
- Per-viewer voice overrides (any provider)

---

## Critical Success Factors

### 1. Zero Message Loss
- Use TMI.js (proven)
- Async database writes
- No blocking operations in chat flow

### 2. Stable TTS Playback
- Sequential queue (based on Stream Mesh)
- No overlapping audio
- Handle provider failures gracefully

### 3. Responsive UI
- React state for real-time updates
- Database reads/writes off main thread
- Loading states for all async operations

### 4. Easy Setup
- OAuth flow for Twitch
- Clear provider setup instructions
- Auto-scan for voices
- Helpful error messages

### 5. OBS Integration
- Simple browser source URL
- No manual configuration needed
- Mute in-app option to prevent echo

---

## Success Metrics

1. **Message Capture Rate**: >99% (compared to Stream Synth's 70%)
2. **TTS Reliability**: No audio overlaps, sequential playback
3. **Command Success Rate**: >95% (compared to Stream Synth's failures)
4. **Startup Time**: <5 seconds from launch to connected
5. **Provider Uptime**: Handle provider failures without crashing

---

## Risk Mitigation

### Risk 1: Database Bottlenecks
**Mitigation:**
- Batch writes (5 seconds / 50 messages)
- Async all database operations
- Failed writes don't crash app
- Chat and TTS work even if DB is down

### Risk 2: TTS Provider Failures
**Mitigation:**
- Fallback to default voice if custom voice fails
- Fallback to WebSpeech if paid provider fails
- Clear error messages to user
- Continue processing queue even with errors

### Risk 3: TMI.js Disconnections
**Mitigation:**
- Auto-reconnect (built into tmi.js)
- Connection status indicator in UI
- Reconnect button for manual retry
- Queue messages during disconnect, process on reconnect

### Risk 4: Memory Leaks
**Mitigation:**
- Limit in-memory chat to 500 messages
- Limit TTS queue to 50 items
- Clean up audio files after playback
- Regular memory monitoring during testing

---

## Testing Strategy

### Unit Tests
- TTS queue operations
- Message filtering logic
- Voice selection logic
- Access control logic

### Integration Tests
- TMI.js → Chat UI flow
- Chat → TTS → Audio playback flow
- Command processing → Database → UI update
- Twitch API → Viewer status → UI update

### Load Tests
- 1000 messages/minute (typical stream)
- 100 concurrent TTS requests
- Database batch write under load
- Memory usage over 24 hours

### Real-World Tests
- Test with live Twitch stream
- Measure message capture rate
- Measure TTS reliability
- Measure command success rate

---

## Future Enhancements (Post-Launch)

- [ ] Multi-language UI support
- [ ] Custom CSS for browser source
- [ ] TTS voice packs/presets
- [ ] Viewer-specific voice profiles (save pitch/speed/volume)
- [ ] TTS history (replay past messages)
- [ ] Message queue preview in UI
- [ ] Sound effects on commands
- [ ] Custom command responses with variables
- [ ] Web dashboard (control from phone)
- [ ] Analytics dashboard (TTS usage stats)

---

## Conclusion

Stream Yap Yap takes the best of both worlds:
- **Stream Mesh's stability**: TMI.js, simple architecture, proven TTS queue
- **Stream Synth's features**: Multi-provider TTS, viewer management, Discord bot

By avoiding Stream Synth's architectural mistakes (EventSub WebSockets, database-first design, over-complicated event routing), we achieve a stable, reliable, feature-rich Twitch Chat-to-TTS application.

**Timeline**: 6 weeks to MVP
**Tech Stack**: Electron, React, TypeScript, TMI.js, better-sqlite3
**Key Principle**: Simplicity and stability over complexity

Let's build it! 🚀
