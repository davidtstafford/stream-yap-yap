import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles/App.css';
import { getTTSQueue } from './services/ttsQueue';
import { getTTSRulesService } from './services/ttsRules';

// Page components (we'll create these)
import Connection from './pages/Connection';
import Chat from './pages/Chat';
import ChatHistory from './pages/ChatHistory';
import Viewers from './pages/Viewers';
import TTS from './pages/TTS';
import Commands from './pages/Commands';
import DiscordBot from './pages/DiscordBot';

interface ChatMessage {
  id?: number;
  viewer_id: string;
  username: string;
  display_name?: string;
  message: string;
  timestamp: string;
  badges?: string;
  was_read_by_tts?: boolean;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const processedMessagesRef = useRef(new Set<string>());
  const ttsQueue = getTTSQueue();
  const ttsRules = getTTSRulesService();

  useEffect(() => {
    // Load TTS settings
    loadTTSSettings();

    // Listen for new messages at app level
    const unsubscribeMessages = window.api.on('twitch:message', (message: ChatMessage) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        // Keep only last 500 messages in memory
        if (newMessages.length > 500) {
          return newMessages.slice(-500);
        }
        return newMessages;
      });

      // Process message for TTS immediately when it arrives
      processMessageForTTS(message);
    });

    // Listen for clear queue command from chat
    const unsubscribeClearQueue = window.api.on('tts:clearQueue', () => {
      console.log('Clearing TTS queue from command');
      ttsQueue.clear();
    });

    return () => {
      unsubscribeMessages();
      unsubscribeClearQueue();
    };
  }, []);

  const loadTTSSettings = async () => {
    try {
      const enabled = await window.api.invoke('db:getSetting', 'tts_enabled');
      if (enabled) setTtsEnabled(enabled === 'true');
    } catch (err) {
      console.error('Failed to load TTS settings:', err);
    }
  };

  const checkTTSAccess = async (message: ChatMessage): Promise<boolean> => {
    try {
      // Check if access restriction is enabled
      const accessRestricted = await window.api.invoke('db:getSetting', 'tts_access_restricted');
      if (accessRestricted !== 'true') {
        console.log(`[TTS Access] Access not restricted, allowing ${message.username}`);
        return true; // Access not restricted, everyone can use TTS
      }

      // Get viewer information
      const viewer = await window.api.invoke('db:getViewer', message.viewer_id);
      if (!viewer) {
        console.log(`[TTS Access] Unknown viewer ${message.username}, denying access`);
        return false; // Unknown viewer
      }

      console.log(`[TTS Access] Checking access for ${message.username}:`, {
        is_subscriber: viewer.is_subscriber,
        is_vip: viewer.is_vip,
        is_moderator: viewer.is_moderator
      });

      // Check allowed groups
      const [allowSubs, allowVIPs, allowMods, allowRedeems] = await Promise.all([
        window.api.invoke('db:getSetting', 'tts_access_subscribers'),
        window.api.invoke('db:getSetting', 'tts_access_vips'),
        window.api.invoke('db:getSetting', 'tts_access_moderators'),
        window.api.invoke('db:getSetting', 'tts_access_redeems')
      ]);

      console.log(`[TTS Access] Allowed groups:`, {
        subscribers: allowSubs === 'true',
        vips: allowVIPs === 'true',
        moderators: allowMods === 'true',
        redeems: allowRedeems === 'true'
      });

      // Check subscriber status
      if (allowSubs === 'true' && viewer.is_subscriber) {
        console.log(`[TTS Access] ${message.username} granted access (subscriber)`);
        return true;
      }

      // Check VIP status
      if (allowVIPs === 'true' && viewer.is_vip) {
        console.log(`[TTS Access] ${message.username} granted access (VIP)`);
        return true;
      }

      // Check moderator status
      if (allowMods === 'true' && viewer.is_moderator) {
        console.log(`[TTS Access] ${message.username} granted access (moderator)`);
        return true;
      }

      // Check redeem access
      if (allowRedeems === 'true') {
        const activeRedeem = await window.api.invoke('db:query',
          "SELECT * FROM tts_access_redeems WHERE viewer_id = ? AND is_active = 1 AND expires_at > datetime('now') LIMIT 1",
          [message.viewer_id]
        );
        
        if (activeRedeem && activeRedeem.length > 0) {
          console.log(`[TTS Access] ${message.username} granted access (active redeem)`);
          return true;
        }
      }

      console.log(`[TTS Access] ${message.username} DENIED access - no matching criteria`);
      return false; // No access granted
    } catch (err) {
      console.error('Failed to check TTS access:', err);
      return true; // Default to allowing access on error
    }
  };

  /**
   * Validate voice selection - ensure provider is enabled and neural voices aren't disabled
   * Falls back to default voice or WebSpeech if current voice is invalid
   */
  const validateVoiceSelection = async (voiceId: string, provider: string): Promise<{ voiceId: string; provider: string }> => {
    try {
      // Check if provider is enabled
      const providerEnabled = await window.api.invoke('db:getSetting', `tts_${provider}_enabled`);
      if (providerEnabled !== 'true' && provider !== 'webspeech') {
        console.log(`[Voice Validation] Provider ${provider} is disabled, falling back`);
        // Provider disabled, use default voice
        const defaultVoice = await window.api.invoke('db:getSetting', 'tts_default_voice');
        if (defaultVoice) {
          return validateVoiceSelection(defaultVoice, 'webspeech'); // Recursively validate default
        }
        return { voiceId: '', provider: 'webspeech' }; // Fallback to WebSpeech
      }

      // Check if voice exists and get its type
      const voiceInfo = await window.api.invoke('db:query',
        'SELECT provider, voice_type FROM tts_voices WHERE voice_id = ? AND provider = ? LIMIT 1',
        [voiceId, provider]
      );

      if (!voiceInfo || voiceInfo.length === 0) {
        console.log(`[Voice Validation] Voice ${voiceId} not found, falling back`);
        // Voice doesn't exist, use default
        const defaultVoice = await window.api.invoke('db:getSetting', 'tts_default_voice');
        if (defaultVoice && defaultVoice !== voiceId) {
          return validateVoiceSelection(defaultVoice, 'webspeech');
        }
        return { voiceId: '', provider: 'webspeech' };
      }

      const voiceType = voiceInfo[0].voice_type;

      // Check if neural voices are disabled for this provider
      if (voiceType === 'neural') {
        const neuralDisabled = await window.api.invoke('db:getSetting', `tts_${provider}_disable_neural`);
        if (neuralDisabled === 'true') {
          console.log(`[Voice Validation] Neural voices disabled for ${provider}, falling back`);
          // Neural disabled, use default voice
          const defaultVoice = await window.api.invoke('db:getSetting', 'tts_default_voice');
          if (defaultVoice && defaultVoice !== voiceId) {
            return validateVoiceSelection(defaultVoice, 'webspeech');
          }
          return { voiceId: '', provider: 'webspeech' };
        }
      }

      // Voice is valid
      return { voiceId, provider };
    } catch (err) {
      console.error('[Voice Validation] Error validating voice:', err);
      return { voiceId: '', provider: 'webspeech' }; // Fallback on error
    }
  };

  const processMessageForTTS = async (message: ChatMessage) => {
    const messageKey = `${message.viewer_id}-${message.timestamp}`;
    if (processedMessagesRef.current.has(messageKey)) {
      return; // Already processed
    }
    processedMessagesRef.current.add(messageKey);
    
    try {
      // Check global TTS enabled setting (mutetts/unmutetts)
      const globalEnabled = await window.api.invoke('db:getSetting', 'tts_enabled');
      if (globalEnabled === 'false') {
        console.log('TTS is globally muted');
        return;
      }

      // Check if viewer has access to TTS
      const hasAccess = await checkTTSAccess(message);
      if (!hasAccess) {
        console.log(`${message.username} does not have TTS access`);
        return;
      }

      // Apply TTS rules to filter/process message
      const processed = await ttsRules.processMessage(message);
      if (!processed.shouldSpeak) {
        console.log(`Message filtered: ${processed.reason}`);
        return;
      }

      // Check if viewer has TTS restrictions
      const restrictions = await window.api.invoke('db:getViewerTTSRestrictions', message.viewer_id);
      if (restrictions) {
        // Check if viewer is muted
        if (restrictions.is_muted) {
          // Check if mute has expired
          if (restrictions.mute_expires_at) {
            const expiresAt = new Date(restrictions.mute_expires_at);
            if (expiresAt > new Date()) {
              console.log(`${message.username} is muted until ${expiresAt}`);
              return;
            }
          } else {
            // Permanent mute
            console.log(`${message.username} is permanently muted`);
            return;
          }
        }

        // Check cooldown
        if (restrictions.has_cooldown) {
          // Check if cooldown period has expired
          if (restrictions.cooldown_expires_at) {
            const expiresAt = new Date(restrictions.cooldown_expires_at);
            if (expiresAt <= new Date()) {
              console.log(`${message.username}'s cooldown period has expired`);
              // Cooldown period expired, allow TTS
            } else if (restrictions.last_tts_at) {
              // Within cooldown period, check gap
              const lastTTS = new Date(restrictions.last_tts_at);
              const cooldownSeconds = restrictions.cooldown_gap_seconds || 0;
              const timeSinceLastTTS = (Date.now() - lastTTS.getTime()) / 1000;
              
              if (timeSinceLastTTS < cooldownSeconds) {
                console.log(`${message.username} is on cooldown for ${cooldownSeconds - timeSinceLastTTS}s more`);
                return;
              }
            }
          } else if (restrictions.last_tts_at) {
            // Permanent cooldown (no expiration)
            const lastTTS = new Date(restrictions.last_tts_at);
            const cooldownSeconds = restrictions.cooldown_gap_seconds || 0;
            const timeSinceLastTTS = (Date.now() - lastTTS.getTime()) / 1000;
            
            if (timeSinceLastTTS < cooldownSeconds) {
              console.log(`${message.username} is on cooldown for ${cooldownSeconds - timeSinceLastTTS}s more`);
              return;
            }
          }
        }
      }
      
      // Get viewer's voice preference (or use default)
      const voicePrefs = await window.api.invoke('db:getViewerVoicePreference', message.viewer_id);
      const defaultVoice = await window.api.invoke('db:getSetting', 'tts_default_voice');
      const defaultSpeed = await window.api.invoke('db:getSetting', 'tts_default_speed');
      const defaultPitch = await window.api.invoke('db:getSetting', 'tts_default_pitch');
      const defaultVolume = await window.api.invoke('db:getSetting', 'tts_default_volume');
      
      // Use viewer preferences if available, otherwise use defaults
      const voiceId = voicePrefs?.voice_id || defaultVoice;
      const speed = voicePrefs?.speed || (defaultSpeed ? parseFloat(defaultSpeed) : 1.0);
      const pitch = voicePrefs?.pitch || (defaultPitch ? parseFloat(defaultPitch) : 1.0);
      const volume = voicePrefs?.volume || (defaultVolume ? parseFloat(defaultVolume) : 1.0);
      
      // Get provider for the voice
      let provider = voicePrefs?.provider || 'webspeech';
      if (!voicePrefs && voiceId) {
        // If using default voice, look up its provider from tts_voices table
        const voiceInfo = await window.api.invoke('db:query', 
          'SELECT provider FROM tts_voices WHERE voice_id = ? LIMIT 1',
          [voiceId]
        );
        if (voiceInfo && voiceInfo.length > 0) {
          provider = voiceInfo[0].provider;
        }
      }
      
      // Validate voice is allowed (provider enabled, neural not disabled)
      const validatedVoice = await validateVoiceSelection(voiceId, provider);
      const finalVoiceId = validatedVoice.voiceId;
      const finalProvider = validatedVoice.provider;
      
      // Add to TTS queue with processed text (already includes username if configured)
      ttsQueue.add({
        id: `msg-${message.viewer_id}-${Date.now()}`,
        text: processed.text,
        voiceId: finalVoiceId || undefined,
        provider: finalProvider,
        speed,
        pitch,
        volume,
        viewerId: message.viewer_id,
        username: message.display_name || message.username
      });

      // Update last TTS timestamp for cooldown tracking
      if (restrictions?.has_cooldown) {
        await window.api.invoke('db:updateLastTTSTime', message.viewer_id);
      }
    } catch (err) {
      console.error('Failed to process message for TTS:', err);
    }
  };

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <h1 className="app-title">Stream Yap Yap</h1>
          <ul className="nav-menu">
            <li><Link to="/">📡 Connection</Link></li>
            <li><Link to="/chat">💬 Chat</Link></li>
            <li><Link to="/chat-history">📜 Chat History</Link></li>
            <li><Link to="/viewers">👥 Viewers</Link></li>
            <li><Link to="/tts">🔊 TTS</Link></li>
            <li><Link to="/commands">⚡ Chat Commands</Link></li>
            <li><Link to="/discord">🎮 Discord Bot</Link></li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Connection />} />
            <Route path="/chat" element={<Chat messages={messages} onClearMessages={() => setMessages([])} />} />
            <Route path="/chat-history" element={<ChatHistory />} />
            <Route path="/viewers" element={<Viewers />} />
            <Route path="/tts" element={<TTS />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/discord" element={<DiscordBot />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
