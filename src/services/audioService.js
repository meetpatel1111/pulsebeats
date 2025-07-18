// Audio Service - Handles audio playback functionality
const { ipcRenderer } = require('electron');
const { Howl, Howler } = require('howler');

class AudioService {
  constructor() {
    this.currentSound = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.volume = 1.0;
    this.isMuted = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.isShuffled = false;
    this.originalPlaylist = [];
    this.listeners = {};
    
    // Get audio settings from main process
    this.loadSettings();
  }
  
  async loadSettings() {
    const settings = await ipcRenderer.invoke('get-audio-settings');
    this.volume = settings.volume;
    Howler.volume(this.volume);
    
    // Apply equalizer settings if available
    if (settings.equalizer) {
      // Future implementation for equalizer
    }
  }
  
  loadTrack(track) {
    // Stop current track if playing
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.unload();
      this.currentSound = null;
    }
    
    // Create new Howl instance for the track
    this.currentSound = new Howl({
      src: [track.path],
      html5: true, // Enable streaming for large files
      volume: this.volume,
      onplay: () => {
        this.isPlaying = true;
        this.emit('playStateChanged', { isPlaying: true, track });
        this.startProgressUpdates();
      },
      onpause: () => {
        this.isPlaying = false;
        this.emit('playStateChanged', { isPlaying: false, track });
        this.stopProgressUpdates();
      },
      onstop: () => {
        this.isPlaying = false;
        this.emit('playStateChanged', { isPlaying: false, track });
        this.stopProgressUpdates();
      },
      onend: () => {
        this.handleTrackEnd();
      },
      onloaderror: (id, error) => {
        console.error('Error loading audio:', error);
        this.emit('error', { message: 'Failed to load audio file', details: error });
        this.playNext(); // Skip to next track on error
      },
      onplayerror: (id, error) => {
        console.error('Error playing audio:', error);
        this.emit('error', { message: 'Failed to play audio file', details: error });
        this.playNext(); // Skip to next track on error
      }
    });
    
