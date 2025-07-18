// Advanced Audio Engine for PulseBeats
const { Howl, Howler } = require('howler');
const EventEmitter = require('events');

class AudioEngine extends EventEmitter {
  constructor() {
    super();
    
    // Core playback state
    this.currentTrack = null;
    this.sound = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Audio settings
    this.volume = 1.0;
    this.playbackSpeed = 1.0;
    this.pitch = 1.0;
    this.preampGain = 0;
    
    // Playback modes
    this.isShuffled = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.crossfadeDuration = 2;
    this.gaplessEnabled = true;
    this.volumeNormalization = false;
    
    // Advanced features
    this.bookmarks = new Map();
    this.lastPosition = 0;
    this.sleepTimer = null;
    this.fadeTimer = null;
    
    // Audio effects
    this.equalizerBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 10-band EQ
    this.bassBoost = 0;
    this.surroundEffect = false;
    this.reverbLevel = 0;
    this.monoMode = false;
    
    // Output settings
    this.outputDevice = 'default';
    this.hiResEnabled = true;
    
    // Supported formats
    this.supportedFormats = [
      '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', 
      '.alac', '.ape', '.wv', '.opus', '.wma'
    ];
    
    // Initialize global settings
    this.initializeAudio();
  }
  
  initializeAudio() {
    // Set global volume
    Howler.volume(this.volume);
    
    // Enable HTML5 audio for better format support
    Howler.html5PoolSize = 10;
    
    // Set up audio context for advanced features
    this.setupAudioContext();
  }
  
  setupAudioContext() {
    try {
      // Create audio context for advanced processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create nodes for effects
      this.createEffectNodes();
    } catch (error) {
      console.warn('Advanced audio features not available:', error);
    }
  }
  
  createEffectNodes() {
    if (!this.audioContext) return;
    
    // Create effect chain
    this.gainNode = this.audioContext.createGain();
    this.equalizerNodes = [];
    
    // Create 10-band equalizer
    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    
    frequencies.forEach((freq, index) => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = index === 0 ? 'lowshelf' : 
                   index === frequencies.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = this.equalizerBands[index];
      
      this.equalizerNodes.push(filter);
    });
    
