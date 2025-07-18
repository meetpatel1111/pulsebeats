// Settings Page component - Manages app settings
const { ipcRenderer } = require('electron');
const Equalizer = require('../components/Equalizer');

class SettingsPage {
  constructor(container, audioService) {
    this.container = container;
    this.audioService = audioService;
    this.settings = {
      theme: 'dark',
      audioSettings: {
        volume: 1.0,
        equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        crossfade: 2,
        gapless: true,
        normalization: true,
        replayGain: 0,
        spatialAudio: false,
        monoMode: false,
        outputDevice: 'default'
      },
      userProfile: {
        name: 'Default',
        avatar: null
      },
      privacy: {
        anonymousMode: false,
        privateListening: false,
        encryptedStorage: false
      },
      visualization: {
        enabled: true,
        type: 'spectrum',
        sensitivity: 0.8,
        colorScheme: 'dynamic'
      }
    };
    this.equalizer = null;
    this.outputDevices = [
      { id: 'default', name: 'System Default' }
    ];
  }
  
  async initialize() {
    try {
      // Load settings
      await this.loadSettings();
      
      // Render settings page
      this.render();
      
      // Initialize equalizer
      const equalizerContainer = this.container.querySelector('.equalizer-container');
      this.equalizer = new Equalizer(equalizerContainer, this.audioService);
      await this.equalizer.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Error initializing settings page:', error);
      return false;
    }
  }
  
  async loadSettings() {
    try {
      // Load theme
      this.settings.theme = await ipcRenderer.invoke('get-theme');
      
      // Load audio settings
      this.settings.audioSettings = await ipcRenderer.invoke('get-audio-settings');
      
      // Load user profile
      this.settings.userProfile = await ipcRenderer.invoke('get-user-profile');
      
      // Load privacy settings
      this.settings.privacy = await ipcRenderer.invoke('get-privacy-settings');
      
      // Load visualization settings
      this.settings.visualization = await ipcRenderer.invoke('get-visualization-settings');
      
      // Get output devices
      await this.getOutputDevices();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  async getOutputDevices() {
    try {
      // In a real app, we would get the available audio output devices
      // For now, we'll just add some dummy devices
      this.outputDevices = [
        { id: 'default', name: 'System Default' },
        { id: 'speakers', name: 'Speakers' },
        { id: 'headphones', name: 'Headphones' },
        { id: 'bluetooth', name: 'Bluetooth Device' },
        { id: 'hdmi', name: 'HDMI Output' }
      ];
    } catch (error) {
      console.error('Error getting output devices:', error);
  