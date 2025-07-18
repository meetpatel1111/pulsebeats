// Audio Player Component using Howler.js
const { Howl, Howler } = require('howler');

class AudioPlayer {
  constructor() {
    this.currentTrack = null;
    this.sound = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.volume = 1.0;
    this.isShuffled = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.crossfadeDuration = 2; // seconds
    
    // Event callbacks
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onTimeUpdate = null;
    this.onVolumeChange = null;
    this.onError = null;
    
    // Set up global volume
    Howler.volume(this.volume);
  }
  
  // Load a track
  loadTrack(track) {
    if (this.sound) {
      this.sound.unload();
    }
    
    this.currentTrack = track;
    
    try {
      this.sound = new Howl({
        src: [track.path],
        html5: true, // Use HTML5 Audio for better compatibility
        preload: true,
        volume: this.volume,
        onload: () => {
          console.log('Track loaded:', track.title);
          if (this.onTrackChange) {
            this.onTrackChange(track);
          }
        },
        onplay: () => {
          this.isPlaying = true;
          this.isPaused = false;
          if (this.onPlayStateChange) {
            this.onPlayStateChange(true);
          }
          this.startTimeUpdates();
        },
        onpause: () => {
          this.isPlaying = false;
          this.isPaused = true;
          if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
          }
          this.stopTimeUpdates();
        },
        onstop: () => {
          this.isPlaying = false;
          this.isPaused = false;
          if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
          }
          this.stopTimeUpdates();
        },
        onend: () => {
          this.isPlaying = false;
          this.isPaused = false;
          if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
          }
          this.stopTimeUpdates();
          this.handleTrackEnd();
        },
        onloaderror: (id, error) => {
          console.error('Error loading track:', error);
          if (this.onError) {
            this.onError(`Failed to load track: ${track.title}`);
          }
        },
        onplayerror: (id, error) => {
          console.error('Error playing track:', error);
          if (this.onError) {
            this.onError(`Failed to play track: ${track.title}`);
          }
        }
      });
    } catch (error) {
      console.error('Error creating Howl instance:', error);
      if (this.onError) {
        this.onError(`Failed to create audio player for: ${track.title}`);
      }
    }
  }
  
  // Play current track
  play() {
    if (this.sound) {
      if (this.isPaused) {
        this.sound.play();
      } else {
        this.sound.play();
      }
    }
  }
  
  // Pause current track
  pause() {
    if (this.sound && this.isPlaying) {
      this.sound.pause();
    }
  }
  
  // Stop current track
  stop() {
    if (this.sound) {
      this.sound.stop();
    }
  }
  
  // Toggle play/pause
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  // Set volume (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
    
    if (this.onVolumeChange) {
      this.onVolumeChange(this.volume);
    }
  }
  
  // Get current volume
  getVolume() {
    return this.volume;
  }
  
  // Seek to position (in seconds)
  seek(position) {
    if (this.sound) {
      this.sound.seek(position);
    }
  }
  
  // Get current position (in seconds)
  getCurrentTime() {
    if (this.sound) {
      return this.sound.seek() || 0;
    }
    return 0;
  }
  
  // Get track duration (in seconds)
  getDuration() {
    if (this.sound) {
      return this.sound.duration() || 0;
    }
    return 0;
  }
  
  // Set playlist
  setPlaylist(tracks) {
    this.playlist = tracks;
    this.currentIndex = 0;
  }
  
  // Play track by index
  playTrackAtIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      this.loadTrack(this.playlist[index]);
      this.play();
    }
  }
  
  // Play next track
  nextTrack() {
    if (this.playlist.length === 0) return;
    
    let nextIndex;
    
    if (this.isShuffled) {
      // Random next track
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      // Sequential next track
      nextIndex = this.currentIndex + 1;
      
      if (nextIndex >= this.playlist.length) {
        if (this.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return; // End of playlist
        }
      }
    }
    
    this.playTrackAtIndex(nextIndex);
  }
  
  // Play previous track
  previousTrack() {
    if (this.playlist.length === 0) return;
    
    let prevIndex;
    
    if (this.isShuffled) {
      // Random previous track
      prevIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      // Sequential previous track
      prevIndex = this.currentIndex - 1;
      
      if (prevIndex < 0) {
        if (this.repeatMode === 'all') {
          prevIndex = this.playlist.length - 1;
        } else {
          prevIndex = 0;
        }
      }
    }
    
    this.playTrackAtIndex(prevIndex);
  }
  
  // Handle track end
  handleTrackEnd() {
    if (this.repeatMode === 'one') {
      // Repeat current track
      this.play();
    } else {
      // Move to next track
      this.nextTrack();
    }
  }
  
  // Toggle shuffle
  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    return this.isShuffled;
  }
  
  // Set repeat mode
  setRepeatMode(mode) {
    const validModes = ['none', 'one', 'all'];
    if (validModes.includes(mode)) {
      this.repeatMode = mode;
    }
    return this.repeatMode;
  }
  
  // Cycle through repeat modes
  cycleRepeatMode() {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(this.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.repeatMode = modes[nextIndex];
    return this.repeatMode;
  }
  
  // Start time updates
  startTimeUpdates() {
    this.stopTimeUpdates(); // Clear any existing interval
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.isPlaying && this.onTimeUpdate) {
        this.onTimeUpdate({
          currentTime: this.getCurrentTime(),
          duration: this.getDuration()
        });
      }
    }, 1000);
  }
  
  // Stop time updates
  stopTimeUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
  
  // Get current track info
  getCurrentTrack() {
    return this.currentTrack;
  }
  
  // Get player state
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.volume,
      isShuffled: this.isShuffled,
      repeatMode: this.repeatMode,
      playlistLength: this.playlist.length,
      currentIndex: this.currentIndex
    };
  }
  
  // Cleanup
  destroy() {
    this.stopTimeUpdates();
    
    if (this.sound) {
      this.sound.unload();
      this.sound = null;
    }
    
    this.currentTrack = null;
    this.playlist = [];
  }
}

module.exports = AudioPlayer;