    // Connect effect chain
    this.connectEffectChain();
  }
  
  connectEffectChain() {
    if (!this.audioContext || this.equalizerNodes.length === 0) return;
    
    // Connect equalizer nodes in series
    for (let i = 0; i < this.equalizerNodes.length - 1; i++) {
      this.equalizerNodes[i].connect(this.equalizerNodes[i + 1]);
    }
    
    // Connect to gain node and destination
    this.equalizerNodes[this.equalizerNodes.length - 1].connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }
  
  // 1. PLAYBACK FEATURES
  
  async loadTrack(track, autoPlay = false) {
    try {
      // Stop current track
      if (this.sound) {
        this.sound.unload();
      }
      
      this.currentTrack = track;
      this.emit('trackLoading', track);
      
      // Create new Howl instance
      this.sound = new Howl({
        src: [track.path],
        html5: this.hiResEnabled,
        preload: true,
        volume: this.volume,
        rate: this.playbackSpeed,
        onload: () => {
          this.emit('trackLoaded', track);
          if (autoPlay) {
            this.play();
          }
        },
        onplay: () => {
          this.isPlaying = true;
          this.isPaused = false;
          this.emit('playStateChanged', true);
          this.startTimeUpdates();
        },
        onpause: () => {
          this.isPlaying = false;
          this.isPaused = true;
          this.emit('playStateChanged', false);
          this.stopTimeUpdates();
        },
        onstop: () => {
          this.isPlaying = false;
          this.isPaused = false;
          this.emit('playStateChanged', false);
          this.stopTimeUpdates();
        },
        onend: () => {
          this.handleTrackEnd();
        },
        onloaderror: (id, error) => {
          this.emit('error', `Failed to load: ${track.title}`);
        },
        onplayerror: (id, error) => {
          this.emit('error', `Playback error: ${track.title}`);
        }
      });
      
      // Resume from last position if enabled
      if (this.lastPosition > 0 && track.resumePosition) {
        this.seek(track.resumePosition);
      }
      
    } catch (error) {
      this.emit('error', `Error loading track: ${error.message}`);
    }
  }
  
  play() {
    if (this.sound) {
      // Apply smart fade-in
      this.smartFadeIn();
      this.sound.play();
    }
  }
  
  pause() {
    if (this.sound && this.isPlaying) {
      // Apply smart fade-out
      this.smartFadeOut(() => {
        this.sound.pause();
      });
    }
  }
  
  stop() {
    if (this.sound) {
      this.sound.stop();
      this.lastPosition = 0;
    }
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  nextTrack() {
    if (this.playlist.length === 0) return;
    
    let nextIndex = this.getNextTrackIndex();
    this.playTrackAtIndex(nextIndex);
  }
  
  previousTrack() {
    if (this.playlist.length === 0) return;
    
    let prevIndex = this.getPreviousTrackIndex();
    this.playTrackAtIndex(prevIndex);
  }
  
  getNextTrackIndex() {
    if (this.isShuffled) {
      return Math.floor(Math.random() * this.playlist.length);
    }
    
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.playlist.length) {
      return this.repeatMode === 'all' ? 0 : this.currentIndex;
    }
    return nextIndex;
  }
  
  getPreviousTrackIndex() {
    if (this.isShuffled) {
      return Math.floor(Math.random() * this.playlist.length);
    }
    
    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      return this.repeatMode === 'all' ? this.playlist.length - 1 : 0;
    }
    return prevIndex;
  }
  
  playTrackAtIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      
      // Apply crossfade if enabled
      if (this.crossfadeDuration > 0 && this.isPlaying) {
        this.crossfadeToTrack(this.playlist[index]);
      } else {
        this.loadTrack(this.playlist[index], true);
      }
    }
  }
  
  crossfadeToTrack(newTrack) {
    if (!this.sound) {
      this.loadTrack(newTrack, true);
      return;
    }
    
    const currentVolume = this.volume;
    const fadeSteps = 20;
    const fadeInterval = (this.crossfadeDuration * 1000) / fadeSteps;
    let step = 0;
    
    // Fade out current track
    const fadeOut = setInterval(() => {
      step++;
      const newVolume = currentVolume * (1 - step / fadeSteps);
      this.sound.volume(Math.max(0, newVolume));
      
      if (step >= fadeSteps) {
        clearInterval(fadeOut);
        this.loadTrack(newTrack, true);
      }
    }, fadeInterval);
  }
  
  smartFadeIn() {
    if (!this.sound) return;
    
    const targetVolume = this.volume;
    const fadeSteps = 10;
    const fadeInterval = 100;
    let step = 0;
    
    this.sound.volume(0);
    
    const fadeIn = setInterval(() => {
      step++;
      const newVolume = targetVolume * (step / fadeSteps);
      this.sound.volume(Math.min(targetVolume, newVolume));
      
      if (step >= fadeSteps) {
        clearInterval(fadeIn);
      }
    }, fadeInterval);
  }
  
  smartFadeOut(callback) {
    if (!this.sound) {
      if (callback) callback();
      return;
    }
    
    const currentVolume = this.sound.volume();
    const fadeSteps = 10;
    const fadeInterval = 100;
    let step = 0;
    
    const fadeOut = setInterval(() => {
      step++;
      const newVolume = currentVolume * (1 - step / fadeSteps);
      this.sound.volume(Math.max(0, newVolume));
      
      if (step >= fadeSteps) {
        clearInterval(fadeOut);
        if (callback) callback();
        // Restore volume for next play
        setTimeout(() => {
          if (this.sound) this.sound.volume(this.volume);
        }, 100);
      }
    }, fadeInterval);
  }
  
  // Playback speed control
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.25, Math.min(4.0, speed));
    if (this.sound) {
      this.sound.rate(this.playbackSpeed);
    }
    this.emit('playbackSpeedChanged', this.playbackSpeed);
  }
  
  // Audio bookmarks
  addBookmark(name, position = null) {
    const pos = position || this.getCurrentTime();
    const bookmark = {
      name,
      position: pos,
      trackId: this.currentTrack?.id,
      timestamp: Date.now()
    };
    
    this.bookmarks.set(name, bookmark);
    this.emit('bookmarkAdded', bookmark);
    return bookmark;
  }
  
  jumpToBookmark(name) {
    const bookmark = this.bookmarks.get(name);
    if (bookmark && bookmark.trackId === this.currentTrack?.id) {
      this.seek(bookmark.position);
      this.emit('bookmarkJumped', bookmark);
    }
  }
  
  // Sleep timer
  setSleepTimer(minutes, fadeOut = true) {
    this.clearSleepTimer();
    
    const duration = minutes * 60 * 1000;
    
    this.sleepTimer = setTimeout(() => {
      if (fadeOut) {
        this.smartFadeOut(() => {
          this.pause();
          this.emit('sleepTimerTriggered');
        });
      } else {
        this.pause();
        this.emit('sleepTimerTriggered');
      }
    }, duration);
    
    this.emit('sleepTimerSet', minutes);
  }
  
  clearSleepTimer() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
      this.emit('sleepTimerCleared');
    }
  }
  
  // Volume and audio controls
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
    
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
    
    this.emit('volumeChanged', this.volume);
  }
  
  // Equalizer control
  setEqualizerBand(band, gain) {
    if (band >= 0 && band < this.equalizerBands.length) {
      this.equalizerBands[band] = Math.max(-12, Math.min(12, gain));
      
      if (this.equalizerNodes[band]) {
        this.equalizerNodes[band].gain.value = this.equalizerBands[band];
      }
      
      this.emit('equalizerChanged', this.equalizerBands);
    }
  }
  
  setEqualizerPreset(preset) {
    const presets = {
      flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rock: [4, 3, 0, 0, -2, 0, 2, 4, 4, 4],
      pop: [2, 4, 6, 4, 0, -2, -2, 2, 4, 4],
      jazz: [4, 2, 0, 2, 4, 4, 0, 2, 4, 6],
      classical: [6, 4, 2, 0, 0, 0, 2, 4, 6, 8],
      electronic: [6, 5, 0, -2, -4, -2, 0, 3, 5, 6],
      bass: [10, 8, 6, 4, 0, 0, 0, 0, 0, 0],
      vocal: [0, 0, 0, 3, 6, 6, 3, 0, 0, 0]
    };
    
    if (presets[preset]) {
      this.equalizerBands = [...presets[preset]];
      this.equalizerBands.forEach((gain, index) => {
        this.setEqualizerBand(index, gain);
      });
      this.emit('equalizerPresetApplied', preset);
    }
  }
  
  // Seek and position
  seek(position) {
    if (this.sound) {
      this.sound.seek(position);
      this.emit('seeked', position);
    }
  }
  
  getCurrentTime() {
    return this.sound ? (this.sound.seek() || 0) : 0;
  }
  
  getDuration() {
    return this.sound ? (this.sound.duration() || 0) : 0;
  }
  
  // Playlist management
  setPlaylist(tracks) {
    this.playlist = tracks;
    this.currentIndex = 0;
    this.emit('playlistChanged', tracks);
  }
  
  // Mode toggles
  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.emit('shuffleToggled', this.isShuffled);
    return this.isShuffled;
  }
  
  cycleRepeatMode() {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIndex + 1) % modes.length];
    this.emit('repeatModeChanged', this.repeatMode);
    return this.repeatMode;
  }
  
  // Handle track end
  handleTrackEnd() {
    this.isPlaying = false;
    this.isPaused = false;
    this.emit('playStateChanged', false);
    this.stopTimeUpdates();
    
    if (this.repeatMode === 'one') {
      this.play();
    } else {
      this.nextTrack();
    }
  }
  
  // Time updates
  startTimeUpdates() {
    this.stopTimeUpdates();
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.isPlaying) {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        
        this.emit('timeUpdate', {
          currentTime,
          duration,
          progress: duration > 0 ? currentTime / duration : 0
        });
        
        // Save position for resume
        this.lastPosition = currentTime;
      }
    }, 1000);
  }
  
  stopTimeUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
  
  // Get current state
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.volume,
      playbackSpeed: this.playbackSpeed,
      isShuffled: this.isShuffled,
      repeatMode: this.repeatMode,
      equalizerBands: [...this.equalizerBands],
      playlistLength: this.playlist.length,
      currentIndex: this.currentIndex
    };
  }
  
  // Cleanup
  destroy() {
    this.stopTimeUpdates();
    this.clearSleepTimer();
    
    if (this.sound) {
      this.sound.unload();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.removeAllListeners();
  }
}

module.exports = AudioEngine;