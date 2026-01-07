/**
 * Discord Voice Discovery Service
 * Provides voice filtering and discovery functions
 */

import { VoiceService } from '../database/voiceService';
import { EmbedBuilder } from 'discord.js';

interface VoiceFilters {
  language?: string;
  gender?: string;
  provider?: string;
}

/**
 * Get voices by filters
 */
export async function getVoicesByFilters(filters: VoiceFilters): Promise<any[]> {
  let voices = await VoiceService.getAllVoices();

  if (filters.language) {
    voices = voices.filter(v => 
      v.language_name?.toLowerCase().includes(filters.language!.toLowerCase())
    );
  }

  if (filters.gender) {
    voices = voices.filter(v => 
      v.gender?.toLowerCase() === filters.gender!.toLowerCase()
    );
  }

  if (filters.provider) {
    voices = voices.filter(v => 
      v.provider?.toLowerCase() === filters.provider!.toLowerCase()
    );
  }

  return voices;
}

/**
 * Get a random voice
 */
export async function getRandomVoice(): Promise<any | null> {
  const voices = await VoiceService.getAllVoices();
  if (voices.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * voices.length);
  return voices[randomIndex];
}

/**
 * Get available languages
 */
export async function getAvailableLanguages(provider?: string): Promise<string[]> {
  let voices = await VoiceService.getAllVoices();

  if (provider) {
    voices = voices.filter(v => 
      v.provider?.toLowerCase() === provider.toLowerCase()
    );
  }

  const languages = new Set<string>();
  for (const voice of voices) {
    if (voice.language_name) {
      languages.add(voice.language_name);
    }
  }

  return Array.from(languages).sort();
}

/**
 * Format voices for embed display
 */
export function formatVoicesForEmbed(voices: any[], maxPerEmbed: number = 10): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];
  
  for (let i = 0; i < voices.length; i += maxPerEmbed) {
    const chunk = voices.slice(i, i + maxPerEmbed);
    const embed = new EmbedBuilder()
      .setColor(0x9146FF);

    for (const voice of chunk) {
      const providerEmoji = getProviderEmoji(voice.provider);
      const genderIcon = getGenderIcon(voice.gender);
      
      embed.addFields({
        name: `${providerEmoji} ${voice.name} ${genderIcon}`,
        value: `**Voice ID:** \`${voice.voice_id}\`\n**Language:** ${voice.language_name}\n**Type:** ${voice.voice_type || 'Standard'}\n**Command:** \`~setvoice ${voice.voice_id}\``,
        inline: true
      });
    }

    embeds.push(embed);
  }

  return embeds;
}

/**
 * Get provider emoji
 */
function getProviderEmoji(provider: string): string {
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
function getGenderIcon(gender?: string): string {
  if (!gender) return '';
  const lower = gender.toLowerCase();
  if (lower === 'male') return '♂️';
  if (lower === 'female') return '♀️';
  return '⚧️';
}

/**
 * Get provider display name
 */
export function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    'webspeech': 'WebSpeech',
    'aws': 'AWS Polly',
    'azure': 'Azure TTS',
    'google': 'Google Cloud TTS'
  };
  return names[provider] || provider;
}
