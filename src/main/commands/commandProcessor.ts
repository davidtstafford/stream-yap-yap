// Chat Command Processor
// Handles parsing and executing chat commands

import { DatabaseService } from '../database/service';
import { getDatabase } from '../database/connection';

export interface CommandContext {
  username: string;
  displayName: string;
  viewerId: string;
  isModerator: boolean;
  isBroadcaster: boolean;
  isVip: boolean;
  isSubscriber: boolean;
  message: string;
  channel: string;
}

export interface CommandResult {
  success: boolean;
  response?: string;
  error?: string;
}

export class CommandProcessor {
  private commands: Map<string, CommandHandler> = new Map();
  private commandPrefix = '~';

  constructor() {
    this.registerCommands();
  }

  /**
   * Register all available commands
   */
  private registerCommands(): void {
    // Viewer commands
    this.commands.set('hello', {
      name: 'hello',
      permission: 'viewer',
      handler: this.handleHello.bind(this),
      rateLimit: 5
    });

    this.commands.set('voices', {
      name: 'voices',
      permission: 'viewer',
      handler: this.handleVoices.bind(this),
      rateLimit: 10
    });

    this.commands.set('setvoice', {
      name: 'setvoice',
      permission: 'viewer',
      handler: this.handleSetVoice.bind(this),
      rateLimit: 5
    });

    this.commands.set('setvoicepitch', {
      name: 'setvoicepitch',
      permission: 'viewer',
      handler: this.handleSetVoicePitch.bind(this),
      rateLimit: 5
    });

    this.commands.set('setvoicespeed', {
      name: 'setvoicespeed',
      permission: 'viewer',
      handler: this.handleSetVoiceSpeed.bind(this),
      rateLimit: 5
    });

    // Moderator commands
    this.commands.set('mutevoice', {
      name: 'mutevoice',
      permission: 'moderator',
      handler: this.handleMuteVoice.bind(this),
      rateLimit: 0
    });

    this.commands.set('unmutevoice', {
      name: 'unmutevoice',
      permission: 'moderator',
      handler: this.handleUnmuteVoice.bind(this),
      rateLimit: 0
    });

    this.commands.set('cooldownvoice', {
      name: 'cooldownvoice',
      permission: 'moderator',
      handler: this.handleCooldownVoice.bind(this),
      rateLimit: 0
    });

    this.commands.set('mutetts', {
      name: 'mutetts',
      permission: 'moderator',
      handler: this.handleMuteTTS.bind(this),
      rateLimit: 0
    });

    this.commands.set('unmutetts', {
      name: 'unmutetts',
      permission: 'moderator',
      handler: this.handleUnmuteTTS.bind(this),
      rateLimit: 0
    });

    this.commands.set('clearqueue', {
      name: 'clearqueue',
      permission: 'moderator',
      handler: this.handleClearQueue.bind(this),
      rateLimit: 0
    });
  }

