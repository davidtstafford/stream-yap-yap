import { getDatabase } from './connection';

export interface Setting {
  key: string;
  value: string;
  updated_at?: string;
}

export interface Viewer {
  id: string;
  username: string;
  display_name?: string;
  is_moderator?: boolean;
  is_vip?: boolean;
  is_subscriber?: boolean;
  is_banned?: boolean;
  first_seen_at?: string;
  last_seen_at?: string;
  message_count?: number;
}

export interface ChatMessage {
  id?: number;
  viewer_id: string;
  username: string;
  display_name?: string;
  message: string;
  timestamp: string;
  emotes?: string;
  badges?: string;
  was_read_by_tts?: boolean;
}

export class DatabaseService {
  // Settings
  static getSetting(key: string): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as Setting | undefined;
    return row?.value || null;
  }

  static setSetting(key: string, value: string): void {
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(key, value);
  }

  static getAllSettings(): Setting[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM settings').all() as Setting[];
  }

  // Viewers
  static upsertViewer(viewer: Viewer): void {
    const db = getDatabase();
    
    // Case-insensitive: store username in lowercase
    const username = viewer.username.toLowerCase();
    
    db.prepare(`
      INSERT INTO viewers (id, username, display_name, is_moderator, is_vip, is_subscriber, is_banned, first_seen_at, last_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        display_name = excluded.display_name,
        is_moderator = COALESCE(excluded.is_moderator, viewers.is_moderator),
        is_vip = COALESCE(excluded.is_vip, viewers.is_vip),
        is_subscriber = COALESCE(excluded.is_subscriber, viewers.is_subscriber),
        is_banned = COALESCE(excluded.is_banned, viewers.is_banned),
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      viewer.id,
      username,
      viewer.display_name || viewer.username,
      viewer.is_moderator !== undefined ? (viewer.is_moderator ? 1 : 0) : null,
      viewer.is_vip !== undefined ? (viewer.is_vip ? 1 : 0) : null,
      viewer.is_subscriber !== undefined ? (viewer.is_subscriber ? 1 : 0) : null,
      viewer.is_banned !== undefined ? (viewer.is_banned ? 1 : 0) : null
    );
  }

  static getViewerById(id: string): Viewer | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM viewers WHERE id = ?').get(id) as Viewer | undefined;
    return row || null;
  }

  static getViewerByUsername(username: string): Viewer | null {
    const db = getDatabase();
    // Case-insensitive: convert to lowercase for lookup
    const row = db.prepare('SELECT * FROM viewers WHERE username = ?').get(username.toLowerCase()) as Viewer | undefined;
    return row || null;
  }

  static getAllViewers(): Viewer[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM viewers ORDER BY last_seen_at DESC').all() as Viewer[];
  }

  static incrementViewerMessageCount(viewerId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE viewers SET message_count = message_count + 1 WHERE id = ?').run(viewerId);
  }

  static updateViewerModStatus(viewerId: string, isMod: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE viewers SET is_moderator = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isMod ? 1 : 0, viewerId);
  }

  static updateViewerVipStatus(viewerId: string, isVip: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE viewers SET is_vip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isVip ? 1 : 0, viewerId);
  }

  static updateViewerSubscriberStatus(viewerId: string, isSub: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE viewers SET is_subscriber = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isSub ? 1 : 0, viewerId);
  }

  static updateViewerBannedStatus(viewerId: string, isBanned: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE viewers SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isBanned ? 1 : 0, viewerId);
  }

  static resetViewerStatuses(): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE viewers 
      SET is_moderator = 0, is_vip = 0, is_subscriber = 0, is_banned = 0, updated_at = CURRENT_TIMESTAMP
    `).run();
  }

  // Chat Messages (batched inserts for performance)
  static insertChatMessages(messages: ChatMessage[]): void {
    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO chat_messages (viewer_id, username, display_name, message, timestamp, emotes, badges, was_read_by_tts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((msgs: ChatMessage[]) => {
      for (const msg of msgs) {
        insertStmt.run(
          msg.viewer_id,
          msg.username.toLowerCase(), // Case-insensitive storage
          msg.display_name || msg.username,
          msg.message,
          msg.timestamp,
          msg.emotes || null,
          msg.badges || null,
          msg.was_read_by_tts ? 1 : 0
        );
      }
    });

    insertMany(messages);
  }

  static getChatHistory(limit: number = 100, offset: number = 0): ChatMessage[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as ChatMessage[];
  }

  static searchChatHistory(searchTerm: string, limit: number = 100): ChatMessage[] {
    const db = getDatabase();
    // Case-insensitive search
    const term = `%${searchTerm.toLowerCase()}%`;
    return db.prepare(`
      SELECT * FROM chat_messages 
      WHERE LOWER(username) LIKE ? OR LOWER(message) LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(term, term, limit) as ChatMessage[];
  }

  static clearChatHistory(): void {
    const db = getDatabase();
    db.prepare('DELETE FROM chat_messages').run();
  }

  // Voice Preferences
  static setVoicePreference(viewerId: string, voiceId: string, provider: string): void {
    const db = getDatabase();
    // Case-insensitive: store voice_id in lowercase
    db.prepare(`
      INSERT INTO viewer_voice_preferences (viewer_id, voice_id, provider, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(viewer_id) DO UPDATE SET
        voice_id = excluded.voice_id,
        provider = excluded.provider,
        updated_at = CURRENT_TIMESTAMP
    `).run(viewerId, voiceId.toLowerCase(), provider);
  }

  static getVoicePreference(viewerId: string): { voice_id: string; provider: string } | null {
    const db = getDatabase();
    const row = db.prepare('SELECT voice_id, provider FROM viewer_voice_preferences WHERE viewer_id = ?')
      .get(viewerId) as { voice_id: string; provider: string } | undefined;
    return row || null;
  }

  // TTS Restrictions
  static muteViewer(viewerId: string, periodMinutes: number | null = null): void {
    const db = getDatabase();
    const expiresAt = periodMinutes ? 
      new Date(Date.now() + periodMinutes * 60000).toISOString() : 
      null;
    
    db.prepare(`
      INSERT INTO viewer_tts_restrictions (viewer_id, is_muted, mute_period_mins, muted_at, mute_expires_at, updated_at)
      VALUES (?, 1, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(viewer_id) DO UPDATE SET
        is_muted = 1,
        mute_period_mins = excluded.mute_period_mins,
        muted_at = CURRENT_TIMESTAMP,
        mute_expires_at = excluded.mute_expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(viewerId, periodMinutes, expiresAt);
  }

  static unmuteViewer(viewerId: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE viewer_tts_restrictions 
      SET is_muted = 0, mute_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE viewer_id = ?
    `).run(viewerId);
  }

  static isViewerMuted(viewerId: string): boolean {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT is_muted, mute_expires_at FROM viewer_tts_restrictions WHERE viewer_id = ?
    `).get(viewerId) as { is_muted: number; mute_expires_at: string | null } | undefined;
    
    if (!row || !row.is_muted) return false;
    
    // Check if mute has expired
    if (row.mute_expires_at) {
      const expiresAt = new Date(row.mute_expires_at);
      if (expiresAt < new Date()) {
        // Mute expired, auto-unmute
        this.unmuteViewer(viewerId);
        return false;
      }
    }
    
    return true;
  }
}
