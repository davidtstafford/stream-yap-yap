import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Interaction
} from 'discord.js';
import { DatabaseService } from '../database/service';
import { VoiceService } from '../database/voiceService';
import { 
  getVoicesByFilters, 
  getRandomVoice, 
  getAvailableLanguages, 
  formatVoicesForEmbed,
  getProviderName 
} from './discordVoiceDiscovery';
import {
  setPaginationState,
  getPaginationState,
  updateCurrentPage,
  getPageVoices,
  getPaginationInfo,
  clearPaginationState
} from './discordPagination';

interface DiscordServiceConfig {
  token: string;
  clientId: string;
  guildId?: string; // Optional: for guild-specific commands
}

export class DiscordService {
  private client: Client | null = null;
  private config: DiscordServiceConfig | null = null;
  private onConnectionStatusCallback?: (connected: boolean, error?: string) => void;

  /**
   * Connect to Discord
   */
  async connect(config: DiscordServiceConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    this.config = config;

    // Create Discord client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Connect
    try {
      await this.client.login(config.token);
      console.log('Connected to Discord');
      
      // Register slash commands
      await this.registerCommands();
      
      this.onConnectionStatusCallback?.(true);
    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      this.onConnectionStatusCallback?.(false, String(error));
      throw error;
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (!this.client) return;

    try {
      this.client.destroy();
      console.log('Disconnected from Discord');
      this.client = null;
      this.onConnectionStatusCallback?.(false);
    } catch (error) {
      console.error('Error disconnecting from Discord:', error);
    }
  }

  /**
   * Register slash commands
   */
  private async registerCommands(): Promise<void> {
    if (!this.config) return;

    const commands = [
      // /searchvoice - Quick search
      new SlashCommandBuilder()
        .setName('searchvoice')
        .setDescription('Search for voices by name or description')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search term (voice name, language, or provider)')
            .setRequired(true)
        ),
      
      // /findvoice - Advanced filtering with pagination
      new SlashCommandBuilder()
        .setName('findvoice')
        .setDescription('Find TTS voices with advanced filters')
        .addStringOption(option =>
          option.setName('language')
            .setDescription('Filter by language (e.g., English, French, Spanish)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('gender')
            .setDescription('Filter by gender')
            .setRequired(false)
            .addChoices(
              { name: 'Male', value: 'male' },
              { name: 'Female', value: 'female' }
            )
        )
        .addStringOption(option =>
          option.setName('provider')
            .setDescription('Filter by provider')
            .setRequired(false)
            .addChoices(
              { name: 'WebSpeech', value: 'webspeech' },
              { name: 'AWS Polly', value: 'aws' },
              { name: 'Azure TTS', value: 'azure' },
              { name: 'Google Cloud TTS', value: 'google' }
            )
        ),

      // /randomvoice - Get random suggestion
      new SlashCommandBuilder()
        .setName('randomvoice')
        .setDescription('Get a random voice suggestion for your stream'),

      // /listlanguages - Show available languages
      new SlashCommandBuilder()
        .setName('listlanguages')
        .setDescription('List all available languages for TTS voices')
        .addStringOption(option =>
          option.setName('provider')
            .setDescription('Filter by provider (optional)')
            .setRequired(false)
            .addChoices(
              { name: 'WebSpeech', value: 'webspeech' },
              { name: 'AWS Polly', value: 'aws' },
              { name: 'Azure TTS', value: 'azure' },
              { name: 'Google Cloud TTS', value: 'google' }
            )
        ),

      // /providers - Show provider info
      new SlashCommandBuilder()
        .setName('providers')
        .setDescription('Show information about available TTS providers'),

      // /help - Show help
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information for voice commands'),

      // /commands - Show Twitch commands
      new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Show available Twitch chat commands for TTS')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.config.token);

    try {
      console.log('Registering Discord slash commands...');
      
      if (this.config.guildId) {
        // Register guild-specific commands (instant)
        await rest.put(
          Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
          { body: commands }
        );
      } else {
        // Register global commands (takes up to 1 hour)
        await rest.put(
          Routes.applicationCommands(this.config.clientId),
          { body: commands }
        );
      }
      
      console.log('Discord slash commands registered');
    } catch (error) {
      console.error('Failed to register Discord commands:', error);
    }
  }

  /**
   * Set up Discord event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('ready', () => {
      console.log(`Discord bot ready as ${this.client?.user?.tag}`);
    });

    this.client.on('interactionCreate', async (interaction: Interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        }
      } catch (error) {
        console.error('Error handling Discord interaction:', error);
        if (interaction.isRepliable()) {
          const reply = {
            content: 'An error occurred while processing your request.',
            ephemeral: true
          };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      }
    });
  }

  /**
   * Handle slash commands
   */
  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;

    switch (commandName) {
      case 'searchvoice':
        await this.handleSearchVoice(interaction);
        break;
      case 'findvoice':
        await this.handleFindVoice(interaction);
        break;
      case 'randomvoice':
        await this.handleRandomVoice(interaction);
        break;
      case 'listlanguages':
        await this.handleListLanguages(interaction);
        break;
      case 'providers':
        await this.handleProviders(interaction);
        break;
      case 'help':
        await this.handleHelp(interaction);
        break;
      case 'commands':
        await this.handleCommandsHelp(interaction);
        break;
    }
  }

  /**
   * Handle /searchvoice command
   */
  private async handleSearchVoice(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    
    await interaction.deferReply();

    const voices = await VoiceService.searchVoices(query);
    
    if (voices.length === 0) {
      await interaction.editReply({
        content: `❌ No voices found matching "${query}". Try a different search term!`
      });
      return;
    }

    // Show up to 25 results with pagination
    const maxResults = Math.min(voices.length, 25);
    const results = voices.slice(0, maxResults);
    
    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle(`🔍 Voice Search Results for "${query}"`)
      .setDescription(`Found ${voices.length} voice${voices.length === 1 ? '' : 's'}${voices.length > maxResults ? ` (showing ${maxResults})` : ''}`)
      .setFooter({ text: 'Use /findvoice for advanced filtering' });

    for (const voice of results.slice(0, 10)) {
      const providerEmoji = this.getProviderEmoji(voice.provider);
      const genderIcon = this.getGenderIcon(voice.gender);
      embed.addFields({
        name: `${providerEmoji} ${voice.name} ${genderIcon}`,
        value: `**Voice ID:** \`${voice.voice_id}\`\n**Language:** ${voice.language_name}\n**Command:** \`~setvoice ${voice.voice_id}\``,
        inline: true
      });
    }

    if (results.length > 10) {
      embed.addFields({
        name: '\u200B',
        value: `*... and ${results.length - 10} more results. Use \`/findvoice\` with filters for better results.*`
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * Handle /findvoice command with pagination
   */
  private async handleFindVoice(interaction: ChatInputCommandInteraction): Promise<void> {
    const language = interaction.options.getString('language') || undefined;
    const gender = interaction.options.getString('gender') || undefined;
    const provider = interaction.options.getString('provider') || undefined;

    await interaction.deferReply();

    const filters: any = {};
    if (language) filters.language = language;
    if (gender) filters.gender = gender;
    if (provider) filters.provider = provider;

    const voices = await getVoicesByFilters(filters);

    if (voices.length === 0) {
      await interaction.editReply({
        content: '❌ No voices found matching your criteria. Try adjusting your filters!'
      });
      return;
    }

    // Store pagination state
    setPaginationState(
      interaction.user.id,
      interaction.id,
      voices,
      filters,
      10 // 10 voices per page
    );

    await this.sendPaginatedVoices(interaction);
  }

  /**
   * Send paginated voice results
   */
  private async sendPaginatedVoices(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const pageVoices = getPageVoices(interaction.user.id, interaction.id);
    const paginationInfo = getPaginationInfo(interaction.user.id, interaction.id);

    if (!paginationInfo) {
      await interaction.editReply({
        content: '❌ Pagination state expired. Please use `/findvoice` again.'
      });
      return;
    }

    const embeds = formatVoicesForEmbed(pageVoices, 10);
    const embed = embeds[0] || new EmbedBuilder();
    
    embed.setTitle('🎤 Voice Discovery')
      .setDescription(`Showing ${paginationInfo.startIdx}-${paginationInfo.endIdx} of ${paginationInfo.totalVoices} voices`)
      .setFooter({ text: `Page ${paginationInfo.currentPage}/${paginationInfo.totalPages}` });

    // Build pagination buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`prev_${interaction.id}`)
          .setLabel('← Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginationInfo.currentPage === 1),
        new ButtonBuilder()
          .setCustomId(`next_${interaction.id}`)
          .setLabel('Next →')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginationInfo.currentPage === paginationInfo.totalPages)
      );

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow]
    });
  }

  /**
   * Handle button interactions
   */
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const [action, interactionId] = interaction.customId.split('_');
    
    await interaction.deferUpdate();

    const state = getPaginationState(interaction.user.id, interactionId);
    if (!state) {
      await interaction.followUp({
        content: '❌ Pagination state expired. Use `/findvoice` again.',
        ephemeral: true
      });
      return;
    }

    let newPage = state.currentPage;
    if (action === 'next') {
      newPage = Math.min(state.currentPage + 1, state.totalPages);
    } else if (action === 'prev') {
      newPage = Math.max(state.currentPage - 1, 1);
    }

    updateCurrentPage(interaction.user.id, interactionId, newPage);
    await this.sendPaginatedVoices(interaction);
  }