    return this.currentSound;
  }
  
  setPlaylist(tracks, startIndex = 0) {
    this.originalPlaylist = [...tracks];
    this.playlist = this.isShuffled ? this.shuffleArray([...tracks]) : [...tracks];
    this.currentIndex = startIndex;
  }
  
  play(trackOrIndex = null) {
    // If a track or index is provided, load that track
    if (trackOrIndex !== null) {
      if (typeof trackOrIndex === 'number') {
        // Play track at specified index
        if (trackOrIndex >= 0 && trackOrIndex < this.playlist.length) {
          this.currentIndex = trackOrIndex;
          this.loadTrack(this.playlist[this.currentIndex]);
        } else {
          return false;
        }
      } else {
        // Play the provided track object
        const index = this.playlist.findIndex(t => t.id === trackOrIndex.id);
        if (index !== -1) {
          this.currentIndex = index;
          this.loadTrack(trackOrIndex);
        } else {
          // Track not in playlist, add it
          this.playlist.push(trackOrIndex);
          this.currentIndex = this.playlist.length - 1;
          this.loadTrack(trackOrIndex);
        }
      }
    } else if (!this.currentSound && this.playlist.length > 0) {
      // No current sound, load the track at current index
      this.loadTrack(this.playlist[this.currentIndex]);
    }
    
    // Play the sound
    if (this.currentSound) {
      this.currentSound.play();
      return true;
    }
    
    return false;
  }
  
  pause() {
    if (this.currentSound) {
      this.currentSound.pause();
    }
  }
  
  stop() {
    if (this.currentSound) {
      this.currentSound.stop();
    }
  }
  
  togglePlayPause() {
    if (!this.currentSound && this.playlist.length > 0) {
      return this.play();
    }
    
    if (this.currentSound) {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
      return true;
    }
    
    return false;
  }
  
  playNext() {
    if (this.playlist.length === 0) return false;
    
    let nextIndex;
    
    if (this.repeatMode === 'one') {
      // Repeat current track
      nextIndex = this.currentIndex;
    } else {
      // Move to next track
      nextIndex = (this.currentIndex + 1) % this.playlist.length;
      
      // If we've reached the end and repeat is off, stop playback
      if (nextIndex === 0 && this.repeatMode === 'none') {
        this.stop();
        this.emit('playlistEnded');
        return false;
      }
    }
    
    this.currentIndex = nextIndex;
    return this.play();
  }
  
  playPrevious() {
    if (this.playlist.length === 0) return false;
    
    // If current track has played for more than 3 seconds, restart it
    if (this.currentSound && this.currentSound.seek() > 3) {
      this.currentSound.seek(0);
      return true;
    }
    
    // Otherwise go to previous track
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    return this.play();
  }
  
  seek(position) {
    if (this.currentSound) {
      this.currentSound.seek(position);
      this.emit('progressChanged', {
        currentTime: this.currentSound.seek(),
        duration: this.currentSound.duration()
      });
    }
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
    this.isMuted = (this.volume === 0);
    
    // Save volume setting
    const settings = ipcRenderer.invoke('get-audio-settings').then(settings => {
      settings.volume = this.volume;
      ipcRenderer.invoke('update-audio-settings', settings);
    });
    
    this.emit('volumeChanged', { volume: this.volume, isMuted: this.isMuted });
  }
  
  toggleMute() {
    if (this.isMuted) {
      // Unmute
      this.isMuted = false;
      Howler.volume(this.volume);
    } else {
      // Mute
      this.isMuted = true;
      Howler.volume(0);
    }
    
    this.emit('volumeChanged', { volume: this.isMuted ? 0 : this.volume, isMuted: this.isMuted });
  }
  
  setRepeatMode(mode) {
    if (['none', 'one', 'all'].includes(mode)) {
      this.repeatMode = mode;
      this.emit('repeatModeChanged', { mode: this.repeatMode });
    }
  }
  
  toggleRepeatMode() {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(this.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.repeatMode = modes[nextIndex];
    this.emit('repeatModeChanged', { mode: this.repeatMode });
  }
  
  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    
    if (this.isShuffled) {
      // Save current track
      const currentTrack = this.playlist[this.currentIndex];
      
      // Shuffle playlist
      this.playlist = this.shuffleArray([...this.originalPlaylist]);
      
      // Find new index of current track
      this.currentIndex = this.playlist.findIndex(t => t.id === currentTrack.id);
      if (this.currentIndex === -1) this.currentIndex = 0;
    } else {
      // Save current track
      const currentTrack = this.playlist[this.currentIndex];
      
      // Restore original playlist
      this.playlist = [...this.originalPlaylist];
      
      // Find new index of current track
      this.currentIndex = this.playlist.findIndex(t => t.id === currentTrack.id);
      if (this.currentIndex === -1) this.currentIndex = 0;
    }
    
    this.emit('shuffleChanged', { isShuffled: this.isShuffled });
  }
  
  getCurrentTrack() {
    return this.playlist[this.currentIndex] || null;
  }
  
  getProgress() {
    if (!this.currentSound) return { currentTime: 0, duration: 0, percent: 0 };
    
    const currentTime = this.currentSound.seek();
    const duration = this.currentSound.duration();
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    return { currentTime, duration, percent };
  }
  
  startProgressUpdates() {
    this.stopProgressUpdates();
    this.progressInterval = setInterval(() => {
      if (this.currentSound && this.isPlaying) {
        this.emit('progressChanged', this.getProgress());
      }
    }, 1000);
  }
  
  stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  
  handleTrackEnd() {
    this.isPlaying = false;
    this.stopProgressUpdates();
    
    // Handle repeat modes
    if (this.repeatMode === 'one') {
      // Repeat current track
      this.seek(0);
      this.play();
    } else if (this.repeatMode === 'all' || this.currentIndex < this.playlist.length - 1) {
      // Play next track
      this.playNext();
    } else {
      // End of playlist and no repeat
      this.emit('playlistEnded');
    }
  }
  
  // Event handling
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
  
  // Utility functions
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

// Export singleton instance
const audioService = new AudioService();
module.exports = audioService;