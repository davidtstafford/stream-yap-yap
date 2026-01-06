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

    try {
      // Speak the text using WebSpeech API
      await this.speak(item);
      
      item.status = 'completed';
      this.onItemCompleteCallback?.(item);
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
   * Speak text using WebSpeech API
   */
  private async speak(item: TTSQueueItem): Promise<void> {
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
          const voice = voices.find(v => v.name.toLowerCase() === item.voiceId!.toLowerCase());
          if (voice) {
            utterance.voice = voice;
          } else {
            console.warn(`Voice not found: ${item.voiceId}, using default`);
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
