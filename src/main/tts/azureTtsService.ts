import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface AzureTtsVoice {
  voice_id: string;
  name: string;
  language_code: string;
  language_name: string;
  provider: 'azure';
  gender?: string;
  region?: string;
}

interface AzureTtsConfig {
  subscriptionKey: string;
  region: string;
}

class AzureTtsService {
  private config: AzureTtsConfig | null = null;
  private speechConfig: sdk.SpeechConfig | null = null;

  /**
   * Configure Azure TTS with credentials
   */
  configure(config: AzureTtsConfig): void {
    this.config = config;
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    );
  }

  /**
   * Check if Azure TTS is configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.speechConfig !== null;
  }

  /**
   * Test the Azure TTS connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config || !this.speechConfig) {
      return false;
    }

    try {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
      
      // Try to get voices as a connection test
      const result = await synthesizer.getVoicesAsync();
      synthesizer.close();
      
      if (result.errorDetails) {
        console.error('Azure TTS connection test failed:', result.errorDetails);
        return false;
      }
      
      return result.voices && result.voices.length > 0;
    } catch (error) {
      console.error('Azure TTS connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available voices from Azure TTS
   */
  async getVoices(): Promise<AzureTtsVoice[]> {
    if (!this.config) {
      throw new Error('Azure TTS not configured');
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.config.subscriptionKey,
      this.config.region
    );

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    try {
      const result = await synthesizer.getVoicesAsync();
      synthesizer.close();
      
      if (result.errorDetails) {
        console.error('Failed to get Azure TTS voices:', result.errorDetails);
        throw new Error(result.errorDetails);
      }
      
      const voices: AzureTtsVoice[] = (result.voices || []).map((voice: any) => ({
        voice_id: voice.shortName,
        name: voice.localName || voice.shortName,
        language_code: voice.locale,
        language_name: this.parseLanguageName(voice.locale),
        provider: 'azure' as const,
        gender: voice.gender === sdk.SynthesisVoiceGender.Female ? 'female' : 
                voice.gender === sdk.SynthesisVoiceGender.Male ? 'male' : undefined,
        region: this.config?.region
      }));

      return voices;
    } catch (error) {
      synthesizer.close();
      console.error('Failed to get Azure TTS voices:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech using Azure TTS
   */
  async synthesize(text: string, voiceId: string, options?: {
    pitch?: number;
    speed?: number;
    volume?: number;
  }): Promise<Buffer> {
    if (!this.config) {
      throw new Error('Azure TTS not configured');
    }

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.subscriptionKey,
        this.config.region
      );

      speechConfig.speechSynthesisVoiceName = voiceId;
      speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

      // Build SSML with prosody adjustments
      let ssml = text;
      if (options?.pitch !== undefined || options?.speed !== undefined || options?.volume !== undefined) {
        const pitchValue = options.pitch !== undefined ? 
          (options.pitch < 1 ? `${Math.round((options.pitch - 1) * 100)}%` : `+${Math.round((options.pitch - 1) * 100)}%`) : 
          '0%';
        
        const speedValue = options.speed !== undefined ?
          (options.speed < 1 ? `${Math.round(options.speed * 100)}%` : `${Math.round(options.speed * 100)}%`) :
          '100%';
        
        const volumeValue = options.volume !== undefined ?
          (options.volume < 1 ? `${Math.round(options.volume * 100)}%` : `${Math.round(options.volume * 100)}%`) :
          '100%';

        ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="${voiceId}">
            <prosody pitch="${pitchValue}" rate="${speedValue}" volume="${volumeValue}">
              ${text}
            </prosody>
          </voice>
        </speak>`;
      }

      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            synthesizer.close();
            
            if (result.errorDetails) {
              console.error('Azure TTS synthesis failed:', result.errorDetails);
              reject(new Error(result.errorDetails));
              return;
            }
            
            if (result.audioData) {
              resolve(Buffer.from(result.audioData));
            } else {
              reject(new Error('No audio data received from Azure TTS'));
            }
          },
          (error) => {
            synthesizer.close();
            console.error('Azure TTS synthesis failed:', error);
            reject(new Error(error));
          }
        );
      });
    } catch (error) {
      console.error('Azure TTS synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Parse language name from locale code
   */
  private parseLanguageName(locale: string): string {
    const parts = locale.split('-');
    if (parts.length > 0) {
      return parts[0].toUpperCase();
    }
    return locale;
  }
}

// Singleton instance
let azureTtsServiceInstance: AzureTtsService | null = null;

export function getAzureTtsService(): AzureTtsService {
  if (!azureTtsServiceInstance) {
    azureTtsServiceInstance = new AzureTtsService();
  }
  return azureTtsServiceInstance;
}

export type { AzureTtsVoice, AzureTtsConfig };
