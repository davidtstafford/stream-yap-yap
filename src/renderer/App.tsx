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
    const unsubscribe = window.api.on('twitch:message', (message: ChatMessage) => {
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

    return () => {
      unsubscribe();
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
      
      // Add to TTS queue with processed text (already includes username if configured)
      ttsQueue.add({
        id: `msg-${message.viewer_id}-${Date.now()}`,
        text: processed.text,
        voiceId: voiceId || undefined,
        provider: voicePrefs?.provider || 'webspeech',
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
