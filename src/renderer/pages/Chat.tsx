import React, { useState, useEffect, useRef } from 'react';
import { getTTSQueue } from '../services/ttsQueue';

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

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ttsQueue = getTTSQueue();

  useEffect(() => {
    // Load TTS enabled setting
    loadTTSSettings();
    
    // Listen for new messages from Twitch
    const unsubscribe = window.api.on('twitch:message', (message: ChatMessage) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        // Keep only last 500 messages in memory for performance
        if (newMessages.length > 500) {
          return newMessages.slice(-500);
        }
        return newMessages;
      });
      
      // Process message for TTS
      processMessageForTTS(message);
    });

    return () => {
      unsubscribe();
    };
  }, [ttsEnabled]);

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

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleClearChat = () => {
    if (confirm('Clear all messages from this session? (History will remain in database)')) {
      setMessages([]);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const parseBadges = (badgesStr?: string): string[] => {
    if (!badgesStr) return [];
    try {
      const badges = JSON.parse(badgesStr);
      return Object.keys(badges);
    } catch {
      return [];
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Live Chat</h2>
        <div>
          <label style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-scroll
          </label>
          <button className="secondary" onClick={handleClearChat}>
            Clear Chat
          </button>
        </div>
      </div>

      <div 
        className="card" 
        ref={containerRef}
        style={{ 
          height: 'calc(100vh - 200px)', 
          overflow: 'auto',
          padding: '10px'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#888', 
            padding: '40px',
            fontSize: '14px'
          }}>
            No messages yet. Connect to Twitch to see chat messages.
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '8px 10px',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  gap: '10px',
                  fontSize: '14px'
                }}
              >
                <span style={{ color: '#666', minWidth: '50px', flexShrink: 0 }}>
                  {formatTime(msg.timestamp)}
                </span>
                
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {parseBadges(msg.badges).map(badge => (
                    <span 
                      key={badge}
                      style={{ 
                        backgroundColor: '#9147ff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                
                <span style={{ 
                  color: '#9147ff', 
                  fontWeight: 'bold',
                  minWidth: '100px',
                  flexShrink: 0
                }}>
                  {msg.display_name || msg.username}
                </span>
                
                <span style={{ color: '#fff', wordBreak: 'break-word' }}>
                  {msg.message}
                </span>
                
                {msg.was_read_by_tts && (
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>🔊</span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
