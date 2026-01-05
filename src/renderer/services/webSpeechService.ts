// WebSpeech TTS Service
// Handles voice scanning and TTS operations

export interface WebSpeechVoice {
  voice_id: string;
  name: string;
  language_code: string;
  language_name: string;
  provider: string;
}

export class WebSpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded = false;

  constructor() {
    // WebSpeech voices load asynchronously
    this.loadVoices();
    
    // Listen for voice changes
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  /**
   * Load available voices from WebSpeech API
   */
  private loadVoices(): void {
    if (!('speechSynthesis' in window)) {
      console.warn('WebSpeech API not supported');
      return;
    }

    this.voices = window.speechSynthesis.getVoices();
    this.voicesLoaded = true;
    console.log(`Loaded ${this.voices.length} WebSpeech voices`);
  }

  /**
   * Get all available voices
   */
  async getVoices(): Promise<WebSpeechVoice[]> {
    // Ensure voices are loaded
    if (!this.voicesLoaded) {
      await this.waitForVoices();
    }

    return this.voices.map(voice => ({
      voice_id: voice.name,
      name: voice.name,
      language_code: voice.lang,
      language_name: this.parseLanguageName(voice.lang),
      provider: 'webspeech'
    }));
  }

  /**
   * Wait for voices to load
   */
  private waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (this.voicesLoaded && this.voices.length > 0) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        this.loadVoices();
        if (this.voicesLoaded && this.voices.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  /**
   * Parse language code to readable name
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

  /**
   * Test a voice by speaking sample text
   */
  testVoice(voiceId: string, text: string = 'Hello, this is a test.'): void {
    if (!('speechSynthesis' in window)) {
      console.error('WebSpeech API not supported');
      return;
    }

    // Case-insensitive voice lookup
    const voice = this.voices.find(v => v.name.toLowerCase() === voiceId.toLowerCase());
    
    if (!voice) {
      console.error(`Voice not found: ${voiceId}`);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop all speech
   */
  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

// Singleton instance
let webSpeechService: WebSpeechService | null = null;

export function getWebSpeechService(): WebSpeechService {
  if (!webSpeechService) {
    webSpeechService = new WebSpeechService();
  }
  return webSpeechService;
}
