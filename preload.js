// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // IPC communication
    invoke: (channel, data) => {
      const validChannels = [
        'get-theme', 
        'set-theme',
        'get-library-paths',
        'add-library-path',
        'remove-library-path',
        'get-audio-settings',
        'update-audio-settings',
        'scan-library',
        'open-folder-dialog',
        'get-playlists',
        'create-playlist',
        'update-playlist',
        'delete-playlist',
        'add-track-to-playlist',
        'remove-track-from-playlist',
        'update-track-metadata',
        'read-file',
        'write-file',
        'set-sleep-timer',
        'cancel-sleep-timer',
        'get-sleep-timer',
        'get-user-profile',
        'update-user-profile',
        'get-privacy-settings',
        'update-privacy-settings',
        'get-visualization-settings',
        'update-visualization-settings',
        'update-track-stats',
        'get-recently-played',
        'add-to-recently-played',
        'get-favorites',
        'add-to-favorites',
        'remove-from-favorites',
        'create-smart-playlist',
        'get-smart-playlists',
        'update-smart-playlist',
        'delete-smart-playlist',
        'get-smart-playlist-tracks',
        'get-lyrics',
        'save-lyrics',
        'get-equalizer-presets',
        'save-equalizer-preset',
        'delete-equalizer-preset',
        'export-playlist',
        'get-api-keys',
        'update-api-keys',
        'get-ai-features',
        'update-ai-features',
        'get-ai-recommendations',
        'test-gemini-api',
        'custom-gemini-prompt'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
    },
    
    // Event listeners
    on: (channel, func) => {
      const validChannels = [
        'audio-error',
        'library-scan-progress',
        'track-ended',
        'metadata-updated',
        'playback-state-changed'
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    // Remove event listeners
    removeListener: (channel, func) => {
      const validChannels = [
        'audio-error',
        'library-scan-progress',
        'track-ended',
        'metadata-updated',
        'playback-state-changed'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    }
  }
);