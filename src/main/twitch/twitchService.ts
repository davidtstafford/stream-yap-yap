import tmi from 'tmi.js';
import { DatabaseService, ChatMessage, Viewer } from './database/service';

interface TwitchServiceConfig {
  username: string;
  token: string;
  channels: string[];
}

export class TwitchService {
  private client: tmi.Client | null = null;
  private messageQueue: ChatMessage[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private onMessageCallback?: (message: ChatMessage) => void;
  private onConnectionStatusCallback?: (connected: boolean, error?: string) => void;

  constructor() {
    // Batch write messages every 5 seconds
    this.batchInterval = setInterval(() => {
      this.flushMessageQueue();
    }, 5000);
  }

  /**
   * Connect to Twitch chat
   */
  async connect(config: TwitchServiceConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    // Create TMI.js client
    this.client = new tmi.Client({
      options: { debug: process.env.NODE_ENV === 'development' },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: config.username.toLowerCase(),
        password: config.token // OAuth token with 'oauth:' prefix
      },
      channels: config.channels.map(ch => ch.toLowerCase())
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Connect
    try {
      await this.client.connect();
      console.log('Connected to Twitch chat');
      this.onConnectionStatusCallback?.(true);
    } catch (error) {
      console.error('Failed to connect to Twitch:', error);
      this.onConnectionStatusCallback?.(false, String(error));
      throw error;
    }
  }

  /**
   * Disconnect from Twitch chat
   */
  async disconnect(): Promise<void> {
    if (!this.client) return;

    // Flush any pending messages
    this.flushMessageQueue();

    try {
      await this.client.disconnect();
      console.log('Disconnected from Twitch chat');
      this.client = null;
      this.onConnectionStatusCallback?.(false);
    } catch (error) {
      console.error('Error disconnecting from Twitch:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.readyState() === 'OPEN';
  }

  /**
   * Set up TMI.js event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Handle incoming messages
    this.client.on('message', (channel, userstate, message, self) => {
      // Ignore messages from the bot itself
      if (self) return;

      this.handleMessage(channel, userstate, message);
    });

    // Handle connection events
    this.client.on('connected', () => {
      console.log('TMI.js connected');
      this.onConnectionStatusCallback?.(true);
    });

    this.client.on('disconnected', (reason) => {
      console.log('TMI.js disconnected:', reason);
      this.onConnectionStatusCallback?.(false);
    });

    // Handle errors
    this.client.on('error', (error) => {
      console.error('TMI.js error:', error);
    });
  }

  /**
   * Handle incoming chat message
   */
  private handleMessage(channel: string, userstate: tmi.ChatUserstate, message: string): void {
    const userId = userstate['user-id'];
    const username = userstate.username;
    const displayName = userstate['display-name'];

    if (!userId || !username) return;

    // Update viewer in database (case-insensitive)
    const viewer: Viewer = {
      id: userId,
      username: username.toLowerCase(),
      display_name: displayName || username,
      is_moderator: userstate.mod || false,
      is_vip: userstate.badges?.vip === '1',
      is_subscriber: userstate.subscriber || false
    };

    DatabaseService.upsertViewer(viewer);
    DatabaseService.incrementViewerMessageCount(userId);

    // Create chat message for queue
    const chatMessage: ChatMessage = {
      viewer_id: userId,
      username: username.toLowerCase(),
      display_name: displayName || username,
      message: message,
      timestamp: new Date().toISOString(),
      emotes: userstate.emotes ? JSON.stringify(userstate.emotes) : undefined,
      badges: userstate.badges ? JSON.stringify(userstate.badges) : undefined,
      was_read_by_tts: false
    };

    // Add to queue for batched DB insert
    this.messageQueue.push(chatMessage);

    // Immediately send to UI (don't wait for DB write)
    this.onMessageCallback?.(chatMessage);
  }

  /**
   * Flush message queue to database
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    try {
      DatabaseService.insertChatMessages(messages);
      console.log(`Flushed ${messages.length} messages to database`);
    } catch (error) {
      console.error('Failed to flush messages to database:', error);
      // Put messages back in queue to retry later
      this.messageQueue.unshift(...messages);
    }
  }

  /**
   * Set callback for new messages (for UI updates)
   */
  onMessage(callback: (message: ChatMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for connection status changes
   */
  onConnectionStatus(callback: (connected: boolean, error?: string) => void): void {
    this.onConnectionStatusCallback = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    this.flushMessageQueue();
    this.disconnect();
  }
}

// Singleton instance
let twitchService: TwitchService | null = null;

export function getTwitchService(): TwitchService {
  if (!twitchService) {
    twitchService = new TwitchService();
  }
  return twitchService;
}
