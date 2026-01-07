// Voice Scanner Service - Scans all enabled TTS providers and updates database
import { getDatabase } from '../database/connection';
import { getAwsPollyService } from './awsPollyService';
import { getAzureTtsService } from './azureTtsService';
import { getGoogleTtsService } from './googleTtsService';
import { DatabaseService } from '../database/service';

export interface VoiceScanResult {
  provider: string;
  voicesFound: number;
  success: boolean;
  error?: string;
}

export class VoiceScannerService {
  /**
   * Scan all enabled providers and update database
   */
  async scanAllProviders(): Promise<VoiceScanResult[]> {
    const results: VoiceScanResult[] = [];
    const db = getDatabase();
    const now = new Date().toISOString();

    // Clear existing voices before scanning
    db.prepare('DELETE FROM tts_voices').run();

    // Scan WebSpeech
    results.push(await this.scanWebSpeech());

    // Scan AWS Polly if enabled and configured
    const awsEnabled = await DatabaseService.getSetting('tts_aws_enabled');
    if (awsEnabled === 'true') {
      results.push(await this.scanAwsPolly());
    }

    // Scan Azure if enabled and configured
    const azureEnabled = await DatabaseService.getSetting('tts_azure_enabled');
    if (azureEnabled === 'true') {
      results.push(await this.scanAzure());
    }

    // Scan Google Cloud if enabled and configured
    const googleEnabled = await DatabaseService.getSetting('tts_google_enabled');
    if (googleEnabled === 'true') {
      results.push(await this.scanGoogle());
    }

    // Update last scanned timestamp
    await DatabaseService.setSetting('tts_voices_last_scanned', now);

    return results;
  }

  /**
   * Scan WebSpeech voices
   */
  private async scanWebSpeech(): Promise<VoiceScanResult> {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      // Get WebSpeech voices from settings (they're saved by renderer)
      const webspeechVoicesJson = await DatabaseService.getSetting('webspeech_voices_cache');
      if (!webspeechVoicesJson) {
        return {
          provider: 'webspeech',
          voicesFound: 0,
          success: true,
          error: 'No WebSpeech voices cached yet'
        };
      }

      const voices = JSON.parse(webspeechVoicesJson);
      const stmt = db.prepare(`
        INSERT INTO tts_voices (
          voice_id, name, provider, language_code, language_name, 
          gender, voice_type, is_available, last_scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      for (const voice of voices) {
        stmt.run(
          voice.voice_id,
          voice.name,
          'webspeech',
          voice.language_code,
          voice.language_name,
          null,
          null, // WebSpeech doesn't have neural distinction
          now,
          now
        );
      }

      return {
        provider: 'webspeech',
        voicesFound: voices.length,
        success: true
      };
    } catch (error) {
      return {
        provider: 'webspeech',
        voicesFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scan AWS Polly voices
   */
  private async scanAwsPolly(): Promise<VoiceScanResult> {
    try {
      const awsService = getAwsPollyService();
      
      if (!awsService.isConfigured()) {
        return {
          provider: 'aws',
          voicesFound: 0,
          success: false,
          error: 'AWS Polly not configured'
        };
      }

      const voices = await awsService.getVoices();
      const db = getDatabase();
      const now = new Date().toISOString();

      // Check if neural voices are disabled
      const disableNeural = DatabaseService.getSetting('tts_aws_disable_neural');
      const filteredVoices = disableNeural === 'true' 
        ? voices.filter(v => v.engine !== 'neural')
        : voices;

      const stmt = db.prepare(`
        INSERT INTO tts_voices (
          voice_id, name, provider, language_code, language_name, 
          gender, voice_type, is_available, last_scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      for (const voice of filteredVoices) {
        stmt.run(
          voice.voice_id,
          voice.name,
          voice.provider,
          voice.language_code,
          voice.language_name,
          voice.gender || null,
          voice.engine || 'standard',
          now,
          now
        );
      }

      return {
        provider: 'aws',
        voicesFound: filteredVoices.length,
        success: true
      };
    } catch (error) {
      return {
        provider: 'aws',
        voicesFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scan Azure TTS voices
   */
  private async scanAzure(): Promise<VoiceScanResult> {
    try {
      const azureService = getAzureTtsService();
      
      if (!azureService.isConfigured()) {
        return {
          provider: 'azure',
          voicesFound: 0,
          success: false,
          error: 'Azure TTS not configured'
        };
      }

      const voices = await azureService.getVoices();
      const db = getDatabase();
      const now = new Date().toISOString();

      // Check if neural voices are disabled
      const disableNeural = DatabaseService.getSetting('tts_azure_disable_neural');
      const filteredVoices = voices.filter(v => {
        // Azure Neural voices contain 'Neural' in the name (e.g., 'en-US-AriaNeural')
        const isNeural = v.voice_id.includes('Neural');
        if (disableNeural === 'true' && isNeural) {
          return false;
        }
        return true;
      });

      const stmt = db.prepare(`
        INSERT INTO tts_voices (
          voice_id, name, provider, language_code, language_name, 
          region, gender, voice_type, is_available, last_scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      for (const voice of filteredVoices) {
        const voiceType = voice.voice_id.includes('Neural') ? 'neural' : 'standard';
        stmt.run(
          voice.voice_id,
          voice.name,
          voice.provider,
          voice.language_code,
          voice.language_name,
          voice.region || null,
          voice.gender || null,
          voiceType,
          now,
          now
        );
      }

      return {
        provider: 'azure',
        voicesFound: filteredVoices.length,
        success: true
      };
    } catch (error) {
      return {
        provider: 'azure',
        voicesFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scan Google Cloud TTS voices
   */
  private async scanGoogle(): Promise<VoiceScanResult> {
    try {
      const googleService = getGoogleTtsService();
      
      if (!googleService.isConfigured()) {
        return {
          provider: 'google',
          voicesFound: 0,
          success: false,
          error: 'Google Cloud TTS not configured'
        };
      }

      const voices = await googleService.getVoices();
      const db = getDatabase();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO tts_voices (
          voice_id, name, provider, language_code, language_name, 
          gender, voice_type, is_available, last_scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      for (const voice of voices) {
        // Google voices with WaveNet or Neural2 are premium neural voices
        const voiceType = (voice.voice_id.includes('Wavenet') || voice.voice_id.includes('Neural2')) ? 'neural' : 'standard';
        stmt.run(
          voice.voice_id,
          voice.name,
          voice.provider,
          voice.language_code,
          voice.language_name,
          voice.gender || null,
          voiceType,
          now,
          now
        );
      }

      return {
        provider: 'google',
        voicesFound: voices.length,
        success: true
      };
    } catch (error) {
      return {
        provider: 'google',
        voicesFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
let voiceScannerService: VoiceScannerService | null = null;

export function getVoiceScannerService(): VoiceScannerService {
  if (!voiceScannerService) {
    voiceScannerService = new VoiceScannerService();
  }
  return voiceScannerService;
}
