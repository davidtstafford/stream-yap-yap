import React, { useState, useEffect } from 'react';
import { getWebSpeechService, WebSpeechVoice } from '../services/webSpeechService';
import { getTTSQueue, TTSQueueItem } from '../services/ttsQueue';
import AwsPollyGuide from '../components/guides/AwsPollyGuide';
import AzureTtsGuide from '../components/guides/AzureTtsGuide';
import GoogleTtsGuide from '../components/guides/GoogleTtsGuide';

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

  // Provider states
  const [webspeechEnabled, setWebspeechEnabled] = useState(true);
  const [awsEnabled, setAwsEnabled] = useState(false);
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsEngine, setAwsEngine] = useState('neural');
  const [awsTestResult, setAwsTestResult] = useState<string | null>(null);
  const [awsDisableNeural, setAwsDisableNeural] = useState(false);
  const [azureEnabled, setAzureEnabled] = useState(false);
  const [azureSubscriptionKey, setAzureSubscriptionKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastus');
  const [azureTestResult, setAzureTestResult] = useState<string | null>(null);
  const [azureDisableNeural, setAzureDisableNeural] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleServiceAccountJson, setGoogleServiceAccountJson] = useState('');
  const [googleTestResult, setGoogleTestResult] = useState<string | null>(null);

  // Voice filtering
  const [voiceFilterProvider, setVoiceFilterProvider] = useState<string>('all');
  const [voiceFilterLanguage, setVoiceFilterLanguage] = useState<string>('all');
  const [voiceFilterGender, setVoiceFilterGender] = useState<string>('all');
  const [voiceSearchText, setVoiceSearchText] = useState('');

  // Setup guides
  const [showAwsGuide, setShowAwsGuide] = useState(false);
  const [showAzureGuide, setShowAzureGuide] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  // TTS Rules state
  const [filterCommands, setFilterCommands] = useState(true);
  const [filterUrls, setFilterUrls] = useState(true);
  const [filterBots, setFilterBots] = useState(true);
  const [botList, setBotList] = useState('Nightbot,StreamElements,Streamlabs,Moobot,Fossabot,Wizebot');
  const [announceUsername, setAnnounceUsername] = useState(true);
  const [usernameStyle, setUsernameStyle] = useState('says');
  const [minLength, setMinLength] = useState(1);
  const [maxLength, setMaxLength] = useState(500);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [duplicateWindow, setDuplicateWindow] = useState(60);
  const [userCooldown, setUserCooldown] = useState(false);
  const [userCooldownSeconds, setUserCooldownSeconds] = useState(30);
  const [globalCooldown, setGlobalCooldown] = useState(false);
  const [globalCooldownSeconds, setGlobalCooldownSeconds] = useState(5);
  const [limitEmotes, setLimitEmotes] = useState(false);
  const [maxEmotes, setMaxEmotes] = useState(5);
  const [limitEmojis, setLimitEmojis] = useState(false);
  const [maxEmojis, setMaxEmojis] = useState(5);
  const [limitRepeatedChars, setLimitRepeatedChars] = useState(false);
  const [maxRepeatedChars, setMaxRepeatedChars] = useState(3);
  const [limitLongNumbers, setLimitLongNumbers] = useState(false);
  const [maxNumberLength, setMaxNumberLength] = useState(6);
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [blockedWordReplacement, setBlockedWordReplacement] = useState('[censored]');

  // TTS Access state
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [allowSubscribers, setAllowSubscribers] = useState(false);
  const [allowVIPs, setAllowVIPs] = useState(false);
  const [allowModerators, setAllowModerators] = useState(false);
  const [allowRedeems, setAllowRedeems] = useState(false);
  const [redeemName, setRedeemName] = useState('Give Me TTS');
  const [redeemDuration, setRedeemDuration] = useState(30);
  const [activeRedeems, setActiveRedeems] = useState<any[]>([]);

  // Restrictions state
  const [restrictionSearch, setRestrictionSearch] = useState('');
  const [restrictionType, setRestrictionType] = useState<'mute' | 'cooldown'>('mute');
  const [muteDuration, setMuteDuration] = useState(30);
  const [cooldownGap, setCooldownGap] = useState(30);
  const [cooldownDuration, setCooldownDuration] = useState(0);
  const [mutedViewers, setMutedViewers] = useState<any[]>([]);
  const [cooldownViewers, setCooldownViewers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Voice Settings state
  const [voiceSettingsSearch, setVoiceSettingsSearch] = useState('');
  const [voiceSearchResults, setVoiceSearchResults] = useState<any[]>([]);
  const [selectedViewer, setSelectedViewer] = useState<any | null>(null);
  const [viewerVoicePreferences, setViewerVoicePreferences] = useState<any[]>([]);
  const [selectedViewerVoice, setSelectedViewerVoice] = useState('');
  const [viewerPitch, setViewerPitch] = useState(1.0);
  const [viewerSpeed, setViewerSpeed] = useState(1.0);
  const [viewerVolume, setViewerVolume] = useState(1.0);

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
    
    // Load TTS rules
    loadTTSRules();
    
    // Load TTS Access settings
    loadAccessSettings();
    
    // Load restrictions
    loadRestrictions();

    // Load viewer voice preferences
    loadViewerVoicePreferences();

    // Poll for restrictions updates every 30 seconds
    const restrictionsInterval = setInterval(() => {
      loadRestrictions();
    }, 30000);
    
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

    return () => {
      clearInterval(restrictionsInterval);
    };
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

      // Load provider settings
      const wsEnabled = await window.api.invoke('db:getSetting', 'tts_webspeech_enabled');
      const awsEn = await window.api.invoke('db:getSetting', 'tts_aws_enabled');
      const awsKey = await window.api.invoke('db:getSetting', 'tts_aws_access_key');
      const awsSecret = await window.api.invoke('db:getSetting', 'tts_aws_secret_key');
      const awsReg = await window.api.invoke('db:getSetting', 'tts_aws_region');
      const awsEng = await window.api.invoke('db:getSetting', 'tts_aws_engine');
      const awsDisNeural = await window.api.invoke('db:getSetting', 'tts_aws_disable_neural');
      const azureEn = await window.api.invoke('db:getSetting', 'tts_azure_enabled');
      const azureSub = await window.api.invoke('db:getSetting', 'tts_azure_subscription_key');
      const azureReg = await window.api.invoke('db:getSetting', 'tts_azure_region');
      const azureDisNeural = await window.api.invoke('db:getSetting', 'tts_azure_disable_neural');
      const googleEn = await window.api.invoke('db:getSetting', 'tts_google_enabled');
      const googleJson = await window.api.invoke('db:getSetting', 'tts_google_service_account_json');
      const lastScan = await window.api.invoke('db:getSetting', 'tts_voices_last_scanned');

      if (wsEnabled !== null) setWebspeechEnabled(wsEnabled === 'true');
      if (awsEn !== null) setAwsEnabled(awsEn === 'true');
      if (awsKey) setAwsAccessKey(awsKey);
      if (awsSecret) setAwsSecretKey(awsSecret);
      if (awsReg) setAwsRegion(awsReg);
      if (awsEng) setAwsEngine(awsEng);
      if (awsDisNeural !== null) setAwsDisableNeural(awsDisNeural === 'true');
      if (azureEn !== null) setAzureEnabled(azureEn === 'true');
      if (azureSub) setAzureSubscriptionKey(azureSub);
      if (azureReg) setAzureRegion(azureReg);
      if (azureDisNeural !== null) setAzureDisableNeural(azureDisNeural === 'true');
      if (googleEn !== null) setGoogleEnabled(googleEn === 'true');
      if (googleJson) setGoogleServiceAccountJson(googleJson);
      if (lastScan) setLastScanTime(new Date(lastScan).toLocaleString());
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
      // Cache WebSpeech voices first so backend can scan them
      const webspeechEnabled = await window.api.invoke('db:getSetting', 'tts_webspeech_enabled');
      if (webspeechEnabled === 'true') {
        const wsVoices = await webSpeechService.getVoices();
        await window.api.invoke('db:setSetting', 'webspeech_voices_cache', JSON.stringify(wsVoices));
      }
      
      // Call backend voice scanner that scans all enabled providers
      await window.api.invoke('tts:scanVoices');
      
      // Reload voices from database
      await loadVoices();
      
      // Update last scan time
      const lastScan = await window.api.invoke('db:getSetting', 'tts_voices_last_scanned');
      if (lastScan) {
        setLastScanTime(new Date(lastScan).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to scan voices:', err);
      alert('Failed to scan voices. Check console for details.');
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

  const handleTestVoice = async () => {
    const selectedVoiceObj = voices.find(v => v.voice_id === selectedVoice);
    const provider = selectedVoiceObj?.provider || 'webspeech';
    
    // For non-webspeech providers, use backend synthesis
    if (provider !== 'webspeech') {
      try {
        const result = await window.api.invoke('tts:synthesize', {
          text: testText,
          voiceId: selectedVoice,
          provider,
          speed,
          volume
        });
        
        if (result.success && result.audioData) {
          // Play the audio data
          const audio = new Audio(`data:audio/mp3;base64,${result.audioData}`);
          audio.volume = volume;
          await audio.play();
          console.log('TTS test completed via backend');
        } else {
          throw new Error(result.error || 'Failed to synthesize audio');
        }
      } catch (err) {
        console.error('TTS test failed:', err);
        alert(`TTS test failed: ${err}`);
      }
    } else {
      // Use local WebSpeech for webspeech provider
      ttsQueue.add({
        id: `test-${Date.now()}`,
        text: testText,
        voiceId: selectedVoice,
        provider: 'webspeech',
        speed,
        pitch,
        volume
      });
    }
  };

  // Provider configuration handlers
  const handleAwsConfigure = async () => {
    try {
      setAwsTestResult('⏳ Configuring...');
      await window.api.invoke('tts:aws:configure', {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        region: awsRegion,
        engine: awsEngine
      });
      setAwsTestResult(null);
      alert('AWS Polly configured successfully!');
    } catch (err) {
      setAwsTestResult(`❌ Configuration failed: ${err}`);
      console.error('Failed to configure AWS:', err);
    }
  };

  const handleAwsTestConnection = async () => {
    try {
      setAwsTestResult('⏳ Configuring and testing connection...');
      // Save configuration first
      await window.api.invoke('tts:aws:configure', {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        region: awsRegion,
        engine: awsEngine
      });
      // Then test the connection
      const result = await window.api.invoke('tts:aws:testConnection');
      if (result.success) {
        setAwsTestResult('✅ Connection successful!');
      } else {
        setAwsTestResult(`❌ Connection failed: ${result.error}`);
      }
    } catch (err) {
      setAwsTestResult(`❌ Connection failed: ${err}`);
      console.error('Failed to test AWS connection:', err);
    }
  };

  const handleAwsDisableNeuralToggle = async (enabled: boolean) => {
    try {
      setAwsDisableNeural(enabled);
      await window.api.invoke('db:setSetting', 'tts_aws_disable_neural', enabled ? 'true' : 'false');
      // Trigger rescan to update available voices
      if (awsEnabled) {
        await handleScanVoices();
      }
    } catch (err) {
      console.error('Failed to toggle AWS neural disable:', err);
    }
  };

  const handleAzureConfigure = async () => {
    try {
      setAzureTestResult('⏳ Configuring...');
      await window.api.invoke('tts:azure:configure', {
        subscriptionKey: azureSubscriptionKey,
        region: azureRegion
      });
      setAzureTestResult(null);
      alert('Azure TTS configured successfully!');
    } catch (err) {
      setAzureTestResult(`❌ Configuration failed: ${err}`);
      console.error('Failed to configure Azure:', err);
    }
  };

  const handleAzureTestConnection = async () => {
    try {
      setAzureTestResult('⏳ Configuring and testing connection...');
      // Save configuration first
      await window.api.invoke('tts:azure:configure', {
        subscriptionKey: azureSubscriptionKey,
        region: azureRegion
      });
      // Then test the connection
      const result = await window.api.invoke('tts:azure:testConnection');
      if (result.success) {
        setAzureTestResult('✅ Connection successful!');
      } else {
        setAzureTestResult(`❌ Connection failed: ${result.error}`);
      }
    } catch (err) {
      setAzureTestResult(`❌ Connection failed: ${err}`);
      console.error('Failed to test Azure connection:', err);
    }
  };

  const handleAzureDisableNeuralToggle = async (enabled: boolean) => {
    try {
      setAzureDisableNeural(enabled);
      await window.api.invoke('db:setSetting', 'tts_azure_disable_neural', enabled ? 'true' : 'false');
      // Trigger rescan to update available voices
      if (azureEnabled) {
        await handleScanVoices();
      }
    } catch (err) {
      console.error('Failed to toggle Azure neural disable:', err);
    }
  };

  const handleGoogleConfigure = async () => {
    try {
      setGoogleTestResult('⏳ Configuring...');
      await window.api.invoke('tts:google:configure', {
        serviceAccountJson: googleServiceAccountJson
      });
      setGoogleTestResult(null);
      alert('Google Cloud TTS configured successfully!');
    } catch (err) {
      setGoogleTestResult(`❌ Configuration failed: ${err}`);
      console.error('Failed to configure Google:', err);
    }
  };

  const handleGoogleTestConnection = async () => {
    try {
      setGoogleTestResult('⏳ Configuring and testing connection...');
      // Save configuration first
      await window.api.invoke('tts:google:configure', {
        serviceAccountJson: googleServiceAccountJson
      });
      // Then test the connection
      const result = await window.api.invoke('tts:google:testConnection');
      if (result.success) {
        setGoogleTestResult('✅ Connection successful!');
      } else {
        setGoogleTestResult(`❌ Connection failed: ${result.error}`);
      }
    } catch (err) {
      setGoogleTestResult(`❌ Connection failed: ${err}`);
      console.error('Failed to test Google connection:', err);
    }
  };

  const handleProviderToggle = async (provider: string, enabled: boolean) => {
    const settingKey = `tts_${provider}_enabled`;
    await saveSetting(settingKey, enabled.toString());
    
    switch(provider) {
      case 'webspeech':
        setWebspeechEnabled(enabled);
        break;
      case 'aws':
        setAwsEnabled(enabled);
        break;
      case 'azure':
        setAzureEnabled(enabled);
        break;
      case 'google':
        setGoogleEnabled(enabled);
        break;
    }
  };

  // Get filtered voices based on filters
  const getFilteredVoices = () => {
    let filtered = [...voices];

    // Filter by provider
    if (voiceFilterProvider !== 'all') {
      filtered = filtered.filter(v => v.provider === voiceFilterProvider);
    }

    // Filter by language
    if (voiceFilterLanguage !== 'all') {
      filtered = filtered.filter(v => v.language_name === voiceFilterLanguage);
    }

    // Filter by gender (if available)
    if (voiceFilterGender !== 'all') {
      filtered = filtered.filter(v => (v as any).gender === voiceFilterGender);
    }

    // Filter by search text
    if (voiceSearchText) {
      const searchLower = voiceSearchText.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchLower) ||
        v.voice_id.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Get unique languages from voices
  const getAvailableLanguages = () => {
    const languages = new Set(voices.map(v => v.language_name));
    return Array.from(languages).sort();
  };

  // Get unique genders from voices
  const getAvailableGenders = () => {
    const genders = new Set(voices.map(v => (v as any).gender).filter(Boolean));
    return Array.from(genders).sort();
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

  const loadTTSRules = async () => {
    try {
      const rules = await Promise.all([
        window.api.invoke('db:getSetting', 'tts_filter_commands'),
        window.api.invoke('db:getSetting', 'tts_filter_urls'),
        window.api.invoke('db:getSetting', 'tts_filter_bots'),
        window.api.invoke('db:getSetting', 'tts_bot_list'),
        window.api.invoke('db:getSetting', 'tts_announce_username'),
        window.api.invoke('db:getSetting', 'tts_username_style'),
        window.api.invoke('db:getSetting', 'tts_min_length'),
        window.api.invoke('db:getSetting', 'tts_max_length'),
        window.api.invoke('db:getSetting', 'tts_skip_duplicates'),
        window.api.invoke('db:getSetting', 'tts_duplicate_window'),
        window.api.invoke('db:getSetting', 'tts_user_cooldown'),
        window.api.invoke('db:getSetting', 'tts_user_cooldown_seconds'),
        window.api.invoke('db:getSetting', 'tts_global_cooldown'),
        window.api.invoke('db:getSetting', 'tts_global_cooldown_seconds'),
        window.api.invoke('db:getSetting', 'tts_limit_emotes'),
        window.api.invoke('db:getSetting', 'tts_max_emotes'),
        window.api.invoke('db:getSetting', 'tts_limit_emojis'),
        window.api.invoke('db:getSetting', 'tts_max_emojis'),
        window.api.invoke('db:getSetting', 'tts_limit_repeated_chars'),
        window.api.invoke('db:getSetting', 'tts_max_repeated_chars'),
        window.api.invoke('db:getSetting', 'tts_limit_long_numbers'),
        window.api.invoke('db:getSetting', 'tts_max_number_length'),
        window.api.invoke('db:getSetting', 'tts_blocked_words'),
        window.api.invoke('db:getSetting', 'tts_blocked_word_replacement')
      ]);

      if (rules[0]) setFilterCommands(rules[0] === 'true');
      if (rules[1]) setFilterUrls(rules[1] === 'true');
      if (rules[2]) setFilterBots(rules[2] === 'true');
      if (rules[3]) setBotList(rules[3]);
      if (rules[4]) setAnnounceUsername(rules[4] === 'true');
      if (rules[5]) setUsernameStyle(rules[5]);
      if (rules[6]) setMinLength(parseInt(rules[6]));
      if (rules[7]) setMaxLength(parseInt(rules[7]));
      if (rules[8]) setSkipDuplicates(rules[8] === 'true');
      if (rules[9]) setDuplicateWindow(parseInt(rules[9]));
      if (rules[10]) setUserCooldown(rules[10] === 'true');
      if (rules[11]) setUserCooldownSeconds(parseInt(rules[11]));
      if (rules[12]) setGlobalCooldown(rules[12] === 'true');
      if (rules[13]) setGlobalCooldownSeconds(parseInt(rules[13]));
      if (rules[14]) setLimitEmotes(rules[14] === 'true');
      if (rules[15]) setMaxEmotes(parseInt(rules[15]));
      if (rules[16]) setLimitEmojis(rules[16] === 'true');
      if (rules[17]) setMaxEmojis(parseInt(rules[17]));
      if (rules[18]) setLimitRepeatedChars(rules[18] === 'true');
      if (rules[19]) setMaxRepeatedChars(parseInt(rules[19]));
      if (rules[20]) setLimitLongNumbers(rules[20] === 'true');
      if (rules[21]) setMaxNumberLength(parseInt(rules[21]));
      if (rules[22]) setBlockedWords(rules[22] ? rules[22].split(',').filter((w: string) => w.trim()) : []);
      if (rules[23]) setBlockedWordReplacement(rules[23] || '[censored]');
    } catch (error) {
      console.error('Failed to load TTS rules:', error);
    }
  };

  const saveTTSRule = async (key: string, value: string | boolean | number) => {
    try {
      await window.api.invoke('db:setSetting', key, String(value));
    } catch (error) {
      console.error(`Failed to save TTS rule ${key}:`, error);
    }
  };

  const loadRestrictions = async () => {
    try {
      const [muted, cooldown] = await Promise.all([
        window.api.invoke('db:query',
          `SELECT r.*, v.username 
           FROM viewer_tts_restrictions r 
           JOIN viewers v ON r.viewer_id = v.id 
           WHERE r.is_muted = 1 
           ORDER BY r.muted_at DESC`,
          []
        ),
        window.api.invoke('db:query',
          `SELECT r.*, v.username 
           FROM viewer_tts_restrictions r 
           JOIN viewers v ON r.viewer_id = v.id 
           WHERE r.has_cooldown = 1 
           ORDER BY r.cooldown_set_at DESC`,
          []
        )
      ]);
      
      setMutedViewers(muted || []);
      setCooldownViewers(cooldown || []);
    } catch (error) {
      console.error('Failed to load restrictions:', error);
    }
  };

  const loadViewerVoicePreferences = async () => {
    try {
      const preferences = await window.api.invoke('db:query',
        `SELECT p.*, v.username, v.display_name 
         FROM viewer_voice_preferences p 
         JOIN viewers v ON p.viewer_id = v.id 
         ORDER BY v.username ASC`,
        []
      );
      setViewerVoicePreferences(preferences || []);
    } catch (error) {
      console.error('Failed to load viewer voice preferences:', error);
    }
  };

  const handleAddBlockedWord = () => {
    const word = newBlockedWord.trim().toLowerCase();
    if (word && !blockedWords.includes(word)) {
      const updated = [...blockedWords, word];
      setBlockedWords(updated);
      saveTTSRule('tts_blocked_words', updated.join(','));
      setNewBlockedWord('');
    }
  };

  const handleRemoveBlockedWord = (word: string) => {
    const updated = blockedWords.filter(w => w !== word);
    setBlockedWords(updated);
    saveTTSRule('tts_blocked_words', updated.join(','));
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

      {/* Provider Configuration */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>TTS Provider Configuration</h3>

        {/* WebSpeech */}
        <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>🌐 WebSpeech (Browser Built-in)</h4>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={webspeechEnabled}
                onChange={(e) => handleProviderToggle('webspeech', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span>{webspeechEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
            Free • No configuration required • Basic quality voices
          </p>
        </div>

        {/* AWS Polly */}
        <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>🔊 AWS Polly</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="secondary" 
                onClick={() => setShowAwsGuide(true)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                📖 Setup Guide
              </button>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={awsEnabled}
                  onChange={(e) => handleProviderToggle('aws', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>{awsEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              High-quality neural voices • Extensive language support
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              💰 Standard: $4/million chars • Neural: $16/million chars • Free tier: 5M chars/month for 12 months
            </p>
          </div>

          {awsEnabled && (
            <div style={{ paddingLeft: '10px', borderLeft: '2px solid #505050' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Access Key ID</label>
                <input
                  type="text"
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Secret Access Key</label>
                <input
                  type="password"
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Region</label>
                <select
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Engine</label>
                <select
                  value={awsEngine}
                  onChange={(e) => setAwsEngine(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                >
                  <option value="neural">Neural (High Quality)</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={awsDisableNeural}
                    onChange={(e) => handleAwsDisableNeuralToggle(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>Disable Neural Voices (Standard only - $4/M vs $16/M)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button className="primary" onClick={handleAwsConfigure} style={{ flex: 1, padding: '8px' }}>
                  Save Configuration
                </button>
                <button className="secondary" onClick={handleAwsTestConnection} style={{ flex: 1, padding: '8px' }}>
                  Test Connection
                </button>
              </div>
              {awsTestResult && (
                <div style={{ fontSize: '13px', padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
                  {awsTestResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Azure Cognitive Services */}
        <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>☁️ Azure Cognitive Services</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="secondary" 
                onClick={() => setShowAzureGuide(true)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                📖 Setup Guide
              </button>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={azureEnabled}
                  onChange={(e) => handleProviderToggle('azure', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>{azureEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              High-quality voices • Extensive language support
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              💰 Standard: $4/million chars (5M free/month) • Neural: $16/million chars (500K free/month)
            </p>
          </div>

          {azureEnabled && (
            <div style={{ paddingLeft: '10px', borderLeft: '2px solid #505050' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Subscription Key</label>
                <input
                  type="password"
                  value={azureSubscriptionKey}
                  onChange={(e) => setAzureSubscriptionKey(e.target.value)}
                  placeholder="Enter your Azure subscription key"
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Region</label>
                <select
                  value={azureRegion}
                  onChange={(e) => setAzureRegion(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                >
                  <option value="eastus">East US</option>
                  <option value="westus">West US</option>
                  <option value="westeurope">West Europe</option>
                  <option value="southeastasia">Southeast Asia</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={azureDisableNeural}
                    onChange={(e) => handleAzureDisableNeuralToggle(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>Disable Neural Voices (Standard only - $4/M vs $16/M)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button className="primary" onClick={handleAzureConfigure} style={{ flex: 1, padding: '8px' }}>
                  Save Configuration
                </button>
                <button className="secondary" onClick={handleAzureTestConnection} style={{ flex: 1, padding: '8px' }}>
                  Test Connection
                </button>
              </div>
              {azureTestResult && (
                <div style={{ fontSize: '13px', padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
                  {azureTestResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Cloud TTS */}
        <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ margin: 0 }}>🎙️ Google Cloud TTS</h4>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '3px 8px',
                backgroundColor: '#ff9900',
                color: '#000',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>Premium</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="secondary" 
                onClick={() => setShowGoogleGuide(true)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                📖 Setup Guide
              </button>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={googleEnabled}
                  onChange={(e) => handleProviderToggle('google', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>{googleEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#ff9900', marginBottom: '15px', fontWeight: 'bold' }}>
            ⚠️ Premium Service: $10/million characters after free trial • WaveNet voices
          </p>

          {googleEnabled && (
            <div style={{ paddingLeft: '10px', borderLeft: '2px solid #505050' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Service Account JSON
                </label>
                <textarea
                  value={googleServiceAccountJson}
                  onChange={(e) => setGoogleServiceAccountJson(e.target.value)}
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  rows={4}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button className="primary" onClick={handleGoogleConfigure} style={{ flex: 1, padding: '8px' }}>
                  Save Configuration
                </button>
                <button className="secondary" onClick={handleGoogleTestConnection} style={{ flex: 1, padding: '8px' }}>
                  Test Connection
                </button>
              </div>
              {googleTestResult && (
                <div style={{ fontSize: '13px', padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
                  {googleTestResult}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Selection */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Default Voice Settings</h3>
        
        {/* Voice Filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px', 
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#aaa' }}>
              Provider
            </label>
            <select
              value={voiceFilterProvider}
              onChange={(e) => setVoiceFilterProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: '1px solid #505050',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <option value="all">All Providers</option>
              <option value="webspeech">WebSpeech</option>
              <option value="aws">AWS Polly</option>
              <option value="azure">Azure</option>
              <option value="google">Google</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#aaa' }}>
              Language
            </label>
            <select
              value={voiceFilterLanguage}
              onChange={(e) => setVoiceFilterLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: '1px solid #505050',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <option value="all">All Languages</option>
              {getAvailableLanguages().map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#aaa' }}>
              Gender
            </label>
            <select
              value={voiceFilterGender}
              onChange={(e) => setVoiceFilterGender(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: '1px solid #505050',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <option value="all">All Genders</option>
              {getAvailableGenders().map(gender => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#aaa' }}>
              Search
            </label>
            <input
              type="text"
              value={voiceSearchText}
              onChange={(e) => setVoiceSearchText(e.target.value)}
              placeholder="Search voices..."
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: '1px solid #505050',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Voice ({getFilteredVoices().length} available)
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
            {getFilteredVoices().map((voice) => (
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

      {/* Setup Guides */}
      {showAwsGuide && <AwsPollyGuide onClose={() => setShowAwsGuide(false)} />}
      {showAzureGuide && <AzureTtsGuide onClose={() => setShowAzureGuide(false)} />}
      {showGoogleGuide && <GoogleTtsGuide onClose={() => setShowGoogleGuide(false)} />}
    </>
  );

  const renderRulesTab = () => (
    <>
      {/* Message Filtering */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Message Filtering</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterCommands}
            onChange={(e) => {
              setFilterCommands(e.target.checked);
              saveTTSRule('tts_filter_commands', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Filter out commands (starting with ~ or !)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterUrls}
            onChange={(e) => {
              setFilterUrls(e.target.checked);
              saveTTSRule('tts_filter_urls', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Filter out URLs</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterBots}
            onChange={(e) => {
              setFilterBots(e.target.checked);
              saveTTSRule('tts_filter_bots', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Filter out bots</span>
        </label>

        {filterBots && (
          <div style={{ marginLeft: '30px', marginTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Bot usernames (comma separated):
            </label>
            <input
              type="text"
              value={botList}
              onChange={(e) => {
                setBotList(e.target.value);
                saveTTSRule('tts_bot_list', e.target.value);
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Username Announcement */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Username Announcement</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={announceUsername}
            onChange={(e) => {
              setAnnounceUsername(e.target.checked);
              saveTTSRule('tts_announce_username', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Announce username before message</span>
        </label>

        {announceUsername && (
          <div style={{ marginLeft: '30px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Announcement style:
            </label>
            <select
              value={usernameStyle}
              onChange={(e) => {
                setUsernameStyle(e.target.value);
                saveTTSRule('tts_username_style', e.target.value);
              }}
              style={{ width: '100%' }}
            >
              <option value="says">Username says: message</option>
              <option value="from">From Username: message</option>
              <option value="colon">Username: message</option>
            </select>
          </div>
        )}
      </div>

      {/* Message Length Limits */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Message Length Limits</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Min length: {minLength} characters
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={minLength}
            onChange={(e) => {
              setMinLength(parseInt(e.target.value));
              saveTTSRule('tts_min_length', parseInt(e.target.value));
            }}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Max length: {maxLength} characters
          </label>
          <input
            type="range"
            min="50"
            max="500"
            value={maxLength}
            onChange={(e) => {
              setMaxLength(parseInt(e.target.value));
              saveTTSRule('tts_max_length', parseInt(e.target.value));
            }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Duplicate Detection */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Duplicate Detection</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => {
              setSkipDuplicates(e.target.checked);
              saveTTSRule('tts_skip_duplicates', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Skip duplicate messages</span>
        </label>

        {skipDuplicates && (
          <div style={{ marginLeft: '30px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Detection window: {duplicateWindow} seconds
            </label>
            <input
              type="range"
              min="60"
              max="600"
              step="30"
              value={duplicateWindow}
              onChange={(e) => {
                setDuplicateWindow(parseInt(e.target.value));
                saveTTSRule('tts_duplicate_window', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Rate Limiting & Cooldowns */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Rate Limiting & Cooldowns</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={userCooldown}
            onChange={(e) => {
              setUserCooldown(e.target.checked);
              saveTTSRule('tts_user_cooldown', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Per-user cooldown</span>
        </label>

        {userCooldown && (
          <div style={{ marginLeft: '30px', marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Cooldown period: {userCooldownSeconds} seconds
            </label>
            <input
              type="range"
              min="5"
              max="300"
              step="5"
              value={userCooldownSeconds}
              onChange={(e) => {
                setUserCooldownSeconds(parseInt(e.target.value));
                saveTTSRule('tts_user_cooldown_seconds', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={globalCooldown}
            onChange={(e) => {
              setGlobalCooldown(e.target.checked);
              saveTTSRule('tts_global_cooldown', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Global cooldown</span>
        </label>

        {globalCooldown && (
          <div style={{ marginLeft: '30px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Cooldown period: {globalCooldownSeconds} seconds
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={globalCooldownSeconds}
              onChange={(e) => {
                setGlobalCooldownSeconds(parseInt(e.target.value));
                saveTTSRule('tts_global_cooldown_seconds', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Emote & Emoji Limits */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Emote & Emoji Limits</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={limitEmotes}
            onChange={(e) => {
              setLimitEmotes(e.target.checked);
              saveTTSRule('tts_limit_emotes', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Limit emotes per message</span>
        </label>

        {limitEmotes && (
          <div style={{ marginLeft: '30px', marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Max emotes: {maxEmotes}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={maxEmotes}
              onChange={(e) => {
                setMaxEmotes(parseInt(e.target.value));
                saveTTSRule('tts_max_emotes', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={limitEmojis}
            onChange={(e) => {
              setLimitEmojis(e.target.checked);
              saveTTSRule('tts_limit_emojis', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Limit emojis per message</span>
        </label>

        {limitEmojis && (
          <div style={{ marginLeft: '30px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Max emojis: {maxEmojis}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={maxEmojis}
              onChange={(e) => {
                setMaxEmojis(parseInt(e.target.value));
                saveTTSRule('tts_max_emojis', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Character Repetition */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Character Repetition & Numbers</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={limitRepeatedChars}
            onChange={(e) => {
              setLimitRepeatedChars(e.target.checked);
              saveTTSRule('tts_limit_repeated_chars', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Limit repeated characters</span>
        </label>

        {limitRepeatedChars && (
          <div style={{ marginLeft: '30px', marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Max repetition: {maxRepeatedChars}
              <span style={{ marginLeft: '10px', color: '#666' }}>
                (e.g., "heeeeello" → "he{maxRepeatedChars}llo")
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={maxRepeatedChars}
              onChange={(e) => {
                setMaxRepeatedChars(parseInt(e.target.value));
                saveTTSRule('tts_max_repeated_chars', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Long Numbers */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Long Numbers</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={limitLongNumbers}
            onChange={(e) => {
              setLimitLongNumbers(e.target.checked);
              saveTTSRule('tts_limit_long_numbers', e.target.checked);
            }}
            style={{ marginRight: '10px' }}
          />
          <span>Limit long numbers</span>
        </label>

        {limitLongNumbers && (
          <div style={{ marginLeft: '30px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Max number length: {maxNumberLength} digits
              <span style={{ marginLeft: '10px', color: '#666' }}>
                (e.g., "123456789" → "[number]")
              </span>
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={maxNumberLength}
              onChange={(e) => {
                setMaxNumberLength(parseInt(e.target.value));
                saveTTSRule('tts_max_number_length', parseInt(e.target.value));
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Blocked Words */}
      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Blocked Words</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
          Messages containing these words will have them replaced (case-insensitive)
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
            Replacement text:
          </label>
          <input
            type="text"
            value={blockedWordReplacement}
            onChange={(e) => {
              setBlockedWordReplacement(e.target.value);
              saveTTSRule('tts_blocked_word_replacement', e.target.value);
            }}
            placeholder="[censored]"
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Enter word to block"
            value={newBlockedWord}
            onChange={(e) => setNewBlockedWord(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddBlockedWord();
              }
            }}
            style={{ flex: 1 }}
          />
          <button onClick={handleAddBlockedWord}>Add</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {blockedWords.map((word) => (
            <div
              key={word}
              style={{
                padding: '5px 10px',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{word}</span>
              <button
                onClick={() => handleRemoveBlockedWord(word)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4444',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {blockedWords.length === 0 && (
          <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            No blocked words configured
          </p>
        )}
      </div>
    </>
  );

  const loadAccessSettings = async () => {
    try {
      const [restricted, subs, vips, mods, redeems, name, duration] = await Promise.all([
        window.api.invoke('db:getSetting', 'tts_access_restricted'),
        window.api.invoke('db:getSetting', 'tts_access_subscribers'),
        window.api.invoke('db:getSetting', 'tts_access_vips'),
        window.api.invoke('db:getSetting', 'tts_access_moderators'),
        window.api.invoke('db:getSetting', 'tts_access_redeems'),
        window.api.invoke('db:getSetting', 'tts_redeem_name'),
        window.api.invoke('db:getSetting', 'tts_redeem_duration')
      ]);

      setAccessRestricted(restricted === 'true');
      setAllowSubscribers(subs === 'true');
      setAllowVIPs(vips === 'true');
      setAllowModerators(mods === 'true');
      setAllowRedeems(redeems === 'true');
      setRedeemName(name || 'Give Me TTS');
      setRedeemDuration(parseInt(duration) || 30);
      
      // Load active redeems
      loadActiveRedeems();
    } catch (error) {
      console.error('Failed to load TTS access settings:', error);
    }
  };

  const loadActiveRedeems = async () => {
    try {
      const redeems = await window.api.invoke('db:query', 
        'SELECT * FROM tts_access_redeems WHERE is_active = 1 ORDER BY expires_at DESC',
        []
      );
      setActiveRedeems(redeems || []);
    } catch (error) {
      console.error('Failed to load active redeems:', error);
    }
  };

  const saveAccessSetting = async (key: string, value: string | boolean) => {
    try {
      await window.api.invoke('db:setSetting', key, String(value));
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  };

  const removeRedeem = async (redeemId: number) => {
    try {
      await window.api.invoke('db:execute',
        'UPDATE tts_access_redeems SET is_active = 0 WHERE id = ?',
        [redeemId]
      );
      await loadActiveRedeems();
    } catch (error) {
      console.error('Failed to remove redeem:', error);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  const renderAccessTab = () => (
    <div>
      {/* Master Toggle */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Master Toggle</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="switch">
            <input
              type="checkbox"
              checked={accessRestricted}
              onChange={(e) => {
                setAccessRestricted(e.target.checked);
                saveAccessSetting('tts_access_restricted', e.target.checked);
              }}
            />
            <span className="slider round"></span>
          </label>
          <span style={{ fontWeight: 'bold' }}>
            {accessRestricted ? 'TTS Access Restricted' : 'Everyone Can Use TTS'}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          {accessRestricted 
            ? 'Only selected user groups below can use TTS'
            : 'All viewers can use TTS (default behavior)'
          }
        </p>
      </div>

      {/* Access Groups */}
      {accessRestricted && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Allowed User Groups</h3>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
            Select which groups have TTS access. Users meeting any criteria will have access.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Subscribers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={allowSubscribers}
                onChange={(e) => {
                  setAllowSubscribers(e.target.checked);
                  saveAccessSetting('tts_access_subscribers', e.target.checked);
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <label style={{ fontSize: '14px' }}>
                <strong>Subscribers</strong> - Users subscribed to the channel
              </label>
            </div>

            {/* VIPs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={allowVIPs}
                onChange={(e) => {
                  setAllowVIPs(e.target.checked);
                  saveAccessSetting('tts_access_vips', e.target.checked);
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <label style={{ fontSize: '14px' }}>
                <strong>VIPs</strong> - Users with VIP status
              </label>
            </div>

            {/* Moderators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={allowModerators}
                onChange={(e) => {
                  setAllowModerators(e.target.checked);
                  saveAccessSetting('tts_access_moderators', e.target.checked);
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <label style={{ fontSize: '14px' }}>
                <strong>Moderators</strong> - Channel moderators
              </label>
            </div>

            {/* Redeems */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={allowRedeems}
                onChange={(e) => {
                  setAllowRedeems(e.target.checked);
                  saveAccessSetting('tts_access_redeems', e.target.checked);
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <label style={{ fontSize: '14px' }}>
                <strong>Channel Point Redeems</strong> - Users who redeem access
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Configuration */}
      {accessRestricted && allowRedeems && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Channel Point Redeem Configuration</h3>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
            Users who redeem this channel point reward will get TTS access for the specified duration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                Redeem Name:
              </label>
              <input
                type="text"
                value={redeemName}
                onChange={(e) => setRedeemName(e.target.value)}
                onBlur={() => saveAccessSetting('tts_redeem_name', redeemName)}
                placeholder="Give Me TTS"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                Duration (minutes):
              </label>
              <input
                type="number"
                value={redeemDuration}
                onChange={(e) => setRedeemDuration(parseInt(e.target.value) || 0)}
                onBlur={() => saveAccessSetting('tts_redeem_duration', String(redeemDuration))}
                min="1"
                max="1440"
                style={{ width: '150px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', color: '#ffc107', margin: 0 }}>
              ⚠️ <strong>Note:</strong> You need to set up an EventSub listener to automatically grant access when users redeem. 
              This feature requires channel point redeem integration (Phase 10+).
            </p>
          </div>
        </div>
      )}

      {/* Active Redeems Table */}
      {accessRestricted && allowRedeems && (
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Active Channel Point Redeems</h3>
          
          {activeRedeems.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '20px' }}>
              No active redeems. Users will appear here when they redeem TTS access.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Username</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Redeemed At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Expires At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Time Remaining</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRedeems.map((redeem) => (
                    <tr key={redeem.id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{redeem.username}</td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {formatDateTime(redeem.redeemed_at)}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {formatDateTime(redeem.expires_at)}
                      </td>
                      <td style={{ padding: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatTimeRemaining(redeem.expires_at)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => removeRedeem(redeem.id)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            backgroundColor: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVoiceSettingsTab = () => {
    const searchVoiceViewers = async () => {
      if (!voiceSettingsSearch.trim()) {
        setVoiceSearchResults([]);
        return;
      }
      
      try {
        const viewers = await window.api.invoke('db:getViewers');
        const filtered = viewers.filter((v: any) => 
          v.username.toLowerCase().includes(voiceSettingsSearch.toLowerCase()) ||
          v.display_name?.toLowerCase().includes(voiceSettingsSearch.toLowerCase())
        ).slice(0, 10);
        setVoiceSearchResults(filtered);
      } catch (error) {
        console.error('Failed to search viewers:', error);
      }
    };

    const selectViewer = async (viewer: any) => {
      setSelectedViewer(viewer);
      setVoiceSearchResults([]);
      setVoiceSettingsSearch('');
      
      // Load existing preference
      try {
        const pref = await window.api.invoke('db:getViewerVoicePreference', viewer.id);
        if (pref) {
          setSelectedViewerVoice(pref.voice_id);
          setViewerPitch(pref.pitch || 1.0);
          setViewerSpeed(pref.speed || 1.0);
          setViewerVolume(pref.volume || 1.0);
        } else {
          // Reset to defaults
          setSelectedViewerVoice('');
          setViewerPitch(1.0);
          setViewerSpeed(1.0);
          setViewerVolume(1.0);
        }
      } catch (error) {
        console.error('Failed to load viewer preference:', error);
      }
    };

    const saveViewerVoice = async () => {
      if (!selectedViewer || !selectedViewerVoice) return;
      
      try {
        const voice = voices.find(v => v.voice_id === selectedViewerVoice);
        if (!voice) {
          alert('Please select a voice');
          return;
        }

        await window.api.invoke('db:execute',
          `INSERT INTO viewer_voice_preferences (viewer_id, voice_id, provider, pitch, speed, volume, updated_at)
           VALUES (?, ?, 'webspeech', ?, ?, ?, datetime('now'))
           ON CONFLICT(viewer_id) DO UPDATE SET
             voice_id = excluded.voice_id,
             provider = excluded.provider,
             pitch = excluded.pitch,
             speed = excluded.speed,
             volume = excluded.volume,
             updated_at = excluded.updated_at`,
          [selectedViewer.id, selectedViewerVoice, viewerPitch, viewerSpeed, viewerVolume]
        );
        
        alert('Voice preference saved!');
        await loadViewerVoicePreferences();
        setSelectedViewer(null);
        setSelectedViewerVoice('');
      } catch (error) {
        console.error('Failed to save voice preference:', error);
        alert('Failed to save voice preference');
      }
    };

    const deleteViewerVoice = async (viewerId: string) => {
      if (!confirm('Remove voice preference for this viewer?')) return;
      
      try {
        await window.api.invoke('db:execute',
          'DELETE FROM viewer_voice_preferences WHERE viewer_id = ?',
          [viewerId]
        );
        await loadViewerVoicePreferences();
      } catch (error) {
        console.error('Failed to delete voice preference:', error);
      }
    };

    const testViewerVoice = () => {
      if (!selectedViewerVoice) {
        alert('Please select a voice first');
        return;
      }
      
      const voice = voices.find(v => v.voice_id === selectedViewerVoice);
      if (voice) {
        webSpeechService.testVoice(voice.voice_id, 'This is a test of the selected voice.');
      }
    };

    return (
      <div>
        {/* Viewer Search and Selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Set Voice for Viewer</h3>
          
          {!selectedViewer ? (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                Search for viewer:
              </label>
              <input
                type="text"
                value={voiceSettingsSearch}
                onChange={(e) => {
                  setVoiceSettingsSearch(e.target.value);
                  searchVoiceViewers();
                }}
                placeholder="Type username..."
                style={{ width: '100%' }}
              />
              
              {voiceSearchResults.length > 0 && (
                <div style={{ 
                  marginTop: '5px', 
                  border: '1px solid #444', 
                  borderRadius: '4px', 
                  maxHeight: '200px', 
                  overflowY: 'auto' 
                }}>
                  {voiceSearchResults.map(viewer => (
                    <div
                      key={viewer.id}
                      onClick={() => selectViewer(viewer)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #333'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {viewer.display_name || viewer.username}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(145, 71, 255, 0.1)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Configuring voice for:</strong> {selectedViewer.display_name || selectedViewer.username}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedViewer(null);
                      setSelectedViewerVoice('');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: '#555',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Voice:
                </label>
                <select
                  value={selectedViewerVoice}
                  onChange={(e) => setSelectedViewerVoice(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select a voice...</option>
                  {voices.map(voice => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      [{voice.provider.toUpperCase()}] {voice.name} ({voice.language_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Pitch: {viewerPitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={viewerPitch}
                  onChange={(e) => setViewerPitch(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Speed: {viewerSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={viewerSpeed}
                  onChange={(e) => setViewerSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Volume: {Math.round(viewerVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={viewerVolume}
                  onChange={(e) => setViewerVolume(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={testViewerVoice}
                  disabled={!selectedViewerVoice}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedViewerVoice ? '#555' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedViewerVoice ? 'pointer' : 'not-allowed'
                  }}
                >
                  🔊 Test Voice
                </button>
                <button
                  onClick={saveViewerVoice}
                  disabled={!selectedViewerVoice}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedViewerVoice ? '#9147ff' : '#555',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedViewerVoice ? 'pointer' : 'not-allowed'
                  }}
                >
                  💾 Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Voice Preferences Table */}
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Configured Voice Preferences</h3>
          
          {viewerVoicePreferences.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '20px' }}>
              No custom voice preferences set
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Viewer</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Voice</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Pitch</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Speed</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Volume</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewerVoicePreferences.map((pref) => {
                    const voice = voices.find(v => v.voice_id === pref.voice_id);
                    return (
                      <tr key={pref.viewer_id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '10px', fontSize: '14px' }}>
                          {pref.display_name || pref.username}
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                          {voice ? voice.name : pref.voice_id}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px' }}>
                          {pref.pitch?.toFixed(1) || '1.0'}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px' }}>
                          {pref.speed?.toFixed(1) || '1.0'}x
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px' }}>
                          {Math.round((pref.volume || 1) * 100)}%
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => selectViewer({ 
                                id: pref.viewer_id, 
                                username: pref.username, 
                                display_name: pref.display_name 
                              })}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                backgroundColor: '#555',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteViewerVoice(pref.viewer_id)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                backgroundColor: '#d32f2f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRestrictionsTab = () => {
    const searchViewers = async () => {
      if (!restrictionSearch.trim()) {
        setSearchResults([]);
        return;
      }
      
      try {
        const viewers = await window.api.invoke('db:getViewers');
        const filtered = viewers.filter((v: any) => 
          v.username.toLowerCase().includes(restrictionSearch.toLowerCase()) ||
          v.display_name?.toLowerCase().includes(restrictionSearch.toLowerCase())
        ).slice(0, 10);
        setSearchResults(filtered);
      } catch (error) {
        console.error('Failed to search viewers:', error);
      }
    };

    const applyRestriction = async (viewer: any) => {
      try {
        if (restrictionType === 'mute') {
          await window.api.invoke('db:execute',
            `INSERT INTO viewer_tts_restrictions (viewer_id, is_muted, mute_period_mins, muted_at, mute_expires_at, updated_at)
             VALUES (?, 1, ?, datetime('now'), datetime('now', '+' || ? || ' minutes'), datetime('now'))
             ON CONFLICT(viewer_id) DO UPDATE SET
               is_muted = 1,
               mute_period_mins = excluded.mute_period_mins,
               muted_at = excluded.muted_at,
               mute_expires_at = excluded.mute_expires_at,
               updated_at = excluded.updated_at`,
            [viewer.id, muteDuration > 0 ? muteDuration : null, muteDuration]
          );
        } else {
          await window.api.invoke('db:execute',
            `INSERT INTO viewer_tts_restrictions (viewer_id, has_cooldown, cooldown_gap_seconds, cooldown_period_mins, cooldown_set_at, cooldown_expires_at, updated_at)
             VALUES (?, 1, ?, ?, datetime('now'), ${cooldownDuration > 0 ? "datetime('now', '+' || ? || ' minutes')" : 'NULL'}, datetime('now'))
             ON CONFLICT(viewer_id) DO UPDATE SET
               has_cooldown = 1,
               cooldown_gap_seconds = excluded.cooldown_gap_seconds,
               cooldown_period_mins = excluded.cooldown_period_mins,
               cooldown_set_at = excluded.cooldown_set_at,
               cooldown_expires_at = excluded.cooldown_expires_at,
               updated_at = excluded.updated_at`,
            cooldownDuration > 0 ? [viewer.id, cooldownGap, cooldownDuration, cooldownDuration] : [viewer.id, cooldownGap, cooldownDuration]
          );
        }
        
        setRestrictionSearch('');
        setSearchResults([]);
        await loadRestrictions();
      } catch (error) {
        console.error('Failed to apply restriction:', error);
        alert('Failed to apply restriction');
      }
    };

    const removeRestriction = async (viewerId: string, type: 'mute' | 'cooldown') => {
      try {
        if (type === 'mute') {
          await window.api.invoke('db:execute',
            'UPDATE viewer_tts_restrictions SET is_muted = 0, mute_expires_at = NULL WHERE viewer_id = ?',
            [viewerId]
          );
        } else {
          await window.api.invoke('db:execute',
            'UPDATE viewer_tts_restrictions SET has_cooldown = 0, cooldown_expires_at = NULL WHERE viewer_id = ?',
            [viewerId]
          );
        }
        await loadRestrictions();
      } catch (error) {
        console.error('Failed to remove restriction:', error);
      }
    };

    const formatTimeRemaining = (expiresAt: string | null): string => {
      if (!expiresAt) return 'Permanent';
      
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) return 'Expired';

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
    };

    return (
      <div>
        {/* Add Restriction Section */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Add TTS Restriction</h3>
            <button
              onClick={loadRestrictions}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Search for viewer:
            </label>
            <input
              type="text"
              value={restrictionSearch}
              onChange={(e) => {
                setRestrictionSearch(e.target.value);
                searchViewers();
              }}
              placeholder="Type username..."
              style={{ width: '100%' }}
            />
            
            {searchResults.length > 0 && (
              <div style={{ 
                marginTop: '5px', 
                border: '1px solid #444', 
                borderRadius: '4px', 
                maxHeight: '200px', 
                overflowY: 'auto' 
              }}>
                {searchResults.map(viewer => (
                  <div
                    key={viewer.id}
                    onClick={() => {
                      setRestrictionSearch(viewer.username);
                      setSearchResults([]);
                    }}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #333'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {viewer.display_name || viewer.username}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              Restriction Type:
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  checked={restrictionType === 'mute'}
                  onChange={() => setRestrictionType('mute')}
                />
                Mute
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  checked={restrictionType === 'cooldown'}
                  onChange={() => setRestrictionType('cooldown')}
                />
                Cooldown
              </label>
            </div>
          </div>

          {restrictionType === 'mute' ? (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                Duration (minutes, 0 = permanent):
              </label>
              <input
                type="number"
                value={muteDuration}
                onChange={(e) => setMuteDuration(parseInt(e.target.value) || 0)}
                min="0"
                style={{ width: '150px' }}
              />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Cooldown gap (seconds between TTS):
                </label>
                <input
                  type="number"
                  value={cooldownGap}
                  onChange={(e) => setCooldownGap(parseInt(e.target.value) || 0)}
                  min="1"
                  style={{ width: '150px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                  Duration (minutes, 0 = permanent):
                </label>
                <input
                  type="number"
                  value={cooldownDuration}
                  onChange={(e) => setCooldownDuration(parseInt(e.target.value) || 0)}
                  min="0"
                  style={{ width: '150px' }}
                />
              </div>
            </>
          )}

          <button
            onClick={async () => {
              const viewers = await window.api.invoke('db:getViewers');
              const viewer = viewers.find((v: any) => v.username.toLowerCase() === restrictionSearch.toLowerCase());
              if (viewer) {
                await applyRestriction(viewer);
              } else {
                alert('Viewer not found');
              }
            }}
            disabled={!restrictionSearch.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: restrictionSearch.trim() ? '#9147ff' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: restrictionSearch.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Apply {restrictionType === 'mute' ? 'Mute' : 'Cooldown'}
          </button>
        </div>

        {/* Muted Viewers Table */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Muted Viewers</h3>
          
          {mutedViewers.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '20px' }}>
              No muted viewers
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Username</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Muted At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Expires At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Time Remaining</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mutedViewers.map((viewer) => (
                    <tr key={viewer.viewer_id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{viewer.username || viewer.viewer_id}</td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {new Date(viewer.muted_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {viewer.mute_expires_at ? new Date(viewer.mute_expires_at).toLocaleString() : 'Never'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatTimeRemaining(viewer.mute_expires_at)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => removeRestriction(viewer.viewer_id, 'mute')}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            backgroundColor: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Unmute
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cooldown Viewers Table */}
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Viewers with Cooldowns</h3>
          
          {cooldownViewers.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '20px' }}>
              No viewers with cooldowns
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Username</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Gap (seconds)</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Set At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Expires At</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Time Remaining</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cooldownViewers.map((viewer) => (
                    <tr key={viewer.viewer_id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{viewer.username || viewer.viewer_id}</td>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{viewer.cooldown_gap_seconds}s</td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {new Date(viewer.cooldown_set_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                        {viewer.cooldown_expires_at ? new Date(viewer.cooldown_expires_at).toLocaleString() : 'Never'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatTimeRemaining(viewer.cooldown_expires_at)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => removeRestriction(viewer.viewer_id, 'cooldown')}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            backgroundColor: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

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
