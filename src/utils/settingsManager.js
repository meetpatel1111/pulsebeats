// Settings Manager - Handles loading and saving settings
const { ipcRenderer } = require('electron');

class SettingsManager {
  constructor() {
    this.settings = {
      theme: 'dark',
      audioSettings: {
        volume: 1.0,
        equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        crossfade: 2,
        gapless: true
      },
      libraryPaths: []
    };
  }
  
  async loadSettings() {
    try {
      // Load theme setting
      this.settings.theme = await ipcRenderer.invoke('get-theme');
      
      // Load audio settings
      this.settings.audioSettings = await ipcRenderer.invoke('get-audio-settings');
      
      // Load library paths
      this.settings.libraryPaths = await ipcRenderer.invoke('get-library-paths');
      
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }
  
  async updateTheme(theme) {
    try {
      await ipcRenderer.invoke('set-theme', theme);
      this.settings.theme = theme;
      return theme;
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  }
  
  async updateAudioSettings(settings) {
    try {
      await ipcRenderer.invoke('update-audio-settings', settings);
      this.settings.audioSettings = settings;
      return settings;
    } catch (error) {
      console.error('Error updating audio settings:', error);
      throw error;
    }
  }
  
  async addLibraryPath(path) {
    try {
      const paths = await ipcRenderer.invoke('add-library-path', path);
      this.settings.libraryPaths = paths;
      return paths;
    } catch (error) {
      console.error('Error adding library path:', error);
      throw error;
    }
  }
  
  async removeLibraryPath(path) {
    try {
      const paths = await ipcRenderer.invoke('remove-library-path', path);
      this.settings.libraryPaths = paths;
      return paths;
    } catch (error) {
      console.error('Error removing library path:', error);
      throw error;
    }
  }
  
  getEqualizerPreset(preset) {
    switch (preset) {
      case 'flat':
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      case 'bass':
        return [10, 8, 6, 4, 0, 0, 0, 0, 0, 0];
      case 'vocal':
        return [0, 0, 0, 3, 6, 6, 3, 0, 0, 0];
      case 'rock':
        return [4, 3, 0, 0, -2, 0, 2, 4, 4, 4];
      case 'electronic':
        return [6, 5, 0, -2, -4, -2, 0, 3, 5, 6];
      default:
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }
}

// Export singleton instance
const settingsManager = new SettingsManager();
module.exports = settingsManager;