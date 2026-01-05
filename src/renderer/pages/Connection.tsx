import React, { useState, useEffect } from 'react';

const Connection: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [autoConnect, setAutoConnect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load settings on mount
    loadSettings();
    
    // Check current connection status
    checkConnectionStatus();
    
    // Listen for connection status changes
    const unsubscribe = window.api.on('twitch:connectionStatus', (data: { connected: boolean; error?: string }) => {
      setConnected(data.connected);
      if (data.error) {
        setError(data.error);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const storedUsername = await window.api.invoke('db:getSetting', 'twitch_username');
      const storedAutoConnect = await window.api.invoke('db:getSetting', 'auto_connect');
      
      if (storedUsername) setUsername(storedUsername);
      if (storedAutoConnect) setAutoConnect(storedAutoConnect === 'true');
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const isConnected = await window.api.invoke('twitch:isConnected');
      setConnected(isConnected);
    } catch (err) {
      console.error('Failed to check connection status:', err);
    }
  };

  const handleConnect = async () => {
    if (!username.trim() || !token.trim()) {
      setError('Username and token are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.api.invoke('twitch:connect', username.trim(), token.trim());
      
      if (result.success) {
        setConnected(true);
        setToken(''); // Clear token from UI for security
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    
    try {
      await window.api.invoke('twitch:disconnect');
      setConnected(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgetCredentials = async () => {
    if (!confirm('Are you sure you want to forget your Twitch credentials?')) {
      return;
    }

    setLoading(true);
    
    try {
      await window.api.invoke('twitch:forgetCredentials');
      setConnected(false);
      setUsername('');
      setToken('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConnectChange = async (checked: boolean) => {
    setAutoConnect(checked);
    try {
      await window.api.invoke('db:setSetting', 'auto_connect', checked ? 'true' : 'false');
    } catch (err) {
      console.error('Failed to save auto-connect setting:', err);
    }
  };

  return (
    <div className="page">
      <h2>Connection</h2>
      
      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
            <strong>Status:</strong>&nbsp;
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          
          {username && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Username:</strong> {username}
            </div>
          )}
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#ff000022', 
            border: '1px solid #ff0000', 
            borderRadius: '6px',
            marginBottom: '20px',
            color: '#ff6b6b'
          }}>
            {error}
          </div>
        )}

        {!connected ? (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Twitch Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                OAuth Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="oauth:your_token_here"
                disabled={loading}
              />
              <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                Get your token from{' '}
                <a 
                  href="https://twitchapps.com/tmi/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#9147ff' }}
                >
                  twitchapps.com/tmi
                </a>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoConnect}
                  onChange={(e) => handleAutoConnectChange(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>Auto-connect on startup</span>
              </label>
            </div>

            <button 
              className="primary" 
              onClick={handleConnect}
              disabled={loading || !username.trim() || !token.trim()}
            >
              {loading ? 'Connecting...' : 'Connect to Twitch'}
            </button>
          </div>
        ) : (
          <div>
            <button 
              className="secondary" 
              onClick={handleDisconnect}
              disabled={loading}
              style={{ marginRight: '10px' }}
            >
              Disconnect
            </button>
            
            <button 
              className="secondary" 
              onClick={handleForgetCredentials}
              disabled={loading}
            >
              Forget Credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connection;
