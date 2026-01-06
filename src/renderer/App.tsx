import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles/App.css';
import { getTTSQueue } from './services/ttsQueue';

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
    if (!ttsEnabled) return;

    const messageKey = `${message.viewer_id}-${message.timestamp}`;
    if (processedMessagesRef.current.has(messageKey)) {
      return; // Already processed
    }
    processedMessagesRef.current.add(messageKey);
    
    try {
      // Check if viewer is muted
      const isMuted = await window.api.invoke('db:getSetting', `viewer_muted_${message.viewer_id}`);
      if (isMuted === 'true') return;
      
      // Get viewer's voice preference (or use default)
      const defaultVoice = await window.api.invoke('db:getSetting', 'tts_default_voice');
      const defaultSpeed = await window.api.invoke('db:getSetting', 'tts_default_speed');
      const defaultPitch = await window.api.invoke('db:getSetting', 'tts_default_pitch');
      const defaultVolume = await window.api.invoke('db:getSetting', 'tts_default_volume');
      
      // Add to TTS queue
      ttsQueue.add({
        id: `msg-${message.viewer_id}-${Date.now()}`,
        text: `${message.display_name || message.username} says: ${message.message}`,
        voiceId: defaultVoice || undefined,
        provider: 'webspeech',
        speed: defaultSpeed ? parseFloat(defaultSpeed) : 1.0,
        pitch: defaultPitch ? parseFloat(defaultPitch) : 1.0,
        volume: defaultVolume ? parseFloat(defaultVolume) : 1.0,
        viewerId: message.viewer_id,
        username: message.display_name || message.username
      });
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