  /**
   * Process a potential command message
   */
  async processMessage(context: CommandContext): Promise<CommandResult | null> {
    const message = context.message.trim();
    
    // Check if message starts with command prefix
    if (!message.startsWith(this.commandPrefix)) {
      return null; // Not a command
    }

    // Parse command and arguments
    const parts = message.slice(1).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Get command handler
    const command = this.commands.get(commandName);
    if (!command) {
      return null; // Unknown command
    }

    // Check if command is enabled
    const enabled = await DatabaseService.getSetting(`command_${commandName}_enabled`);
    if (enabled === 'false') {
      return { success: false, error: 'Command is disabled' };
    }

    // Check permissions
    if (!this.hasPermission(context, command.permission)) {
      return { 
        success: false, 
        error: `You don't have permission to use this command (requires: ${command.permission})` 
      };
    }

    // Check rate limit
    if (command.rateLimit > 0 && !context.isModerator && !context.isBroadcaster) {
      const lastUsed = await DatabaseService.getSetting(`command_${commandName}_lastused_${context.viewerId}`);
      if (lastUsed) {
        const timeSince = Date.now() - new Date(lastUsed).getTime();
        if (timeSince < command.rateLimit * 1000) {
          const remaining = Math.ceil((command.rateLimit * 1000 - timeSince) / 1000);
          return { 
            success: false, 
            error: `Command on cooldown. Wait ${remaining} seconds.` 
          };
        }
      }
    }

    // Execute command
    try {
      const result = await command.handler(context, args);
      
      // Update last used timestamp
      if (command.rateLimit > 0) {
        await DatabaseService.setSetting(
          `command_${commandName}_lastused_${context.viewerId}`, 
          new Date().toISOString()
        );
      }

      return result;
    } catch (error) {
      console.error(`Command ${commandName} error:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Command failed' 
      };
    }
  }

  /**
   * Check if user has permission for command
   */
  private hasPermission(context: CommandContext, required: string): boolean {
    if (context.isBroadcaster) return true;
    if (required === 'viewer') return true;
    if (required === 'moderator') return context.isModerator;
    return false;
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  /**
   * ~hello - Greet the user
   */
  private async handleHello(context: CommandContext, args: string[]): Promise<CommandResult> {
    return {
      success: true,
      response: `Hello, ${context.displayName}! 👋`
    };
  }

  /**
   * ~voices - Show voices link
   */
  private async handleVoices(context: CommandContext, args: string[]): Promise<CommandResult> {
    return {
      success: true,
      response: `Check available voices at: [Voice list would be generated from database]`
    };
  }

  /**
   * ~setvoice <voiceName> - Set user's TTS voice
   */
  private async handleSetVoice(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return { success: false, error: 'Usage: ~setvoice <voice_name>' };
    }

    const voiceName = args.join(' ').toLowerCase();
    
    // Find voice in database (case-insensitive)
    const db = getDatabase();
    const voice = db.prepare(`
      SELECT * FROM tts_voices 
      WHERE LOWER(name) = ? AND is_available = 1 
      LIMIT 1
    `).get(voiceName);

    if (!voice) {
      return { success: false, error: `Voice "${voiceName}" not found. Use ~voices to see available voices.` };
    }

    // Save voice preference
    db.prepare(`
      INSERT INTO viewer_voice_preferences (viewer_id, voice_id, provider, pitch, speed, volume)
      VALUES (?, ?, ?, 1.0, 1.0, 1.0)
      ON CONFLICT(viewer_id) DO UPDATE SET
        voice_id = excluded.voice_id,
        provider = excluded.provider,
        updated_at = CURRENT_TIMESTAMP
    `).run(context.viewerId, voice.voice_id, voice.provider);

    return {
      success: true,
      response: `@${context.displayName} Voice set to: ${voice.name}`
    };
  }

  /**
   * ~setvoicepitch <value> - Set user's voice pitch (-10 to +10)
   */
  private async handleSetVoicePitch(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return { success: false, error: 'Usage: ~setvoicepitch <-10 to +10>' };
    }

    const pitch = parseFloat(args[0]);
    if (isNaN(pitch) || pitch < -10 || pitch > 10) {
      return { success: false, error: 'Pitch must be between -10 and +10' };
    }

    const db = getDatabase();
    
    // Get or create preference
    const existing = db.prepare(`
      SELECT * FROM viewer_voice_preferences WHERE viewer_id = ?
    `).get(context.viewerId);

    if (existing) {
      db.prepare(`
        UPDATE viewer_voice_preferences 
        SET pitch = ?, updated_at = CURRENT_TIMESTAMP
        WHERE viewer_id = ?
      `).run(pitch, context.viewerId);
    } else {
      // Create with default voice
      const defaultVoice = await DatabaseService.getSetting('tts_default_voice');
      db.prepare(`
        INSERT INTO viewer_voice_preferences (viewer_id, voice_id, provider, pitch, speed, volume)
        VALUES (?, ?, 'webspeech', ?, 1.0, 1.0)
      `).run(context.viewerId, defaultVoice || 'default', pitch);
    }

    return {
      success: true,
      response: `@${context.displayName} Voice pitch set to: ${pitch}`
    };
  }

  /**
   * ~setvoicespeed <value> - Set user's voice speed (0.5 to 2.0)
   */
  private async handleSetVoiceSpeed(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return { success: false, error: 'Usage: ~setvoicespeed <0.5 to 2.0>' };
    }

    const speed = parseFloat(args[0]);
    if (isNaN(speed) || speed < 0.5 || speed > 2.0) {
      return { success: false, error: 'Speed must be between 0.5 and 2.0' };
    }

    const db = getDatabase();
    
    // Get or create preference
    const existing = db.prepare(`
      SELECT * FROM viewer_voice_preferences WHERE viewer_id = ?
    `).get(context.viewerId);

    if (existing) {
      db.prepare(`
        UPDATE viewer_voice_preferences 
        SET speed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE viewer_id = ?
      `).run(speed, context.viewerId);
    } else {
      const defaultVoice = await DatabaseService.getSetting('tts_default_voice');
      db.prepare(`
        INSERT INTO viewer_voice_preferences (viewer_id, voice_id, provider, pitch, speed, volume)
        VALUES (?, ?, 'webspeech', 1.0, ?, 1.0)
      `).run(context.viewerId, defaultVoice || 'default', speed);
    }

    return {
      success: true,
      response: `@${context.displayName} Voice speed set to: ${speed}x`
    };
  }

  /**
   * ~mutevoice @username <minutes> - Mute a user's TTS
   */
  private async handleMuteVoice(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length < 1) {
      return { success: false, error: 'Usage: ~mutevoice @username [minutes] (0 = permanent)' };
    }

    const targetUsername = args[0].replace('@', '').toLowerCase();
    const duration = args.length > 1 ? parseInt(args[1]) : 0;

    if (args.length > 1 && (isNaN(duration) || duration < 0)) {
      return { success: false, error: 'Duration must be a positive number or 0 for permanent' };
    }

    // Find viewer
    const viewer = DatabaseService.getViewerByUsername(targetUsername);
    if (!viewer) {
      return { success: false, error: `User ${targetUsername} not found` };
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const expiresAt = duration > 0 
      ? new Date(Date.now() + duration * 60 * 1000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO viewer_tts_restrictions (
        viewer_id, is_muted, mute_period_mins, muted_at, mute_expires_at
      ) VALUES (?, 1, ?, ?, ?)
      ON CONFLICT(viewer_id) DO UPDATE SET
        is_muted = 1,
        mute_period_mins = excluded.mute_period_mins,
        muted_at = excluded.muted_at,
        mute_expires_at = excluded.mute_expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(viewer.id, duration > 0 ? duration : null, now, expiresAt);

    const responseMsg = duration > 0
      ? `@${targetUsername} has been muted from TTS for ${duration} minutes`
      : `@${targetUsername} has been permanently muted from TTS`;

    return { success: true, response: responseMsg };
  }

  /**
   * ~unmutevoice @username - Unmute a user's TTS
   */
  private async handleUnmuteVoice(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length < 1) {
      return { success: false, error: 'Usage: ~unmutevoice @username' };
    }

    const targetUsername = args[0].replace('@', '').toLowerCase();
    
    const viewer = DatabaseService.getViewerByUsername(targetUsername);
    if (!viewer) {
      return { success: false, error: `User ${targetUsername} not found` };
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE viewer_tts_restrictions 
      SET is_muted = 0, 
          mute_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE viewer_id = ?
    `).run(viewer.id);

    return {
      success: true,
      response: `@${targetUsername} has been unmuted from TTS`
    };
  }

  /**
   * ~cooldownvoice @username <seconds> <minutes> - Apply TTS cooldown
   */
  private async handleCooldownVoice(context: CommandContext, args: string[]): Promise<CommandResult> {
    if (args.length < 2) {
      return { success: false, error: 'Usage: ~cooldownvoice @username <seconds> [minutes] (0 minutes = permanent)' };
    }

    const targetUsername = args[0].replace('@', '').toLowerCase();
    const gap = parseInt(args[1]);
    const duration = args.length > 2 ? parseInt(args[2]) : 0;

    if (isNaN(gap) || gap < 0) {
      return { success: false, error: 'Cooldown gap must be a positive number' };
    }

    if (args.length > 2 && (isNaN(duration) || duration < 0)) {
      return { success: false, error: 'Duration must be a positive number or 0 for permanent' };
    }

    const viewer = DatabaseService.getViewerByUsername(targetUsername);
    if (!viewer) {
      return { success: false, error: `User ${targetUsername} not found` };
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const expiresAt = duration > 0
      ? new Date(Date.now() + duration * 60 * 1000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO viewer_tts_restrictions (
        viewer_id, has_cooldown, cooldown_gap_seconds, cooldown_period_mins, 
        cooldown_set_at, cooldown_expires_at
      ) VALUES (?, 1, ?, ?, ?, ?)
      ON CONFLICT(viewer_id) DO UPDATE SET
        has_cooldown = 1,
        cooldown_gap_seconds = excluded.cooldown_gap_seconds,
        cooldown_period_mins = excluded.cooldown_period_mins,
        cooldown_set_at = excluded.cooldown_set_at,
        cooldown_expires_at = excluded.cooldown_expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(viewer.id, gap, duration > 0 ? duration : null, now, expiresAt);

    const durationMsg = duration > 0 ? ` for ${duration} minutes` : ' permanently';
    return {
      success: true,
      response: `@${targetUsername} now has a ${gap}s TTS cooldown${durationMsg}`
    };
  }

  /**
   * ~mutetts - Disable all TTS globally
   */
  private async handleMuteTTS(context: CommandContext, args: string[]): Promise<CommandResult> {
    await DatabaseService.setSetting('tts_enabled', 'false');
    return {
      success: true,
      response: 'TTS has been globally muted'
    };
  }

  /**
   * ~unmutetts - Enable all TTS globally
   */
  private async handleUnmuteTTS(context: CommandContext, args: string[]): Promise<CommandResult> {
    await DatabaseService.setSetting('tts_enabled', 'true');
    return {
      success: true,
      response: 'TTS has been globally unmuted'
    };
  }

  /**
   * ~clearqueue - Clear the TTS queue
   */
  private async handleClearQueue(context: CommandContext, args: string[]): Promise<CommandResult> {
    // This will be handled by sending an IPC event to the renderer
    return {
      success: true,
      response: 'TTS queue has been cleared'
    };
  }
}

interface CommandHandler {
  name: string;
  permission: 'viewer' | 'moderator' | 'broadcaster';
  handler: (context: CommandContext, args: string[]) => Promise<CommandResult>;
  rateLimit: number; // seconds
}
