// TTS Queue Manager for sequential audio playback
// Ensures no overlapping audio

export interface TTSRequest {
  id: string;
  text: string;
  voiceId?: string;
  provider: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  viewerId?: string;
  username?: string;
}

export interface TTSQueueItem extends TTSRequest {
  status: 'pending' | 'playing' | 'completed' | 'error';
  error?: string;
  audioData?: string; // Cached audio data for cloud providers
}

export class TTSQueue {
  private queue: TTSQueueItem[] = [];
  private isPlaying = false;
  private currentItem: TTSQueueItem | null = null;
  private onQueueUpdateCallback?: (queue: TTSQueueItem[]) => void;
  private onItemStartCallback?: (item: TTSQueueItem) => void;
  private onItemCompleteCallback?: (item: TTSQueueItem) => void;

  /**
   * Add item to queue
   */
  add(request: TTSRequest): void {
    const item: TTSQueueItem = {
      ...request,
      status: 'pending'
    };
    
    this.queue.push(item);
    this.notifyQueueUpdate();
    
    // Start processing if not already playing
    if (!this.isPlaying) {
      this.processNext();
    }
  }

  /**
   * Process next item in queue
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentItem = null;
      return;
    }

    this.isPlaying = true;
    const item = this.queue[0];
    this.currentItem = item;
    
    item.status = 'playing';
    this.notifyQueueUpdate();
    this.onItemStartCallback?.(item);

    // For cloud providers, synthesize audio first to send to OBS
    if (item.provider !== 'webspeech' && !item.audioData) {
      try {
        console.log(`[TTS Queue] Synthesizing ${item.provider} audio for OBS:`, item.voiceId);
        const result = await window.api.invoke('tts:synthesize', {
          text: item.text,
          voiceId: item.voiceId,
          provider: item.provider,
          speed: item.speed,
          volume: item.volume
        });
        if (result.success && result.audioData) {
          item.audioData = result.audioData;
          console.log(`[TTS Queue] Synthesized ${item.provider} audio, length:`, result.audioData.length);
        } else {
          console.error('[TTS Queue] Synthesis failed:', result.error);
        }
      } catch (err) {
        console.error('Failed to synthesize audio for OBS:', err);
      }
    }

    // Broadcast to OBS overlay
    try {
      console.log('[TTS Queue] Broadcasting to OBS:', {
        provider: item.provider,
        voiceId: item.voiceId,
        hasAudioData: !!item.audioData,
        audioDataLength: item.audioData?.length || 0
      });
      await window.api.invoke('obs:broadcastEvent', {
        type: 'start',
        item: {
          id: item.id,
          text: item.text,
          username: item.username,
          viewerId: item.viewerId,
          voiceId: item.voiceId,
          provider: item.provider,
          speed: item.speed,
          pitch: item.pitch,
          volume: item.volume,
          audioData: item.audioData
        }
      });
    } catch (err) {
      console.error('Failed to broadcast to OBS:', err);
    }

    try {
      // Speak the text using appropriate provider
      await this.speak(item);
      
      item.status = 'completed';
      this.onItemCompleteCallback?.(item);

      // Broadcast completion to OBS overlay
      try {
        await window.api.invoke('obs:broadcastEvent', {
          type: 'complete',
          item: { id: item.id }
        });
      } catch (err) {
        console.error('Failed to broadcast completion to OBS:', err);
      }
    } catch (error) {
      item.status = 'error';
      item.error = String(error);
      console.error('TTS error:', error);
    }

    // Remove completed item and process next
    this.queue.shift();
    this.notifyQueueUpdate();
    
    // Small delay between items
    setTimeout(() => {
      this.processNext();
    }, 100);
  }

  /**
   * Speak text using appropriate provider
   */
  private async speak(item: TTSQueueItem): Promise<void> {
    // Check if we should mute in-app audio when OBS is running
    try {
      const obsStatus = await window.api.invoke('obs:getStatus');
      const muteInApp = await window.api.invoke('db:getSetting', 'tts_mute_in_app');
      
      if (obsStatus.running && muteInApp === 'true') {
        // OBS is handling audio, wait for OBS to finish playing
        const result = await window.api.invoke('obs:waitForAudioComplete');
        if (!result.success) {
          console.error('[TTS Queue] OBS playback timeout:', result.error);
        }
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Failed to check OBS/mute status:', error);
      // Continue with playback if check fails
    }

    // Route to appropriate provider
    if (item.provider === 'webspeech') {
      return this.speakWebSpeech(item);
    } else {
      return this.speakCloudProvider(item);
    }
  }

  /**
   * Speak using cloud provider (AWS/Azure/Google)
   */
  private async speakCloudProvider(item: TTSQueueItem): Promise<void> {
    try {
      // Use cached audioData if available, otherwise synthesize
      let audioData = item.audioData;
      if (!audioData) {
        const result = await window.api.invoke('tts:synthesize', {
          text: item.text,
          voiceId: item.voiceId,
          provider: item.provider,
          speed: item.speed,
          volume: item.volume
        });
        
        if (result.success && result.audioData) {
          audioData = result.audioData;
        } else {
          throw new Error(result.error || 'Failed to synthesize audio');
        }
      }
      
      // Play the audio data
      const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
      audio.volume = item.volume ?? 1.0;
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('TTS completed:', item.text.substring(0, 50));
          resolve();
        };
        audio.onerror = (err) => {
          console.error('Audio playback error:', err);
          reject(err);
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Cloud TTS error:', error);
      throw error;
    }
  }

  /**
   * Speak using WebSpeech API
   */
  private async speakWebSpeech(item: TTSQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('WebSpeech API not supported'));
        return;
      }