  /**
   * Handle /randomvoice command
   */
  private async handleRandomVoice(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const voice = await getRandomVoice();
    
    if (!voice) {
      await interaction.editReply({
        content: '❌ No voices available. Please scan voices in the app first!'
      });
      return;
    }

    const providerEmoji = this.getProviderEmoji(voice.provider);
    const genderIcon = this.getGenderIcon(voice.gender);

    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle(`🎲 Random Voice Suggestion`)
      .setDescription(`Try this voice for your stream!`)
      .addFields(
        { name: 'Voice Name', value: `${providerEmoji} ${voice.name} ${genderIcon}`, inline: true },
        { name: 'Voice ID', value: `\`${voice.voice_id}\``, inline: true },
        { name: 'Language', value: voice.language_name, inline: true },
        { name: 'Provider', value: getProviderName(voice.provider), inline: true },
        { name: 'Type', value: voice.voice_type || 'Standard', inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        {
          name: '📝 Set This Voice',
          value: `In Twitch chat, use:\n\`~setvoice ${voice.voice_id}\`\n\n*Try another random: \`/randomvoice\`*`
        }
      );

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * Handle /listlanguages command
   */
  private async handleListLanguages(interaction: ChatInputCommandInteraction): Promise<void> {
    const provider = interaction.options.getString('provider') || undefined;

    await interaction.deferReply();

    const languages = await getAvailableLanguages(provider);

    if (languages.length === 0) {
      await interaction.editReply({
        content: '❌ No languages found. Make sure voices are synced in the app!'
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle('🌍 Available Languages')
      .setDescription(provider ? `Showing languages for **${getProviderName(provider)}**` : 'Showing all available languages');

    // Group languages by first letter
    const grouped: Record<string, string[]> = {};
    for (const lang of languages) {
      const firstLetter = lang[0].toUpperCase();
      if (!grouped[firstLetter]) grouped[firstLetter] = [];
      grouped[firstLetter].push(lang);
    }

    // Add fields for each letter group
    for (const [letter, langs] of Object.entries(grouped).sort()) {
      embed.addFields({
        name: letter,
        value: langs.join(', '),
        inline: false
      });
    }

    embed.setFooter({ text: `Total: ${languages.length} languages • Use /findvoice language:<name>` });

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * Handle /providers command
   */
  private async handleProviders(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle('🏢 Available TTS Providers')
      .setDescription('Compare and learn about TTS providers')
      .addFields(
        {
          name: '🌐 WebSpeech',
          value: '**Quality:** Standard\n**Latency:** Very fast\n**Languages:** 40+\n**Cost:** Free\n**Best for:** Quick testing, browser-based',
          inline: true
        },
        {
          name: '🔴 Google Cloud TTS',
          value: '**Quality:** High\n**Latency:** Fast\n**Languages:** 80+\n**Cost:** Paid ($4/million chars)\n**Best for:** Professional, international',
          inline: true
        },
        {
          name: '🔵 Microsoft Azure',
          value: '**Quality:** High\n**Latency:** Fast\n**Languages:** 100+\n**Cost:** Paid\n**Best for:** Premium voices, enterprise',
          inline: true
        },
        {
          name: '☁️ AWS Polly',
          value: '**Quality:** High\n**Latency:** Fast\n**Languages:** 30+\n**Cost:** Paid ($4/million chars)\n**Best for:** Neural voices, reliable',
          inline: true
        },
        {
          name: '💡 How to Choose',
          value: '• **Budget-conscious?** → Try WebSpeech first\n• **Need variety?** → Azure has the most languages\n• **High quality?** → Google, Azure, and AWS are all great\n• **Easy setup?** → WebSpeech requires no API keys',
          inline: false
        }
      )
      .setFooter({ text: 'Configure providers in the TTS tab of the app' });

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Handle /help command
   */
  private async handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle('🎤 Stream TTS Discord Bot - Help')
      .setDescription('Discover and manage TTS voices for your stream')
      .addFields(
        {
          name: '⭐ Top Commands',
          value: '`/searchvoice` ⭐⭐⭐ - Quick search by name\n' +
                 '`/findvoice` ⭐⭐⭐ - Advanced filters with pagination\n' +
                 '`/randomvoice` ⭐⭐ - Get a random suggestion\n' +
                 '`/providers` ⭐⭐ - Learn about TTS providers\n' +
                 '`/listlanguages` - View all languages\n' +
                 '`/commands` - Show Twitch chat commands\n' +
                 '`/help` - Show this message',
          inline: false
        },
        {
          name: '🔥 Quick Start',
          value: '1. Use `/searchvoice` or `/findvoice` to discover voices\n' +
                 '2. Find a voice you like\n' +
                 '3. Copy the Voice ID\n' +
                 '4. In Twitch chat: `~setvoice <Voice ID>`\n' +
                 '5. Customize with `~setpitch` and `~setspeed`\n' +
                 '6. Done! Your TTS voice is set',
          inline: false
        },
        {
          name: '🔍 /searchvoice',
          value: '**Usage:** `/searchvoice query:<search>`\n\n' +
                 '**Examples:**\n' +
                 '• `/searchvoice query:English`\n' +
                 '• `/searchvoice query:Joanna`\n' +
                 '• `/searchvoice query:Google`',
          inline: false
        },
        {
          name: '🎯 /findvoice',
          value: '**Usage:** `/findvoice [language] [gender] [provider]`\n\n' +
                 '**Examples:**\n' +
                 '• `/findvoice language:Spanish`\n' +
                 '• `/findvoice gender:Female provider:Azure`\n' +
                 '• `/findvoice language:French gender:Male`\n\n' +
                 '**Features:** Pagination, filters, voice details',
          inline: false
        },
        {
          name: '🎲 /randomvoice',
          value: 'Get a random voice suggestion!\n\n' +
                 'Perfect for:\n' +
                 '• Discovering new voices\n' +
                 '• Keeping your stream fresh\n' +
                 '• Fun spontaneous changes',
          inline: false
        },
        {
          name: '🎮 Twitch Chat Commands',
          value: '`~setvoice <id>` - Set your voice\n' +
                 '`~setpitch 0.5-2.0` - Adjust pitch\n' +
                 '`~setspeed 0.5-2.0` - Adjust speed\n' +
                 '`~setvolume 0.0-1.0` - Adjust volume\n' +
                 '`~myvoice` - Check your settings\n\n' +
                 '*All voice settings are Twitch-only*',
          inline: false
        },
        {
          name: '💡 Tips & Tricks',
          value: '✓ Try `/randomvoice` for discovery\n' +
                 '✓ Combine filters in `/findvoice` for precision\n' +
                 '✓ Use pagination buttons to browse more voices\n' +
                 '✓ All voice searching happens in Discord\n' +
                 '✓ Voice configuration happens in Twitch chat',
          inline: false
        }
      )
      .setFooter({ text: 'Stream TTS • Voice Discovery Bot' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /**
   * Handle /commands help
   */
  private async handleCommandsHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle('🎮 Twitch Chat Commands')
      .setDescription('Use these commands in the streamer\'s Twitch chat to control your TTS voice.\n\n⚠️ **Note:** Voice settings are tied to your Twitch account, not Discord. Use this Discord bot to discover voices, then configure them in Twitch chat.')
      .addFields(
        {
          name: 'Voice Selection',
          value: '`~setvoice <voice_id>` - Set your TTS voice\nExample: `~setvoice Joanna`\n*Use `/searchvoice` or `/findvoice` in Discord to find voice IDs*'
        },
        {
          name: 'Voice Customization',
          value: '`~setpitch <0.5-2.0>` - Adjust voice pitch (default: 1.0)\n`~setspeed <0.5-2.0>` - Adjust speaking speed (default: 1.0)\n`~setvolume <0.0-1.0>` - Adjust volume (default: 1.0)'
        },
        {
          name: 'View Settings',
          value: '`~myvoice` - See your current TTS settings (Twitch chat only)\n`~voices` - List available voices (Twitch chat only)'
        },
        {
          name: 'Examples',
          value: '```~setvoice Matthew\n~setpitch 1.2\n~setspeed 0.9\n~setvolume 0.8```'
        }
      )
      .setFooter({ text: 'All commands must be used in Twitch chat, not Discord' });

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Get provider emoji
   */
  private getProviderEmoji(provider: string): string {
    const emojis: Record<string, string> = {
      'webspeech': '🌐',
      'aws': '☁️',
      'azure': '🔵',
      'google': '🔴'
    };
    return emojis[provider] || '🎤';
  }

  /**
   * Get gender icon
   */
  private getGenderIcon(gender?: string): string {
    if (!gender) return '';
    const lower = gender.toLowerCase();
    if (lower === 'male') return '♂️';
    if (lower === 'female') return '♀️';
    return '';
  }

  /**
   * Check if bot is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.isReady();
  }

  /**
   * Set connection status callback
   */
  onConnectionStatus(callback: (connected: boolean, error?: string) => void): void {
    this.onConnectionStatusCallback = callback;
  }

  /**
   * Clean up on destroy
   */
  destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

// Singleton instance
let discordService: DiscordService | null = null;

export function getDiscordService(): DiscordService {
  if (!discordService) {
    discordService = new DiscordService();
  }
  return discordService;
}
