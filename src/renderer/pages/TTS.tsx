import React, { useState, useEffect } from 'react';
import { getWebSpeechService, WebSpeechVoice } from '../services/webSpeechService';
import { getTTSQueue, TTSQueueItem } from '../services/ttsQueue';

type TTSTab = 'main' | 'rules' | 'access' | 'voice-settings' | 'restrictions';

const TTS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TTSTab>('main');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices] = useState<WebSpeechVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [testText, setTestText] = useState('Hello! This is a test message.');
  const [queue, setQueue] = useState<TTSQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<TTSQueueItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [obsRunning, setObsRunning] = useState(false);
  const [obsUrl, setObsUrl] = useState('');
  const [muteInApp, setMuteInApp] = useState(false);

  const webSpeechService = getWebSpeechService();
  const ttsQueue = getTTSQueue();

  useEffect(() => {
    // Load settings
    loadSettings();
    
    // Load voices (auto-scan if none exist)
    initVoices();

    // Check OBS server status
    checkObsStatus();
    
    // Load mute in-app setting
    loadMuteInAppSetting();
    
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

  const initVoices = async () => {
    const loadedVoices = await loadVoices();
    
    // If no voices found, auto-scan
    if (loadedVoices.length === 0) {
      console.log('No voices found, auto-scanning...');
      await handleScanVoices();
    }
  };

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
      // Load voices from database (already scanned and stored)
      const dbVoices = await window.api.invoke('db:getAvailableVoices');
      if (dbVoices && dbVoices.length > 0) {
        const voiceList = dbVoices.map((v: any) => ({
          voice_id: v.voice_id,
          name: v.name,
          language_name: v.language_name,
          provider: v.provider
        }));
        setVoices(voiceList);
        
        // If no voice selected, select first one
        if (!selectedVoice && voiceList.length > 0) {
          setSelectedVoice(voiceList[0].voice_id);
        }
        
        return voiceList;
      }
      return [];
    } catch (err) {
      console.error('Failed to load voices:', err);
      return [];
    }
  };

  const handleScanVoices = async () => {
    setIsScanning(true);
    try {
      // Get voices from browser's Web Speech API
      const speechVoices = window.speechSynthesis.getVoices();
      
      // Send voices to main process to store in database
      await window.api.invoke('db:syncWebSpeechVoices', speechVoices.map(v => ({
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default
      })));
      
      await loadVoices();
      setLastScanTime(new Date().toLocaleString());
    } catch (err) {
      console.error('Failed to scan voices:', err);
    } finally {
      setIsScanning(false);
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

  const checkObsStatus = async () => {
    try {
      const status = await window.api.invoke('obs:getStatus');
      setObsRunning(status.running);
      setObsUrl(status.url);
    } catch (err) {
      console.error('Failed to check OBS status:', err);
    }
  };

  const handleStartObs = async () => {
    try {
      const result = await window.api.invoke('obs:start');
      if (result.success) {
        setObsRunning(true);
        setObsUrl(result.url);
      } else {
        alert(`Failed to start OBS server: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to start OBS server:', err);
      alert('Failed to start OBS server');
    }
  };

  const handleStopObs = async () => {
    try {
      const result = await window.api.invoke('obs:stop');
      if (result.success) {
        setObsRunning(false);
      } else {
        alert(`Failed to stop OBS server: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to stop OBS server:', err);
      alert('Failed to stop OBS server');
    }
  };

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    alert('URL copied to clipboard!');
  };

  const loadMuteInAppSetting = async () => {
    try {
      const val = await window.api.invoke('db:getSetting', 'tts_mute_in_app');
      setMuteInApp(val === 'true');
    } catch (error) {
      console.error('Failed to load mute in-app setting:', error);
    }
  };

  const handleMuteInAppToggle = async () => {
    try {
      const newValue = !muteInApp;
      await window.api.invoke('db:setSetting', 'tts_mute_in_app', String(newValue));
      setMuteInApp(newValue);
    } catch (error) {
      console.error('Failed to toggle mute in-app:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'main':
        return renderMainTab();
      case 'rules':
        return renderRulesTab();
      case 'access':
        return renderAccessTab();
      case 'voice-settings':
        return renderVoiceSettingsTab();
      case 'restrictions':
        return renderRestrictionsTab();
      default:
        return renderMainTab();
    }
  };

  const renderMainTab = () => (
    <>
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

      {/* Voice Management */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Voice Management</h3>
          <button 
            className="primary" 
            onClick={handleScanVoices}
            disabled={isScanning}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {isScanning ? '⏳ Scanning...' : '🔍 Scan for Voices'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
          {voices.length} voices available
          {lastScanTime && ` • Last scanned: ${lastScanTime}`}
        </p>
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
                {voice.name} - {voice.language_name} ({voice.provider})
              </option>
            ))}
          </select>
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

      {/* OBS Browser Source */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>OBS Browser Source</h3>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '15px' }}>
          Use this URL in OBS as a Browser Source to display TTS messages in your stream.
        </p>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {obsRunning ? (
              <button className="secondary" onClick={handleStopObs}>
                ⏹️ Stop Server
              </button>
            ) : (
              <button className="primary" onClick={handleStartObs}>
                ▶️ Start Server
              </button>
            )}
          </div>

          {obsRunning && (
            <>
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <input
                  type="text"
                  value={obsUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    border: '1px solid #505050',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button className="primary" onClick={handleCopyObsUrl}>
                  📋 Copy URL
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#00ff00' }}>
                ✅ Server running • Ready for OBS
              </div>

              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={muteInApp}
                    onChange={handleMuteInAppToggle}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>🔇 Mute TTS in app when OBS is running</span>
                </label>
                <div style={{ fontSize: '12px', color: '#808080', marginTop: '5px', marginLeft: '30px' }}>
                  When enabled, audio plays only in OBS overlay (prevents echo)
                </div>
              </div>
            </>
          )}
        </div>

        <details style={{ marginTop: '15px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '14px', marginBottom: '10px' }}>
            📖 How to add to OBS
          </summary>
          <ol style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Click "Start Server" above</li>
            <li>Copy the URL</li>
            <li>In OBS, add a new "Browser" source</li>
            <li>Paste the URL</li>
            <li>Set Width: 1920, Height: 1080</li>
            <li>Check "Shutdown source when not visible" for performance</li>
            <li>Click OK</li>
          </ol>
        </details>
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
    </>
  );

  const renderRulesTab = () => (
    <div className="card">
      <h3>TTS Rules</h3>
      <p style={{ color: '#888' }}>Coming soon...</p>
    </div>
  );

  const renderAccessTab = () => (
    <div className="card">
      <h3>TTS Access Control</h3>
      <p style={{ color: '#888' }}>Coming soon...</p>
    </div>
  );

  const renderVoiceSettingsTab = () => (
    <div className="card">
      <h3>Viewer Voice Settings</h3>
      <p style={{ color: '#888' }}>Coming soon...</p>
    </div>
  );

  const renderRestrictionsTab = () => (
    <div className="card">
      <h3>Viewer TTS Restrictions</h3>
      <p style={{ color: '#888' }}>Coming soon...</p>
    </div>
  );

  return (
    <div className="page">
      <h2>Text-to-Speech</h2>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #404040',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveTab('main')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'main' ? '#9147ff' : 'transparent',
            color: activeTab === 'main' ? 'white' : '#888',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'main' ? 'bold' : 'normal'
          }}
        >
          Main
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'rules' ? '#9147ff' : 'transparent',
            color: activeTab === 'rules' ? 'white' : '#888',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'rules' ? 'bold' : 'normal'
          }}
        >
          TTS Rules
        </button>
        <button
          onClick={() => setActiveTab('access')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'access' ? '#9147ff' : 'transparent',
            color: activeTab === 'access' ? 'white' : '#888',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'access' ? 'bold' : 'normal'
          }}
        >
          TTS Access
        </button>
        <button
          onClick={() => setActiveTab('voice-settings')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'voice-settings' ? '#9147ff' : 'transparent',
            color: activeTab === 'voice-settings' ? 'white' : '#888',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'voice-settings' ? 'bold' : 'normal'
          }}
        >
          Voice Settings
        </button>
        <button
          onClick={() => setActiveTab('restrictions')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'restrictions' ? '#9147ff' : 'transparent',
            color: activeTab === 'restrictions' ? 'white' : '#888',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'restrictions' ? 'bold' : 'normal'
          }}
        >
          Restrictions
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default TTS;
