import React from 'react';

interface GoogleTtsGuideProps {
  onClose: () => void;
}

const GoogleTtsGuide: React.FC<GoogleTtsGuideProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '2px solid #505050'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🎙️ Google Cloud TTS Setup Guide</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 10px'
          }}>×</button>
        </div>

        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#ddd' }}>
          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 1: Create Google Cloud Account</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to <a href="https://cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9147ff' }}>cloud.google.com</a></li>
            <li>Click "Get started for free"</li>
            <li>Sign in with your Google account</li>
            <li>Complete the billing setup (requires credit card)</li>
            <li>New accounts get $300 free credit for 90 days</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 2: Create Project</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9147ff' }}>Google Cloud Console</a></li>
            <li>Click the project dropdown at the top (next to "Google Cloud")</li>
            <li>Click "NEW PROJECT"</li>
            <li>Enter project name (e.g., "stream-yap-yap")</li>
            <li>Click "CREATE"</li>
            <li>Select your new project from the dropdown</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 3: Enable Text-to-Speech API</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>In the search bar at the top, type "Text-to-Speech API"</li>
            <li>Click on "Cloud Text-to-Speech API"</li>
            <li>Click "ENABLE"</li>
            <li>Wait for the API to be enabled (1-2 minutes)</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 4: Create Service Account</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>In the left menu, go to "IAM & Admin" → "Service Accounts"</li>
            <li>Click "CREATE SERVICE ACCOUNT"</li>
            <li>Enter name (e.g., "stream-yap-yap-tts")</li>
            <li>Enter description (e.g., "TTS service for Stream Yap Yap")</li>
            <li>Click "CREATE AND CONTINUE"</li>
            <li>For role, select "Cloud Text-to-Speech User"</li>
            <li>Click "CONTINUE" then "DONE"</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 5: Create and Download Key</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Find your service account in the list</li>
            <li>Click the three dots (⋮) on the right side</li>
            <li>Select "Manage keys"</li>
            <li>Click "ADD KEY" → "Create new key"</li>
            <li>Select "JSON" format</li>
            <li>Click "CREATE"</li>
            <li>A JSON file will download - <strong>save it securely!</strong></li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 6: Configure in Stream Yap Yap</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Open the downloaded JSON file in a text editor</li>
            <li>Copy the entire contents (it should start with {"{"}"type": "service_account"...)</li>
            <li>Paste it into the "Service Account JSON" field in Stream Yap Yap</li>
            <li>Click "Save Configuration"</li>
            <li>Click "Test Connection" to verify it works</li>
            <li>Enable Google Cloud TTS with the toggle</li>
            <li>Click "Scan for Voices" to discover available voices</li>
          </ol>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #ff9900'
          }}>
            <h4 style={{ marginTop: 0, color: '#ff9900' }}>💰 Premium Service - Pricing Information</h4>
            <p style={{ margin: '10px 0', fontSize: '14px', fontWeight: 'bold', color: '#ff9900' }}>
              ⚠️ Google Cloud TTS charges $10 per million characters after the free trial ends
            </p>
            <p style={{ margin: '10px 0', fontSize: '13px' }}>
              Detailed pricing breakdown:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0', fontSize: '13px' }}>
              <li><strong>Standard voices:</strong> $4.00 per 1 million characters</li>
              <li><strong>WaveNet voices:</strong> $16.00 per 1 million characters</li>
              <li><strong>Neural2 voices:</strong> $16.00 per 1 million characters</li>
              <li><strong>Free tier:</strong> 4 million characters per month (Standard only)</li>
              <li><strong>New accounts:</strong> $300 free credit for 90 days</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#ff9900', margin: '10px 0', fontWeight: 'bold' }}>
              💳 This is a premium paid service. Monitor your usage to avoid unexpected charges!
            </p>
            <p style={{ fontSize: '12px', color: '#aaa', margin: '10px 0' }}>
              Average stream chat message: 50-100 characters. 1 million characters ≈ 10,000-20,000 messages.
            </p>
          </div>

          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #ff9900'
          }}>
            <h4 style={{ marginTop: 0, color: '#ff9900' }}>⚠️ Important Security Notes</h4>
            <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
              <li><strong>Never share your service account JSON file!</strong> It contains full credentials</li>
              <li>If compromised, delete the key in Google Cloud Console and create a new one</li>
              <li>The JSON file should never be committed to source control</li>
              <li>Stream Yap Yap stores it securely in your local database</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '25px', textAlign: 'right' }}>
          <button className="primary" onClick={onClose} style={{ padding: '10px 20px' }}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleTtsGuide;
