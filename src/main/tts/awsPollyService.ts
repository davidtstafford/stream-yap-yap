// AWS Polly TTS Service
import { PollyClient, DescribeVoicesCommand, SynthesizeSpeechCommand, Engine, VoiceId, LanguageCode } from '@aws-sdk/client-polly';

export interface AwsPollyVoice {
  voice_id: string;
  name: string;
  language_code: string;
  language_name: string;
  provider: 'aws';
  gender?: string;
  engine?: 'standard' | 'neural';
}

export interface AwsPollyConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  engine: 'standard' | 'neural';
}

export class AwsPollyService {
  private client: PollyClient | null = null;
  private config: AwsPollyConfig | null = null;

  /**
   * Configure AWS Polly client
   */
  configure(config: AwsPollyConfig): void {
    this.config = config;
    this.client = new PollyClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  /**
   * Check if AWS Polly is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  /**
   * Test connection to AWS Polly
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('AWS Polly not configured');
    }

    try {
      const command = new DescribeVoicesCommand({});
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('AWS Polly connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all available voices from AWS Polly
   */
  async getVoices(): Promise<AwsPollyVoice[]> {
    if (!this.client) {
      throw new Error('AWS Polly not configured');
    }

    try {
      // Fetch both standard and neural voices for voice scanning
      const standardCommand = new DescribeVoicesCommand({
        Engine: Engine.STANDARD
      });
      const neuralCommand = new DescribeVoicesCommand({
        Engine: Engine.NEURAL
      });
      
      const [standardResponse, neuralResponse] = await Promise.all([
        this.client.send(standardCommand),
        this.client.send(neuralCommand)
      ]);
      
      const allVoices: AwsPollyVoice[] = [];
      
      // Add standard voices
      if (standardResponse.Voices) {
        allVoices.push(...standardResponse.Voices.map(voice => ({
          voice_id: voice.Id as string,
          name: voice.Name as string,
          language_code: voice.LanguageCode as string,
          language_name: this.parseLanguageName(voice.LanguageName || voice.LanguageCode as string),
          provider: 'aws' as const,
          gender: voice.Gender?.toLowerCase(),
          engine: 'standard' as const
        })));
      }
      
      // Add neural voices
      if (neuralResponse.Voices) {
        allVoices.push(...neuralResponse.Voices.map(voice => ({
          voice_id: voice.Id as string,
          name: voice.Name as string,
          language_code: voice.LanguageCode as string,
          language_name: this.parseLanguageName(voice.LanguageName || voice.LanguageCode as string),
          provider: 'aws' as const,
          gender: voice.Gender?.toLowerCase(),
          engine: 'neural' as const
        })));
      }

      return allVoices;
    } catch (error) {
      console.error('Failed to get AWS Polly voices:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech using AWS Polly
   */
  async synthesize(text: string, voiceId: string, options?: {
    pitch?: number;
    speed?: number;
    volume?: number;
  }): Promise<Buffer> {
    if (!this.client) {
      throw new Error('AWS Polly not configured');
    }

    try {
      // AWS Polly uses SSML for pitch/speed control
      let ssmlText = text;
      if (options?.pitch || options?.speed) {
        const prosodyAttrs: string[] = [];
        
        // Convert pitch (0-2) to percentage (-33% to +100%)
        if (options.pitch !== undefined && options.pitch !== 1.0) {
          const pitchPercent = Math.round((options.pitch - 1.0) * 100);
          prosodyAttrs.push(`pitch="${pitchPercent >= 0 ? '+' : ''}${pitchPercent}%"`);
        }
        
        // Convert speed (0.5-2) to percentage
        if (options.speed !== undefined && options.speed !== 1.0) {
          const speedPercent = Math.round(options.speed * 100);
          prosodyAttrs.push(`rate="${speedPercent}%"`);
        }

        if (prosodyAttrs.length > 0) {
          ssmlText = `<speak><prosody ${prosodyAttrs.join(' ')}>${text}</prosody></speak>`;
        }
      }

      const command = new SynthesizeSpeechCommand({
        Text: ssmlText,
        TextType: ssmlText.includes('<speak>') ? 'ssml' : 'text',
        VoiceId: voiceId as VoiceId,
        OutputFormat: 'mp3',
        Engine: this.config?.engine === 'neural' ? Engine.NEURAL : Engine.STANDARD
      });

      const response = await this.client.send(command);
      
      if (!response.AudioStream) {
        throw new Error('No audio stream returned from AWS Polly');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.AudioStream as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('AWS Polly synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Parse language name from code
   */
  private parseLanguageName(langName: string): string {
    // AWS returns full language names like "US English"
    return langName;
  }

}

// Singleton instance
let awsPollyService: AwsPollyService | null = null;

export function getAwsPollyService(): AwsPollyService {
  if (!awsPollyService) {
    awsPollyService = new AwsPollyService();
  }
  return awsPollyService;
}
