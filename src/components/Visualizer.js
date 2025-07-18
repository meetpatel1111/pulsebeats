// Visualizer component - Renders audio visualizations
const visualizationService = require('../services/visualizationService');
const { ipcRenderer } = require('electron');

class Visualizer {
  constructor(container, audioElement) {
    this.container = container;
    this.audioElement = audioElement;
    this.canvas = null;
    this.isActive = false;
    this.settings = {
      type: 'spectrum',
      sensitivity: 0.8,
      colorScheme: 'dynamic'
    };
  }
  
  async initialize() {
    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'visualizer-canvas';
      this.container.appendChild(this.canvas);
      
      // Set initial size
      this.resize();
      
      // Load settings
      const settings = await ipcRenderer.invoke('get-visualization-settings');
      this.settings = { ...this.settings, ...settings };
      
      // Initialize visualization service
      await visualizationService.initialize(this.audioElement, this.canvas);
      visualizationService.updateSettings(this.settings);
      
      // Set up event listeners
      window.addEventListener('resize', () => this.resize());
      
      // Set up mutation observer to detect when container becomes visible
      this.observer = new MutationObserver(() => {
        if (this.container.offsetParent !== null && !this.isActive && this.settings.enabled) {
          this.start();
        } else if (this.container.offsetParent === null && this.isActive) {
          this.stop();
        }
      });
      
      this.observer.observe(this.container, { 
        attributes: true, 
        attributeFilter: ['style', 'class'] 
      });
      
      // Start if container is visible and enabled
      if (this.container.offsetParent !== null && this.settings.enabled) {
        this.start();
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing visualizer:', error);
      return false;
    }
  }
  
  start() {
    if (!this.isActive) {
      visualizationService.start();
      this.isActive = true;
    }
  }
  
  stop() {
    if (this.isActive) {
      visualizationService.stop();
      this.isActive = false;
    }
  }
  
  resize() {
    if (!this.canvas) return;
    
    // Get the container dimensions
    const rect = this.container.getBoundingClientRect();
    
    // Set canvas dimensions to match container
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Update visualization service
    visualizationService.resize();
  }
  
  async updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    
    // Update visualization service
    visualizationService.updateSettings(this.settings);
    
    // Save settings
    await ipcRenderer.invoke('update-visualization-settings', this.settings);
    
    // Start or stop based on enabled setting
    if (this.settings.enabled && this.container.offsetParent !== null && !this.isActive) {
      this.start();
    } else if (!this.settings.enabled && this.isActive) {
      this.stop();
    }
    
    return this.settings;
  }
  
  setAlbumColors(colors) {
    visualizationService.setAlbumColors(colors);
  }
  
  cleanup() {
    this.stop();
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.canvas && this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
    
    visualizationService.cleanup();
  }
}

module.exports = Visualizer;