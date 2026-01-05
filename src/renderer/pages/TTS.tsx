import React, { useState, useEffect } from 'react';
import { getWebSpeechService, WebSpeechVoice } from '../services/webSpeechService';
import { getTTSQueue, TTSQueueItem } from '../services/ttsQueue';

const TTS: React.FC = () => {
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices] = useState<WebSpeechVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [testText, setTestText] = useState('Hello! This is a test message.');
  const [queue, setQueue] = useState<TTSQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<TTSQueueItem | null>(null);

  const webSpeechService = getWebSpeechService();
  const ttsQueue = getTTSQueue();

  useEffect(() => {
    // Load settings
    loadSettings();
    
    // Load voices
    loadVoices();
    
    // Set up queue update listener
    ttsQueue.onQueueUpdate((updatedQueue) => {
      setQueue(updatedQueue);
    });
    
    ttsQueue.onItemStart((item) => {
      setCurrentItem(item);
    });
    
    ttsQueue.onItemComplete(() => {
      setCurrentItem(null);
    });
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await window.api.invoke('db:getSetting', 'tts_enabled');
      const voice = await window.api.invoke('db:getSetting', 'tts_default_voice');
      const vol = await window.api.invoke('db:getSetting', 'tts_default_volume');
      const spd = await window.api.invoke('db:getSetting', 'tts_default_speed');
      const ptch = await window.api.invoke('db:getSetting', 'tts_default_pitch');
      
      if (enabled) setTtsEnabled(enabled === 'true');
      if (voice) setSelectedVoice(voice);
      if (vol) setVolume(parseFloat(vol));
      if (spd) setSpeed(parseFloat(spd));
      if (ptch) setPitch(parseFloat(ptch));
    } catch (err) {
      console.error('Failed to load TTS settings:', err);
    }
  };

  const loadVoices = async () => {
    try {
      const availableVoices = await webSpeechService.getVoices();
      setVoices(availableVoices);
      
      // If no voice selected, select first one
      if (!selectedVoice && availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0].voice_id);
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await window.api.invoke('db:setSetting', key, value);
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleTtsEnabledChange = (checked: boolean) => {
    setTtsEnabled(checked);
    saveSetting('tts_enabled', checked ? 'true' : 'false');
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    saveSetting('tts_default_voice', voiceId);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    saveSetting('tts_default_volume', val.toString());
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    saveSetting('tts_default_speed', val.toString());
  };

  const handlePitchChange = (val: number) => {
    setPitch(val);
    saveSetting('tts_default_pitch', val.toString());
  };

  const handleTestVoice = () => {
    ttsQueue.add({
      id: `test-${Date.now()}`,
      text: testText,
      voiceId: selectedVoice,
      provider: 'webspeech',
      speed,
      pitch,
      volume
    });
  };

  const handleClearQueue = () => {
    ttsQueue.clear();
  };

  const handleSkipCurrent = () => {
    ttsQueue.skip();
  };

  return (
    <div className="page">
      <h2>Text-to-Speech</h2>

      {/* TTS Enable/Disable */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>TTS Status</h3>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => handleTtsEnabledChange(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px' }}
          />
          <span style={{ fontSize: '16px' }}>
            {ttsEnabled ? '✅ TTS Enabled' : '❌ TTS Disabled'}
          </span>
        </label>
      </div>

      {/* Voice Selection */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Voice Settings</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Voice
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: '1px solid #505050',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} - {voice.language_name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
            {voices.length} voices available
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Volume: {volume.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Speed: {speed.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Pitch: {pitch.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Test Voice */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Test Voice</h3>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          rows={3}
          style={{ marginBottom: '10px' }}
        />
        <button className="primary" onClick={handleTestVoice}>
          🔊 Test Voice
        </button>
      </div>

      {/* TTS Queue */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>TTS Queue ({queue.length})</h3>
          <div>
            <button className="secondary" onClick={handleSkipCurrent} style={{ marginRight: '10px' }}>
              Skip Current
            </button>
            <button className="secondary" onClick={handleClearQueue}>
              Clear Queue
            </button>
          </div>
        </div>

        {currentItem && (
          <div style={{
            padding: '12px',
            backgroundColor: '#9147ff22',
            border: '1px solid #9147ff',
            borderRadius: '6px',
            marginBottom: '10px'
          }}>
            <div style={{ fontSize: '12px', color: '#9147ff', marginBottom: '5px' }}>
              🔊 Now Playing
            </div>
            <div style={{ fontSize: '14px' }}>
              {currentItem.username && <strong>{currentItem.username}: </strong>}
              {currentItem.text}
            </div>
          </div>
        )}

        {queue.length === 0 && !currentItem ? (
          <p style={{ color: '#888', fontSize: '14px' }}>Queue is empty</p>
        ) : (
          <div>
            {queue.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '10px',
                  backgroundColor: '#252525',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}
              >
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>
                  #{index + 1} - {item.status}
                </div>
                <div>
                  {item.username && <strong>{item.username}: </strong>}
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TTS;
