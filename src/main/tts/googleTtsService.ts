// Google Cloud Text-to-Speech Service
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';

export interface GoogleTtsVoice {
  voice_id: string;
  name: string;
  language_code: string;
  language_name: string;
  provider: 'google';
  gender?: string;
}

export interface GoogleTtsConfig {
  serviceAccountJson: string; // JSON string of service account credentials
}

export class GoogleTtsService {
  private client: TextToSpeechClient | null = null;
  private config: GoogleTtsConfig | null = null;

  /**
   * Configure Google Cloud TTS
   */
  configure(config: GoogleTtsConfig): void {
    this.config = config;
    
    try {
      const credentials = JSON.parse(config.serviceAccountJson);
      this.client = new TextToSpeechClient({
        credentials
      });
    } catch (error) {
      console.error('Failed to parse Google Cloud service account JSON:', error);
      throw new Error('Invalid service account JSON');
    }
  }

  /**
   * Check if Google Cloud TTS is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  /**
   * Test connection to Google Cloud TTS
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Google Cloud TTS not configured');
    }

    try {
      const [voices] = await this.client.listVoices({});
      return (voices.voices && voices.voices.length > 0) || false;
    } catch (error) {
      console.error('Google Cloud TTS connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all available voices from Google Cloud TTS
   */
  async getVoices(): Promise<GoogleTtsVoice[]> {
    if (!this.client) {
      throw new Error('Google Cloud TTS not configured');
    }

    try {
      const [response] = await this.client.listVoices({});
      
      if (!response.voices) {
        return [];
      }

      return response.voices.map(voice => ({
        voice_id: voice.name || '',
        name: voice.name || '',
        language_code: voice.languageCodes?.[0] || '',
        language_name: this.parseLanguageName(voice.languageCodes?.[0] || ''),
        provider: 'google' as const,
        gender: voice.ssmlGender === protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE ? 'female' :
                voice.ssmlGender === protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE ? 'male' :
                voice.ssmlGender === protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL ? 'neutral' :
                undefined
      }));
    } catch (error) {
      console.error('Failed to get Google Cloud TTS voices:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech using Google Cloud TTS
   */
  async synthesize(text: string, voiceId: string, options?: {
    pitch?: number;
    speed?: number;
    volume?: number;
  }): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Google Cloud TTS not configured');
    }

    try {
      // Extract language code from voice name (e.g., "en-US-Wavenet-A" -> "en-US")
      const languageCode = voiceId.split('-').slice(0, 2).join('-');

      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
          languageCode,
          name: voiceId
        },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
          // Convert pitch (0-2) to semitones (-20 to +20)
          pitch: options?.pitch !== undefined ? (options.pitch - 1.0) * 20 : 0,
          // Convert speed (0.5-2) directly
          speakingRate: options?.speed || 1.0,
          // Convert volume (0-1) to dB gain (-96 to +16)
          volumeGainDb: options?.volume !== undefined ? 
            ((options.volume - 0.5) * 32) : 0
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content returned from Google Cloud TTS');
      }

      return Buffer.from(response.audioContent as Uint8Array);
    } catch (error) {
      console.error('Google Cloud TTS synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Parse language name from code
   */
  private parseLanguageName(langCode: string): string {
    const parts = langCode.split('-');
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'pl': 'Polish',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'tr': 'Turkish',
      'el': 'Greek',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'uk': 'Ukrainian',
      'he': 'Hebrew'
    };

    const baseLang = parts[0].toLowerCase();
    const langName = languageNames[baseLang] || baseLang.toUpperCase();
    
    if (parts.length > 1) {
      return `${langName} (${parts[1].toUpperCase()})`;
    }
    
    return langName;
  }

}

// Singleton instance
let googleTtsService: GoogleTtsService | null = null;

export function getGoogleTtsService(): GoogleTtsService {
  if (!googleTtsService) {
    googleTtsService = new GoogleTtsService();
  }
  return googleTtsService;
}
