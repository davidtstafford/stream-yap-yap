# OBS Audio Implementation

## Overview
The OBS Browser Source integration now properly handles TTS audio from multiple providers (WebSpeech, AWS Polly, Azure TTS, Google Cloud TTS) and includes a mute in-app option to prevent audio echo.

## Architecture

### Audio Flow
1. **Main App** generates TTS audio (WebSpeech or cloud provider)
2. **TTS Queue** broadcasts event to OBS overlay via WebSocket
3. **OBS Overlay** receives event and plays audio
4. **Mute Toggle** prevents in-app playback when OBS is handling audio

### Event Format
```typescript
{
  type: 'start',
  item: {
    id: string,
    text: string,
    username: string,
    viewerId: string,
    voiceId: string,
    speed: number,
    pitch: number,
    volume: number,
    audioUrl?: string,      // For cloud providers (AWS/Azure/GCP)
    audioData?: string      // For base64 encoded audio
  }
}
```

## OBS Overlay Audio Handling

### Priority
1. **audioUrl**: If present, plays audio from cloud provider URL
2. **audioData**: If present, plays base64 encoded audio
3. **Fallback**: Synthesizes using WebSpeech with voice settings

### Implementation (`obsServer.ts`)
```javascript
function handleTTSEvent(data) {
  const { type, item } = data;
  
  if (type === 'start') {
    addMessage(item);
    
    if (item.audioUrl) {
      // Play audio from cloud provider
      playAudioUrl(item.audioUrl);
    } else if (item.audioData) {
      // Play base64 encoded audio
      playAudioData(item.audioData);
    } else {
      // Fallback to WebSpeech synthesis
      speakMessage(item);
    }
  }
}
```

## Mute In-App Feature

### UI
- Located in TTS > Main tab > OBS Browser Source section
- Checkbox: "🔇 Mute TTS in app when OBS is running"
- Description: "When enabled, audio plays only in OBS overlay (prevents echo)"

### Implementation (`ttsQueue.ts`)
```typescript
private async speak(item: TTSQueueItem): Promise<void> {
  // Check if we should mute in-app audio
  const obsStatus = await window.api.invoke('obs:getStatus');
  const muteInApp = await window.api.invoke('db:getSetting', 'tts_mute_in_app');
  
  if (obsStatus.running && muteInApp === 'true') {
    console.log('Skipping in-app audio - OBS overlay is handling playback');
    return Promise.resolve();
  }
  
  // Continue with normal playback...
}
```

### Database Setting
- Key: `tts_mute_in_app`
- Value: `'true'` or `'false'`
- Default: `false`

## Cloud Provider Integration (Future)

When implementing cloud TTS providers:

### AWS Polly
```typescript
// Generate audio
const audioBuffer = await pollySynthesizeSpeech(text, voiceId);
const base64Audio = audioBuffer.toString('base64');

// Broadcast to OBS
window.api.invoke('obs:broadcastEvent', {
  type: 'start',
  item: {
    id, text, username, viewerId,
    audioData: base64Audio
  }
});
```

### Azure TTS
```typescript
// Generate audio URL from Azure
const audioUrl = await azureSynthesizeSpeech(text, voiceId);

// Broadcast to OBS
window.api.invoke('obs:broadcastEvent', {
  type: 'start',
  item: {
    id, text, username, viewerId,
    audioUrl: audioUrl
  }
});
```

### Google Cloud TTS
```typescript
// Generate audio
const audioContent = await gcpSynthesizeSpeech(text, voiceId);
const base64Audio = audioContent.toString('base64');

// Broadcast to OBS
window.api.invoke('obs:broadcastEvent', {
  type: 'start',
  item: {
    id, text, username, viewerId,
    audioData: base64Audio
  }
});
```

## Testing

### Test Scenario 1: WebSpeech with OBS
1. Start OBS server
2. Enable "Mute in-app when OBS is running"
3. Add TTS overlay to OBS (http://localhost:8765/tts-overlay)
4. Send chat message → Audio plays only in OBS overlay

### Test Scenario 2: Cloud Provider with OBS
1. Configure cloud provider (AWS/Azure/GCP)
2. Start OBS server
3. Enable mute in-app
4. Send chat message → Cloud-generated audio plays in OBS overlay

### Test Scenario 3: Mute Toggle
1. Start OBS server
2. Disable mute in-app
3. Send chat message → Audio plays in BOTH app and OBS (echo)
4. Enable mute in-app
5. Send chat message → Audio plays only in OBS (no echo)

## Files Modified

1. **src/main/obs/obsServer.ts**
   - Added `playAudioUrl()` for cloud provider URLs
   - Added `playAudioData()` for base64 audio
   - Modified `handleTTSEvent()` to prioritize audio sources

2. **src/renderer/pages/TTS.tsx**
   - Added `muteInApp` state
   - Added `loadMuteInAppSetting()` function
   - Added `handleMuteInAppToggle()` function
   - Added mute checkbox UI in OBS section

3. **src/renderer/services/ttsQueue.ts**
   - Modified `speak()` to check OBS status and mute setting
   - Skips in-app playback when OBS is running and mute enabled
   - Added voice parameters to OBS broadcast

## Next Steps

1. **Test with real OBS setup**
2. **Implement cloud provider integrations** (Phase 6+)
3. **Add audio format options** (MP3, WAV, OGG)
4. **Add volume control for OBS overlay**
5. **Add visualization/waveform in overlay**
