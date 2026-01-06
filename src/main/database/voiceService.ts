import { getDatabase } from './connection';

export interface TTSVoice {
  voice_id: string;
  name: string;
  provider: string;
  language_code: string;
  language_name: string;
  region?: string;
  gender?: string;
}

export class VoiceService {
  /**
   * Scan and sync all available TTS voices from enabled providers
   * Marks previously detected voices as unavailable if no longer detected
   */
  static async scanAndSyncVoices(): Promise<void> {
    const db = getDatabase();
    const timestamp = new Date().toISOString();
    
    // Mark all existing voices as unavailable first
    db.prepare('UPDATE tts_voices SET is_available = 0, last_scanned_at = ?').run(timestamp);
    
    // Scan voices from all enabled providers
    const voices: TTSVoice[] = [];
    
    // Scan WebSpeech voices (always available in browser/Electron)
    const webSpeechVoices = await this.scanWebSpeechVoices();
    voices.push(...webSpeechVoices);
    
    // TODO: Scan AWS voices when AWS is enabled
    // TODO: Scan Azure voices when Azure is enabled
    // TODO: Scan Google voices when Google is enabled
    
    // Upsert all detected voices (marking them as available)
    const upsertStmt = db.prepare(`
      INSERT INTO tts_voices (
        voice_id, name, provider, language_code, language_name, 
        region, gender, is_available, last_scanned_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(voice_id, provider) DO UPDATE SET
        name = excluded.name,
        language_code = excluded.language_code,
        language_name = excluded.language_name,
        region = excluded.region,
        gender = excluded.gender,
        is_available = 1,
        last_scanned_at = excluded.last_scanned_at
    `);
    
    for (const voice of voices) {
      upsertStmt.run(
        voice.voice_id,
        voice.name,
        voice.provider,
        voice.language_code,
        voice.language_name,
        voice.region || null,
        voice.gender || null,
        timestamp
      );
    }
    
    console.log(`Voice scan complete: ${voices.length} voices detected`);
  }
  
  /**
   * Scan WebSpeech API voices (available in Electron renderer)
   */
  private static async scanWebSpeechVoices(): Promise<TTSVoice[]> {
    // WebSpeech voices are only available in renderer process
    // For now, return empty array - we'll populate this when UI initializes
    // In the future, we can use IPC to get voices from renderer
    return [];
  }

  /**
   * Sync WebSpeech voices from renderer process
   */
  static syncWebSpeechVoices(voices: any[]): number {
    const db = getDatabase();
    const timestamp = new Date().toISOString();
    
    // Mark all existing WebSpeech voices as unavailable
    db.prepare('UPDATE tts_voices SET is_available = 0 WHERE provider = ?').run('webspeech');
    
    const upsertStmt = db.prepare(`
      INSERT INTO tts_voices (
        voice_id, name, provider, language_code, language_name, 
        region, gender, is_available, last_scanned_at
      )
      VALUES (?, ?, 'webspeech', ?, ?, ?, ?, 1, ?)
      ON CONFLICT(voice_id, provider) DO UPDATE SET
        name = excluded.name,
        language_code = excluded.language_code,
        language_name = excluded.language_name,
        region = excluded.region,
        gender = excluded.gender,
        is_available = 1,
        last_scanned_at = excluded.last_scanned_at
    `);
    
    for (const voice of voices) {
      upsertStmt.run(
        voice.voiceURI,
        voice.name,
        voice.lang,
        voice.lang,
        null,
        null,
        timestamp
      );
    }
    
    console.log(`Voice scan complete: ${voices.length} voices detected`);
    return voices.length;
  }
  
  /**
   * Get all available voices, optionally filtered by provider
   */
  static getAvailableVoices(provider?: string): TTSVoice[] {
    const db = getDatabase();
    
    if (provider) {
      return db.prepare(`
        SELECT voice_id, name, provider, language_code, language_name, region, gender
        FROM tts_voices 
        WHERE provider = ? AND is_available = 1
        ORDER BY language_name, name
      `).all(provider) as TTSVoice[];
    }
    
    return db.prepare(`
      SELECT voice_id, name, provider, language_code, language_name, region, gender
      FROM tts_voices 
      WHERE is_available = 1
      ORDER BY provider, language_name, name
    `).all() as TTSVoice[];
  }
  
  /**
   * Get a specific voice by ID and provider (case-insensitive)
   */
  static getVoice(voiceId: string, provider: string): TTSVoice | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT voice_id, name, provider, language_code, language_name, region, gender
      FROM tts_voices 
      WHERE LOWER(voice_id) = ? AND provider = ?
    `).get(voiceId.toLowerCase(), provider) as TTSVoice | undefined;
    
    return row || null;
  }
  
  /**
   * Check if a voice is available (case-insensitive)
   */
  static isVoiceAvailable(voiceId: string, provider: string): boolean {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT is_available
      FROM tts_voices 
      WHERE LOWER(voice_id) = ? AND provider = ?
    `).get(voiceId.toLowerCase(), provider) as { is_available: number } | undefined;
    
    return row?.is_available === 1;
  }
}
