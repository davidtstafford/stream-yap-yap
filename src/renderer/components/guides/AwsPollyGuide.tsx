import React from 'react';

interface AwsPollyGuideProps {
  onClose: () => void;
}

const AwsPollyGuide: React.FC<AwsPollyGuideProps> = ({ onClose }) => {
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
          <h2 style={{ margin: 0 }}>🔊 AWS Polly Setup Guide</h2>
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
          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 1: Create AWS Account</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to <a href="https://aws.amazon.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9147ff' }}>aws.amazon.com</a></li>
            <li>Click "Create an AWS Account"</li>
            <li>Follow the registration process (requires credit card)</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 2: Create IAM User</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Log in to AWS Console</li>
            <li>Search for "IAM" in the services search bar</li>
            <li>Click on "Users" in the left sidebar</li>
            <li>Click "Create user"</li>
            <li>Enter a username (e.g., "stream-yap-yap-tts")</li>
            <li>Click "Next"</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 3: Set Permissions</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Select "Attach policies directly"</li>
            <li>Search for "Polly" in the filter box</li>
            <li>Check the box next to "AmazonPollyReadOnlyAccess"</li>
            <li>Also check "AmazonPollySynthesizeSpeechPolicy" (or create custom policy with polly:SynthesizeSpeech permission)</li>
            <li>Click "Next" and then "Create user"</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 4: Create Access Keys</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Click on the user you just created</li>
            <li>Go to "Security credentials" tab</li>
            <li>Scroll down to "Access keys" section</li>
            <li>Click "Create access key"</li>
            <li>Select "Application running outside AWS"</li>
            <li>Click "Next" and then "Create access key"</li>
            <li><strong>Important:</strong> Copy both the <strong>Access Key ID</strong> and <strong>Secret Access Key</strong></li>
            <li>Store them securely - you won't be able to see the secret key again!</li>
          </ol>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 5: Configure in Stream Yap Yap</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Paste your Access Key ID into the "Access Key ID" field</li>
            <li>Paste your Secret Access Key into the "Secret Access Key" field</li>
            <li>Select your preferred region (closest to you for best performance)</li>
            <li>Select "Neural" engine for best quality voices</li>
            <li>Click "Save Configuration"</li>
            <li>Click "Test Connection" to verify it works</li>
            <li>Enable AWS Polly with the toggle</li>
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
              AWS Polly pricing (as of 2024):
            </p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
              <li><strong>Standard voices:</strong> $4.00 per 1 million characters</li>
              <li><strong>Neural voices:</strong> $16.00 per 1 million characters</li>
              <li><strong>Free tier:</strong> 5 million characters per month for first 12 months</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#aaa', margin: '10px 0' }}>
              Example: A typical chat message is ~50 characters. With neural voices, you can synthesize about 62,500 messages per dollar.
            </p>
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

export default AwsPollyGuide;
