// Sleep Timer component - Handles sleep timer functionality
const { ipcRenderer } = require('electron');

class SleepTimer {
  constructor() {
    this.isActive = false;
    this.duration = 30; // Default duration in minutes
    this.fadeOut = true; // Default fade out setting
    this.remainingTime = 0;
    this.updateInterval = null;
    this.onTimerUpdate = null;
    this.onTimerEnd = null;
  }
  
  async initialize() {
    try {
      // Load sleep timer settings
      const settings = await ipcRenderer.invoke('get-sleep-timer');
      
      this.isActive = settings.enabled;
      this.duration = settings.duration;
      this.fadeOut = settings.fadeOut;
      
      // Set up event listeners
      ipcRenderer.on('sleep-timer-triggered', () => {
        this.isActive = false;
        
        if (this.onTimerEnd) {
          this.onTimerEnd();
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing sleep timer:', error);
      return false;
    }
  }
  
  async start(duration, fadeOut) {
    try {
      this.duration = duration || this.duration;
      this.fadeOut = fadeOut !== undefined ? fadeOut : this.fadeOut;
      
      // Set sleep timer
      await ipcRenderer.invoke('set-sleep-timer', {
        duration: this.duration,
        fadeOut: this.fadeOut
      });
      
      this.isActive = true;
      this.remainingTime = this.duration * 60; // Convert to seconds
      
      // Start update interval
      this.startUpdateInterval();
      
      return true;
    } catch (error) {
      console.error('Error starting sleep timer:', error);
      return false;
    }
  }
  
  async cancel() {
    try {
      // Cancel sleep timer
      await ipcRenderer.invoke('cancel-sleep-timer');
      
      this.isActive = false;
      
      // Clear update interval
      this.clearUpdateInterval();
      
      return true;
    } catch (error) {
      console.error('Error canceling sleep timer:', error);
      return false;
    }
  }
  
  startUpdateInterval() {
    // Clear existing interval
    this.clearUpdateInterval();
    
    // Set up new interval
    this.updateInterval = setInterval(() => {
      this.remainingTime--;
      
      if (this.remainingTime <= 0) {
        this.clearUpdateInterval();
      }
      
      if (this.onTimerUpdate) {
        this.onTimerUpdate(this.remainingTime);
      }
    }, 1000);
  }
  
  clearUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  getFormattedRemainingTime() {
    const hours = Math.floor(this.remainingTime / 3600);
    const minutes = Math.floor((this.remainingTime % 3600) / 60);
    const seconds = this.remainingTime % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  isTimerActive() {
    return this.isActive;
  }
  
  setTimerUpdateCallback(callback) {
    this.onTimerUpdate = callback;
  }
  
  setTimerEndCallback(callback) {
    this.onTimerEnd = callback;
  }
  
  cleanup() {
    this.clearUpdateInterval();
  }
}

module.exports = SleepTimer;