// Equalizer component - Handles audio equalization
const { ipcRenderer } = require('electron');

class Equalizer {
  constructor(container, audioService) {
    this.container = container;
    this.audioService = audioService;
    this.bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]; // Frequency bands in Hz
    this.values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Default values (-12 to +12 dB)
    this.presets = [
      { name: 'Flat', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { name: 'Bass Boost', values: [10, 8, 6, 4, 0, 0, 0, 0, 0, 0] },
      { name: 'Vocal Boost', values: [0, 0, 0, 3, 6, 6, 3, 0, 0, 0] },
      { name: 'Rock', values: [4, 3, 0, 0, -2, 0, 2, 4, 4, 4] },
      { name: 'Electronic', values: [6, 5, 0, -2, -4, -2, 0, 3, 5, 6] },
      { name: 'Classical', values: [0, 0, 0, 0, 0, 0, -2, -3, -3, -4] },
      { name: 'Jazz', values: [0, 0, 2, 4, -2, 0, 0, 2, 3, 4] },
      { name: 'Pop', values: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] }
    ];
    this.customPresets = [];
    this.isEnabled = true;
  }
  
  async initialize() {
    try {
      // Create equalizer element
      this.element = document.createElement('div');
      this.element.className = 'equalizer';
      
      // Add to container
      this.container.appendChild(this.element);
      
      // Load audio settings
      const audioSettings = await ipcRenderer.invoke('get-audio-settings');
      this.values = audioSettings.equalizer || this.values;
      this.isEnabled = audioSettings.equalizerEnabled !== false;
      
      // Load custom presets
      this.customPresets = await ipcRenderer.invoke('get-equalizer-presets') || [];
      
      // Render equalizer
      this.render();
      
      return true;
    } catch (error) {
      console.error('Error initializing equalizer:', error);
      return false;
    }
  }
  
  render() {
    this.element.innerHTML = `
      <div class="equalizer-header">
        <h3>Equalizer</h3>
        <label class="switch">
          <input type="checkbox" id="eq-toggle" ${this.isEnabled ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>
      
      <div class="equalizer-content ${this.isEnabled ? '' : 'disabled'}">
        <div class="equalizer-bands"></div>
        
        <div class="equalizer-presets">
          <label>Presets:</label>
          <select id="eq-presets">
            <option value="">Custom</option>
            ${this.presets.map(preset => `<option value="${preset.name}">${preset.name}</option>`).join('')}
            ${this.customPresets.map(preset => `<option value="custom-${preset.id}">${preset.name}</option>`).join('')}
          </select>
          <button class="btn-text" id="save-preset">Save</button>
        </div>
      </div>
    `;
    
    // Render bands
    this.renderBands();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  renderBands() {
    const bandsContainer = this.element.querySelector('.equalizer-bands');
    bandsContainer.innerHTML = '';
    
    this.bands.forEach((freq, index) => {
      const bandElement = document.createElement('div');
      bandElement.className = 'eq-band';
      
      const freqLabel = freq < 1000 ? `${freq} Hz` : `${freq / 1000} kHz`;
      
      bandElement.innerHTML = `
        <input type="range" class="eq-slider" data-band="${index}" min="-12" max="12" step="1" value="${this.values[index]}" orient="vertical">
        <div class="eq-value">${this.values[index]} dB</div>
        <div class="eq-freq">${freqLabel}</div>
      `;
      
      bandsContainer.appendChild(bandElement);
    });
  }
  
  setupEventListeners() {
    // Enable/disable toggle
    const toggle = this.element.querySelector('#eq-toggle');
    toggle.addEventListener('change', (e) => {
      this.isEnabled = e.target.checked;
      this.element.querySelector('.equalizer-content').classList.toggle('disabled', !this.isEnabled);
      this.updateAudioSettings();
    });
    
    // Band sliders
    const sliders = this.element.querySelectorAll('.eq-slider');
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const band = parseInt(e.target.dataset.band);
        const value = parseInt(e.target.value);
        
        // Update value display
        e.target.parentNode.querySelector('.eq-value').textContent = `${value} dB`;
        
        // Update values array
        this.values[band] = value;
        
        // Update audio settings
        this.updateAudioSettings();
        
        // Reset preset selection
        this.element.querySelector('#eq-presets').value = '';
      });
    });
    
    // Preset selection
    const presetSelect = this.element.querySelector('#eq-presets');
    presetSelect.addEventListener('change', (e) => {
      const value = e.target.value;
      
      if (!value) return;
      
      let preset;
      
      if (value.startsWith('custom-')) {
        // Custom preset
        const id = value.substring(7);
        preset = this.customPresets.find(p => p.id === id);
      } else {
        // Built-in preset
        preset = this.presets.find(p => p.name === value);
      }
      
      if (preset) {
        this.applyPreset(preset.values);
      }
    });
    
    // Save preset button
    const saveButton = this.element.querySelector('#save-preset');
    saveButton.addEventListener('click', () => this.showSavePresetDialog());
  }
  
  applyPreset(values) {
    // Update values
    this.values = [...values];
    
    // Update sliders
    const sliders = this.element.querySelectorAll('.eq-slider');
    sliders.forEach((slider, index) => {
      slider.value = values[index];
      slider.parentNode.querySelector('.eq-value').textContent = `${values[index]} dB`;
    });
    
    // Update audio settings
    this.updateAudioSettings();
  }
  
  async updateAudioSettings() {
    try {
      // Get current audio settings
      const audioSettings = await ipcRenderer.invoke('get-audio-settings');
      
      // Update equalizer settings
      audioSettings.equalizer = [...this.values];
      audioSettings.equalizerEnabled = this.isEnabled;
      
      // Save settings
      await ipcRenderer.invoke('update-audio-settings', audioSettings);
      
      // Update audio service
      if (this.audioService) {
        this.audioService.updateEqualizer(this.values, this.isEnabled);
      }
    } catch (error) {
      console.error('Error updating audio settings:', error);
    }
  }
  
  showSavePresetDialog() {
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>Save Equalizer Preset</h3>
          <button class="btn-text dialog-close">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="form-group">
            <label for="preset-name">Preset Name</label>
            <input type="text" id="preset-name" placeholder="Enter preset name">
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn-text cancel-btn">Cancel</button>
          <button class="btn save-btn">Save</button>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(dialog);
    
    // Set up event listeners
    dialog.querySelector('.dialog-close').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    dialog.querySelector('.save-btn').addEventListener('click', async () => {
      const name = dialog.querySelector('#preset-name').value.trim();
      
      if (!name) {
        alert('Please enter a preset name');
        return;
      }
      
      try {
        // Save preset
        const preset = await ipcRenderer.invoke('save-equalizer-preset', {
          name,
          values: [...this.values]
        });
        
        // Add to custom presets
        this.customPresets.push(preset);
        
        // Update preset select
        const presetSelect = this.element.querySelector('#eq-presets');
        const option = document.createElement('option');
        option.value = `custom-${preset.id}`;
        option.textContent = preset.name;
        presetSelect.appendChild(option);
        
        // Select new preset
        presetSelect.value = `custom-${preset.id}`;
        
        // Close dialog
        document.body.removeChild(dialog);
      } catch (error) {
        console.error('Error saving preset:', error);
        alert('Error saving preset');
      }
    });
  }
  
  cleanup() {
    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }
  }
}

module.exports = Equalizer;