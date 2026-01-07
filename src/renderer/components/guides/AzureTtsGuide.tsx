import React from 'react';

interface AzureTtsGuideProps {
  onClose: () => void;
}

const AzureTtsGuide: React.FC<AzureTtsGuideProps> = ({ onClose }) => {
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
          <h2 style={{ margin: 0 }}>☁️ Azure Cognitive Services Setup Guide</h2>
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
          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 1: Create Azure Account</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to <a href="https://azure.microsoft.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9147ff' }}>azure.microsoft.com</a></li>
            <li>Click "Start free" or "Create account"</li>
            <li>Follow the registration process (requires credit card)</li>
            <li>New accounts get $200 free credit for 30 days</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 2: Create Speech Service Resource</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Log in to the <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9147ff' }}>Azure Portal</a></li>
            <li>Click "Create a resource" (+ icon in top left)</li>
            <li>Search for "Speech" and select "Speech"</li>
            <li>Click "Create"</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 3: Configure Resource</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li><strong>Subscription:</strong> Select your subscription</li>
            <li><strong>Resource group:</strong> Create new or select existing (e.g., "stream-yap-yap-rg")</li>
            <li><strong>Region:</strong> Choose region closest to you (e.g., "East US")</li>
            <li><strong>Name:</strong> Give it a unique name (e.g., "stream-yap-yap-speech")</li>
            <li><strong>Pricing tier:</strong> Select "Free F0" (500,000 characters/month free) or "Standard S0" for production</li>
            <li>Click "Review + create" then "Create"</li>
            <li>Wait for deployment to complete (1-2 minutes)</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 4: Get Keys and Region</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Click "Go to resource" after deployment completes</li>
            <li>In the left menu, click "Keys and Endpoint"</li>
            <li>You'll see two keys (KEY 1 and KEY 2) - copy either one</li>
            <li>Note the "Location/Region" value (e.g., "eastus")</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 5: Configure in Stream Yap Yap</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Paste your Subscription Key into the "Subscription Key" field</li>
            <li>Select your region from the dropdown (must match the resource region)</li>
            <li>Click "Save Configuration"</li>
            <li>Click "Test Connection" to verify it works</li>
            <li>Enable Azure TTS with the toggle</li>
            <li>Click "Scan for Voices" to discover available voices</li>
          </ol>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #9147ff'
          }}>
            <h4 style={{ marginTop: 0, color: '#9147ff' }}>💰 Pricing Information</h4>
            <p style={{ margin: '10px 0' }}>
              Azure Speech Service pricing (as of 2024):
            </p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
              <li><strong>Free tier (F0) - Standard voices:</strong> 5 million characters per month</li>
              <li><strong>Free tier (F0) - Neural voices:</strong> 500,000 characters per month</li>
              <li><strong>Standard tier (S0) - Standard voices:</strong> $1.00 per 1 million characters</li>
              <li><strong>Standard tier (S0) - Neural voices:</strong> $16.00 per 1 million characters</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#aaa', margin: '10px 0' }}>
              The free tier gives you 5 million standard characters or 500,000 neural characters monthly - enough for most streamers!
            </p>
          </div>

          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #ff9900'
          }}>
            <h4 style={{ marginTop: 0, color: '#ff9900' }}>⚠️ Important Notes</h4>
            <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
              <li>Keep your Subscription Key secret - never share it publicly</li>
              <li>The region in Stream Yap Yap MUST match your Azure resource region</li>
              <li>Free tier has monthly limits - consider upgrading for heavy usage</li>
              <li>You can regenerate keys anytime in the Azure Portal if compromised</li>
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

export default AzureTtsGuide;
