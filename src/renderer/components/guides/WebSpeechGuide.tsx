import React from 'react';

interface WebSpeechGuideProps {
  onClose: () => void;
}

const WebSpeechGuide: React.FC<WebSpeechGuideProps> = ({ onClose }) => {
  // Detect OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

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
          <h2 style={{ margin: 0 }}>🌐 WebSpeech Setup Guide</h2>
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
          <div style={{
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #4CAF50'
          }}>
            <h4 style={{ marginTop: 0, color: '#4CAF50' }}>✅ What is WebSpeech?</h4>
            <p style={{ margin: 0 }}>
              WebSpeech uses the text-to-speech voices built into your operating system. It's completely free, requires no API keys,
              and works offline. However, the voice quality and selection varies significantly between operating systems.
            </p>
          </div>

          {isMac && (
            <>
              <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>🍎 macOS Voice Setup</h3>
              
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, color: '#9147ff' }}>📌 Quick Facts</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>macOS includes dozens of high-quality voices</li>
                  <li>Voices must be downloaded separately</li>
                  <li>Most voices are free, some premium voices available</li>
                  <li>Supports 40+ languages</li>
                </ul>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Enable Additional Voices</h4>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Open <strong>System Settings</strong> (or System Preferences on older macOS)</li>
                <li>Click <strong>Accessibility</strong></li>
                <li>Click <strong>Spoken Content</strong> in the sidebar</li>
                <li>Click the <strong>System Voice</strong> dropdown</li>
                <li>Click <strong>Manage Voices...</strong></li>
                <li>Browse available voices and click the download icon (⬇️) to install them</li>
                <li>Wait for voices to download (can take a few minutes per voice)</li>
                <li>Close System Settings</li>
                <li>Return to Stream Yap Yap and click <strong>"Scan for Voices"</strong></li>
              </ol>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, color: '#ff9800' }}>💡 Recommended Voices for macOS</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Samantha (Enhanced)</strong> - High-quality female US English</li>
                  <li><strong>Alex</strong> - Default male US English</li>
                  <li><strong>Daniel (Premium)</strong> - Very natural British English</li>
                  <li><strong>Karen (Enhanced)</strong> - Natural Australian English</li>
                  <li><strong>Moira (Premium)</strong> - Irish English</li>
                  <li><strong>Veena (Premium)</strong> - Indian English</li>
                </ul>
                <p style={{ marginTop: '10px', marginBottom: 0, fontSize: '13px', color: '#888' }}>
                  Premium voices offer significantly better quality but may cost $0.99-$1.99 each
                </p>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '1px solid #2196F3'
              }}>
                <h4 style={{ marginTop: 0, color: '#2196F3' }}>🔧 Troubleshooting</h4>
                <p style={{ marginBottom: '10px' }}><strong>Voices not appearing after download?</strong></p>
                <ol style={{ paddingLeft: '20px', marginBottom: '10px' }}>
                  <li>Restart Stream Yap Yap completely</li>
                  <li>Click "Scan for Voices" again</li>
                  <li>If still not working, try restarting your Mac</li>
                </ol>
                <p style={{ marginBottom: '10px' }}><strong>Voice sounds robotic?</strong></p>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li>Make sure you downloaded the "Enhanced" or "Premium" version</li>
                  <li>Default/Compact voices are lower quality</li>
                </ul>
              </div>
            </>
          )}

          {isWindows && (
            <>
              <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>🪟 Windows Voice Setup</h3>
              
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '1px solid #ff9800'
              }}>
                <h4 style={{ marginTop: 0, color: '#ff9800' }}>⚠️ Important: Windows 11 Default</h4>
                <p style={{ margin: 0 }}>
                  Windows 11 ships with only ONE voice enabled by default (usually "Microsoft David" or "Microsoft Zira").
                  You must manually add additional voices to get more variety!
                </p>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 1: Add Text-to-Speech Voices</h4>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Open <strong>Settings</strong> (Windows + I)</li>
                <li>Click <strong>Time & Language</strong></li>
                <li>Click <strong>Speech</strong> in the sidebar</li>
                <li>Scroll down to <strong>"Manage voices"</strong></li>
                <li>Click <strong>"Add voices"</strong></li>
                <li>Browse and select the voices you want (free to download)</li>
                <li>Wait for voices to download (shows progress in Settings)</li>
              </ol>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, color: '#9147ff' }}>📌 Alternative Method (Windows 10/11)</h4>
                <ol style={{ paddingLeft: '20px', marginBottom: 0 }}>
                  <li>Open <strong>Settings</strong></li>
                  <li>Click <strong>Time & Language</strong></li>
                  <li>Click <strong>Language & region</strong></li>
                  <li>Click <strong>"Add a language"</strong></li>
                  <li>Add languages you want voices for (e.g., Spanish, French, German)</li>
                  <li>After adding a language, click on it</li>
                  <li>Click <strong>"Options"</strong></li>
                  <li>Download the <strong>"Speech"</strong> pack</li>
                  <li>This will add natural-sounding voices for that language</li>
                </ol>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Step 2: Scan for Voices</h4>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Return to Stream Yap Yap</li>
                <li>Make sure WebSpeech is enabled</li>
                <li>Click <strong>"Scan for Voices"</strong></li>
                <li>All downloaded voices should now appear</li>
              </ol>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, color: '#ff9800' }}>💡 Recommended Voices for Windows</h4>
                <p style={{ marginBottom: '10px' }}><strong>English Voices:</strong></p>
                <ul style={{ marginBottom: '10px', paddingLeft: '20px' }}>
                  <li><strong>Microsoft David</strong> - Male US English (default)</li>
                  <li><strong>Microsoft Zira</strong> - Female US English (default)</li>
                  <li><strong>Microsoft Mark</strong> - Male US English (higher quality)</li>
                  <li><strong>Microsoft Aria</strong> - Female US English (natural)</li>
                </ul>
                <p style={{ marginBottom: '10px' }}><strong>Natural Voices (Windows 11 only):</strong></p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Microsoft Jenny</strong> - Natural female voice</li>
                  <li><strong>Microsoft Guy</strong> - Natural male voice</li>
                  <li><strong>Microsoft Ana</strong> - Spanish (natural)</li>
                  <li><strong>Microsoft Connor</strong> - Irish English (natural)</li>
                </ul>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '1px solid #2196F3'
              }}>
                <h4 style={{ marginTop: 0, color: '#2196F3' }}>🔧 Troubleshooting</h4>
                <p style={{ marginBottom: '10px' }}><strong>Only seeing 1-2 voices?</strong></p>
                <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
                  <li>You need to manually add more voices (see Step 1 above)</li>
                  <li>Windows 11 only enables 1 voice by default</li>
                  <li>Adding language packs gives you more natural voices</li>
                </ul>
                <p style={{ marginBottom: '10px' }}><strong>Voice sounds robotic or choppy?</strong></p>
                <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
                  <li>Try the "Natural" voices (Jenny, Guy, Ana, Connor)</li>
                  <li>Available in Windows 11 or Windows 10 with updates</li>
                  <li>Much better quality than legacy voices</li>
                </ul>
                <p style={{ marginBottom: '10px' }}><strong>Downloaded voices not showing up?</strong></p>
                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                  <li>Make sure the voice download completed in Settings</li>
                  <li>Restart Stream Yap Yap completely</li>
                  <li>Click "Scan for Voices" again</li>
                  <li>If still not working, restart Windows</li>
                </ol>
              </div>
            </>
          )}

          {!isMac && !isWindows && (
            <>
              <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>🐧 Linux Voice Setup</h3>
              
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, color: '#9147ff' }}>📌 Quick Facts</h4>
                <p style={{ margin: 0 }}>
                  Linux voice support depends on your speech engine (espeak, festival, or speech-dispatcher).
                  Voice quality and selection varies significantly by distribution.
                </p>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>Install Speech Engines</h4>
              <p style={{ marginBottom: '10px' }}>For Ubuntu/Debian:</p>
              <pre style={{
                backgroundColor: '#000',
                padding: '15px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '13px'
              }}>
{`sudo apt-get install espeak espeak-ng
sudo apt-get install speech-dispatcher
sudo apt-get install festival festvox-kallpc16k`}
              </pre>

              <p style={{ marginTop: '15px', marginBottom: '10px' }}>For Fedora/RHEL:</p>
              <pre style={{
                backgroundColor: '#000',
                padding: '15px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '13px'
              }}>
{`sudo dnf install espeak-ng
sudo dnf install speech-dispatcher
sudo dnf install festival festival-voice`}
              </pre>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '1px solid #ff9800'
              }}>
                <h4 style={{ marginTop: 0, color: '#ff9800' }}>⚠️ Limited Voice Quality</h4>
                <p style={{ margin: 0 }}>
                  Linux WebSpeech voices are generally lower quality than Mac/Windows. For better quality TTS,
                  consider using AWS Polly, Google Cloud TTS, or Azure TTS instead.
                </p>
              </div>
            </>
          )}

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #4CAF50'
          }}>
            <h4 style={{ marginTop: 0, color: '#4CAF50' }}>✅ Advantages of WebSpeech</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>✓ Completely free - no API costs</li>
              <li>✓ No configuration or API keys needed</li>
              <li>✓ Works offline</li>
              <li>✓ No rate limits or usage quotas</li>
              <li>✓ Privacy - all processing happens locally</li>
              <li>✓ Instant setup (if voices already installed)</li>
            </ul>
          </div>

          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #ff5252'
          }}>
            <h4 style={{ marginTop: 0, color: '#ff5252' }}>❌ Limitations of WebSpeech</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>✗ Voice quality varies by OS (Mac {'>'} Windows {'>'} Linux)</li>
              <li>✗ Limited voice selection (especially on Windows)</li>
              <li>✗ Voices must be manually installed/enabled</li>
              <li>✗ No neural/high-quality voices (except some Mac premium voices)</li>
              <li>✗ Different voices available on different computers</li>
              <li>✗ No customization options (pitch/speed only)</li>
            </ul>
          </div>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #9147ff'
          }}>
            <h4 style={{ marginTop: 0, color: '#9147ff' }}>🚀 Next Steps</h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Install/enable voices using the instructions above for your OS</li>
              <li>Make sure WebSpeech is enabled in Stream Yap Yap</li>
              <li>Click "Scan for Voices" to detect all available voices</li>
              <li>Test voices in the "Voice Preview" section</li>
              <li>Consider upgrading to AWS, Azure, or Google for higher quality</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSpeechGuide;
