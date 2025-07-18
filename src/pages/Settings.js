// Settings page component
const { ipcRenderer } = require('electron');

class SettingsPage {
  constructor(container) {
    this.container = container;
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
    
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      // Load theme setting
      this.settings.theme = await ipcRenderer.invoke('get-theme');
      
      // Load audio settings
      this.settings.audioSettings = await ipcRenderer.invoke('get-audio-settings');
      
      // Load library paths
      this.settings.libraryPaths = await ipcRenderer.invoke('get-library-paths');
      
      // Load API keys
      this.settings.apiKeys = await ipcRenderer.invoke('get-api-keys');
      
      // Load AI features settings
      this.settings.aiFeatures = await ipcRenderer.invoke('get-ai-features');
      
      // Render the settings page
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.container.innerHTML = `<div class="error">Error loading settings: ${error.message}</div>`;
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div id="settings-page" class="page">
        <h2>Settings</h2>
        
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="setting-item">
            <label for="theme-select">Theme</label>
            <select id="theme-select">
              <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="amoled" ${this.settings.theme === 'amoled' ? 'selected' : ''}>AMOLED</option>
            </select>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Audio</h3>
          <div class="setting-item">
            <label for="crossfade-range">Crossfade (seconds)</label>
            <input type="range" id="crossfade-range" min="0" max="12" step="0.5" value="${this.settings.audioSettings.crossfade}">
            <span id="crossfade-value">${this.settings.audioSettings.crossfade}s</span>
          </div>
          
          <div class="setting-item">
            <label for="gapless-toggle">Gapless Playback</label>
            <input type="checkbox" id="gapless-toggle" ${this.settings.audioSettings.gapless ? 'checked' : ''}>
          </div>
          
          <div class="setting-item">
            <h4>Equalizer</h4>
            <div class="equalizer-container">
              ${this.renderEqualizer()}
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Library</h3>
          <div class="setting-item">
            <h4>Music Folders</h4>
            <div class="library-paths">
              ${this.renderLibraryPaths()}
            </div>
            <button class="btn" id="add-library-path">Add Folder</button>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>AI Features</h3>
          <div class="setting-item">
            <h4>API Keys</h4>
            <div class="api-key-setting">
              <label for="gemini-api-key">Gemini API Key</label>
              <input type="password" id="gemini-api-key" placeholder="Enter your Gemini API key" value="${this.settings.apiKeys?.gemini || ''}">
              <button class="btn-text" id="show-hide-gemini-key">Show</button>
            </div>
            <p class="setting-description">API key for Gemini AI features like music recommendations and playlist generation</p>
          </div>
          <div class="setting-item">
            <label for="ai-features-toggle">Enable AI Features</label>
            <input type="checkbox" id="ai-features-toggle" ${this.settings.aiFeatures?.enabled ? 'checked' : ''}>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>About</h3>
          <div class="setting-item">
            <p>PulseBeats Music Player</p>
            <p>Version 0.1.0</p>
            <p>&copy; 2025 PulseBeats Team</p>
          </div>
        </div>
      </div>
    `;
  }
  
  renderEqualizer() {
    const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    let html = '';
    
    for (let i = 0; i < 10; i++) {
      html += `
        <div class="eq-band">
          <input type="range" class="eq-slider" data-band="${i}" min="-12" max="12" step="1" value="${this.settings.audioSettings.equalizer[i]}">
          <div class="eq-value">${this.settings.audioSettings.equalizer[i]} dB</div>
          <div class="eq-freq">${bands[i] < 1000 ? bands[i] : bands[i]/1000 + 'k'} Hz</div>
        </div>
      `;
    }
    
    return html;
  }
  
  renderLibraryPaths() {
    if (this.settings.libraryPaths.length === 0) {
      return '<p>No music folders added yet.</p>';
    }
    
    let html = '<ul class="path-list">';
    
    this.settings.libraryPaths.forEach(path => {
      html += `
        <li class="path-item">
          <span class="path-text">${path}</span>
          <button class="btn-text remove-path" data-path="${path}">Remove</button>
        </li>
      `;
    });
    
    html += '</ul>';
    return html;
  }
  
  setupEventListeners() {
    // Theme selection
    document.getElementById('theme-select').addEventListener('change', (e) => {
      const theme = e.target.value;
      this.updateTheme(theme);
    });
    
    // Crossfade setting
    document.getElementById('crossfade-range').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('crossfade-value').textContent = value + 's';
      this.updateAudioSetting('crossfade', value);
    });
    
    // Gapless playback toggle
    document.getElementById('gapless-toggle').addEventListener('change', (e) => {
      const value = e.target.checked;
      this.updateAudioSetting('gapless', value);
    });
    
    // Equalizer sliders
    document.querySelectorAll('.eq-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const band = parseInt(e.target.getAttribute('data-band'));
        const value = parseInt(e.target.value);
        
        // Update display value
        e.target.parentNode.querySelector('.eq-value').textContent = value + ' dB';
        
        // Update equalizer setting
        const equalizer = [...this.settings.audioSettings.equalizer];
        equalizer[band] = value;
        this.updateAudioSetting('equalizer', equalizer);
      });
    });
    
    // Add library path
    document.getElementById('add-library-path').addEventListener('click', () => {
      this.addLibraryPath();
    });
    
    // Remove library path
    document.querySelectorAll('.remove-path').forEach(button => {
      button.addEventListener('click', (e) => {
        const path = e.target.getAttribute('data-path');
        this.removeLibraryPath(path);
      });
    });
    
    // Gemini API key
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    if (geminiApiKeyInput) {
      geminiApiKeyInput.addEventListener('change', (e) => {
        this.updateApiKey('gemini', e.target.value);
      });
    }
    
    // Show/hide API key
    const showHideButton = document.getElementById('show-hide-gemini-key');
    if (showHideButton) {
      showHideButton.addEventListener('click', () => {
        const input = document.getElementById('gemini-api-key');
        if (input.type === 'password') {
          input.type = 'text';
          showHideButton.textContent = 'Hide';
        } else {
          input.type = 'password';
          showHideButton.textContent = 'Show';
        }
      });
    }
    
    // AI features toggle
    const aiFeaturesToggle = document.getElementById('ai-features-toggle');
    if (aiFeaturesToggle) {
      aiFeaturesToggle.addEventListener('change', (e) => {
        this.updateAiFeatures('enabled', e.target.checked);
      });
    }
  }
  
  async updateTheme(theme) {
    try {
      await ipcRenderer.invoke('set-theme', theme);
      this.settings.theme = theme;
      
      // Apply theme to document
      document.body.className = theme + '-theme';
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  }
  
  async updateAudioSetting(key, value) {
    try {
      const settings = { ...this.settings.audioSettings };
      settings[key] = value;
      
      await ipcRenderer.invoke('update-audio-settings', settings);
      this.settings.audioSettings = settings;
    } catch (error) {
      console.error('Error updating audio settings:', error);
    }
  }
  
  async addLibraryPath() {
    try {
      const result = await ipcRenderer.invoke('open-folder-dialog');
      
      if (!result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        const paths = await ipcRenderer.invoke('add-library-path', path);
        
        this.settings.libraryPaths = paths;
        
        // Update the library paths display
        const libraryPathsContainer = document.querySelector('.library-paths');
        libraryPathsContainer.innerHTML = this.renderLibraryPaths();
        
        // Re-attach event listeners
        document.querySelectorAll('.remove-path').forEach(button => {
          button.addEventListener('click', (e) => {
            const path = e.target.getAttribute('data-path');
            this.removeLibraryPath(path);
          });
        });
      }
    } catch (error) {
      console.error('Error adding library path:', error);
    }
  }
  
  async removeLibraryPath(path) {
    try {
      const paths = await ipcRenderer.invoke('remove-library-path', path);
      
      this.settings.libraryPaths = paths;
      
      // Update the library paths display
      const libraryPathsContainer = document.querySelector('.library-paths');
      libraryPathsContainer.innerHTML = this.renderLibraryPaths();
      
      // Re-attach event listeners
      document.querySelectorAll('.remove-path').forEach(button => {
        button.addEventListener('click', (e) => {
          const path = e.target.getAttribute('data-path');
          this.removeLibraryPath(path);
        });
      });
    } catch (error) {
      console.error('Error removing library path:', error);
    }
  }
  
  async updateApiKey(provider, value) {
    try {
      // Initialize apiKeys if it doesn't exist
      if (!this.settings.apiKeys) {
        this.settings.apiKeys = {};
      }
      
      // Update the API key
      this.settings.apiKeys[provider] = value;
      
      // Save to store via IPC
      await ipcRenderer.invoke('update-api-keys', this.settings.apiKeys);
      
      console.log(`${provider} API key updated`);
    } catch (error) {
      console.error(`Error updating ${provider} API key:`, error);
    }
  }
  
  async updateAiFeatures(key, value) {
    try {
      // Initialize aiFeatures if it doesn't exist
      if (!this.settings.aiFeatures) {
        this.settings.aiFeatures = { enabled: false };
      }
      
      // Update the AI feature setting
      this.settings.aiFeatures[key] = value;
      
      // Save to store via IPC
      await ipcRenderer.invoke('update-ai-features', this.settings.aiFeatures);
      
      console.log(`AI feature ${key} updated to ${value}`);
    } catch (error) {
      console.error(`Error updating AI feature ${key}:`, error);
    }
  }
}

module.exports = SettingsPage;