      // Wait for voices to be loaded
      const ensureVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length === 0) {
          // Voices not loaded yet, wait a bit
          setTimeout(() => ensureVoices(), 100);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        
        // Find voice by ID (case-insensitive)
        if (item.voiceId) {
          const voiceId = item.voiceId; // Cache for TypeScript narrowing
          const voice = voices.find(v => v.name.toLowerCase() === voiceId.toLowerCase());
          if (voice) {
            utterance.voice = voice;
          } else {
            console.warn(`Voice not found: ${voiceId}, using default`);
          }
        }

        // Set parameters
        utterance.rate = item.speed ?? 1.0;
        utterance.pitch = item.pitch ?? 1.0;
        utterance.volume = item.volume ?? 1.0;

        utterance.onend = () => {
          console.log('TTS completed:', item.text.substring(0, 50));
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('TTS error:', event);
          reject(event.error || 'Unknown TTS error');
        };

        console.log('Speaking:', item.text.substring(0, 50), 'Voice:', utterance.voice?.name || 'default');
        window.speechSynthesis.speak(utterance);
      };

      ensureVoices();
    });
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    // Stop current speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    this.queue = [];
    this.currentItem = null;
    this.isPlaying = false;
    this.notifyQueueUpdate();
  }

  /**
   * Skip current item
   */
  skip(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Get current queue
   */
  getQueue(): TTSQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get current playing item
   */
  getCurrentItem(): TTSQueueItem | null {
    return this.currentItem;
  }

  /**
   * Register callback for queue updates
   */
  onQueueUpdate(callback: (queue: TTSQueueItem[]) => void): void {
    this.onQueueUpdateCallback = callback;
  }

  /**
   * Register callback for item start
   */
  onItemStart(callback: (item: TTSQueueItem) => void): void {
    this.onItemStartCallback = callback;
  }

  /**
   * Register callback for item complete
   */
  onItemComplete(callback: (item: TTSQueueItem) => void): void {
    this.onItemCompleteCallback = callback;
  }

  private notifyQueueUpdate(): void {
    this.onQueueUpdateCallback?.(this.getQueue());
  }
}

// Singleton instance
let ttsQueue: TTSQueue | null = null;

export function getTTSQueue(): TTSQueue {
  if (!ttsQueue) {
    ttsQueue = new TTSQueue();
  }
  return ttsQueue;
}
