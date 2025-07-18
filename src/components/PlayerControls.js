// Advanced Player Controls Component
class PlayerControls {
  constructor(container, audioEngine) {
    this.container = container;
    this.audioEngine = audioEngine;
    this.currentTrack = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1.0;
    this.isShuffled = false;
    this.repeatMode = 'none';
    
    // UI elements
    this.elements = {};
    
    // Bind methods
    this.updateTimeDisplay = this.updateTimeDisplay.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    
    this.init();
    this.setupEventListeners();
  }
  
  init() {
    this.render();
    this.cacheElements();
    this.setupAudioEngineListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="player-controls-container">
        <!-- Now Playing Info -->
        <div class="now-playing-section">
          <div class="album-art-container">
            <img id="album-art" src="assets/images/default-album.png" alt="Album Art" class="album-art">
            <div class="album-art-overlay">
              <button id="btn-toggle-visualization" class="btn-icon" title="Toggle Visualization">
                📊
              </button>
            </div>
          </div>
          
          <div class="track-info">
            <div class="track-title" id="track-title">No Track Selected</div>
            <div class="track-artist" id="track-artist">-</div>
            <div class="track-album" id="track-album">-</div>
          </div>
          
          <div class="track-actions">
            <button id="btn-favorite" class="btn-icon" title="Add to Favorites">♡</button>
            <button id="btn-add-to-playlist" class="btn-icon" title="Add to Playlist">➕</button>
            <button id="btn-track-info" class="btn-icon" title="Track Information">ℹ️</button>
          </div>
        </div>
        
        <!-- Main Controls -->
        <div class="main-controls-section">
          <div class="playback-controls">
            <button id="btn-shuffle" class="btn-control ${this.isShuffled ? 'active' : ''}" title="Shuffle">
              🔀
            </button>
            <button id="btn-previous" class="btn-control" title="Previous Track">
              ⏮️
            </button>
            <button id="btn-play-pause" class="btn-control btn-play-pause" title="Play/Pause">
              ${this.isPlaying ? '⏸️' : '▶️'}
            </button>
            <button id="btn-next" class="btn-control" title="Next Track">
              ⏭️
            </button>
            <button id="btn-repeat" class="btn-control ${this.repeatMode !== 'none' ? 'active' : ''}" title="Repeat">
              ${this.getRepeatIcon()}
            </button>
          </div>
          
          <!-- Progress Bar -->
          <div class="progress-section">
            <span class="time-display" id="current-time">0:00</span>
            <div class="progress-container">
              <div class="progress-bar" id="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
                <div class="progress-handle" id="progress-handle"></div>
              </div>
              <div class="waveform-container" id="waveform-container" style="display: none;">
                <!-- Waveform visualization will be rendered here -->
              </div>
            </div>
            <span class="time-display" id="total-time">0:00</span>
          </div>
          
          <!-- Playback Speed Control -->
          <div class="speed-control">
            <label for="speed-slider">Speed:</label>
            <input type="range" id="speed-slider" min="0.25" max="4" step="0.25" value="1" class="speed-slider">
            <span id="speed-display">1.0x</span>
          </div>
        </div>
        
        <!-- Volume and Additional Controls -->
        <div class="volume-controls-section">
          <div class="volume-control">
            <button id="btn-mute" class="btn-icon" title="Mute/Unmute">
              🔊
            </button>
            <div class="volume-slider-container">
              <input type="range" id="volume-slider" min="0" max="100" value="100" class="volume-slider">
              <div class="volume-fill" id="volume-fill"></div>
            </div>
            <span class="volume-display" id="volume-display">100%</span>
          </div>
          
          <div class="additional-controls">
            <button id="btn-equalizer" class="btn-icon" title="Equalizer">
              🎛️
            </button>
            <button id="btn-effects" class="btn-icon" title="Audio Effects">
              🎵
            </button>
            <button id="btn-crossfade" class="btn-icon" title="Crossfade Settings">
              ⚡
            </button>
            <button id="btn-sleep-timer" class="btn-icon" title="Sleep Timer">
              ⏰
            </button>
            <button id="btn-bookmarks" class="btn-icon" title="Bookmarks">
              🔖
            </button>
          </div>
        </div>
        
        <!-- Advanced Controls Panel (Hidden by default) -->
        <div class="advanced-controls-panel" id="advanced-controls" style="display: none;">
          <!-- Equalizer -->
          <div class="equalizer-section">
            <h4>10-Band Equalizer</h4>
            <div class="equalizer-controls">
              ${this.renderEqualizer()}
            </div>
            <div class="equalizer-presets">
              <select id="eq-preset-select">
                <option value="">Select Preset</option>
                <option value="flat">Flat</option>
                <option value="rock">Rock</option>
                <option value="pop">Pop</option>
                <option value="jazz">Jazz</option>
                <option value="classical">Classical</option>
                <option value="electronic">Electronic</option>
                <option value="bass">Bass Boost</option>
                <option value="vocal">Vocal</option>
              </select>
              <button id="btn-save-preset" class="btn-small">Save</button>
              <button id="btn-reset-eq" class="btn-small">Reset</button>
            </div>
          </div>
          
          <!-- Audio Effects -->
          <div class="effects-section">
            <h4>Audio Effects</h4>
            <div class="effect-controls">
              <div class="effect-control">
                <label for="bass-boost">Bass Boost:</label>
                <input type="range" id="bass-boost" min="0" max="20" value="0" class="effect-slider">
                <span class="effect-value">0 dB</span>
              </div>
              <div class="effect-control">
                <label for="surround-effect">3D Surround:</label>
                <input type="checkbox" id="surround-effect" class="effect-toggle">
              </div>
              <div class="effect-control">
                <label for="reverb-level">Reverb:</label>
                <input type="range" id="reverb-level" min="0" max="100" value="0" class="effect-slider">
                <span class="effect-value">0%</span>
              </div>
              <div class="effect-control">
                <label for="mono-mode">Mono Mode:</label>
                <input type="checkbox" id="mono-mode" class="effect-toggle">
              </div>
            </div>
          </div>
          
          <!-- Crossfade Settings -->
          <div class="crossfade-section">
            <h4>Crossfade & Gapless</h4>
            <div class="crossfade-controls">
              <div class="control-group">
                <label for="crossfade-duration">Crossfade Duration:</label>
                <input type="range" id="crossfade-duration" min="0" max="12" step="0.5" value="2" class="crossfade-slider">
                <span class="crossfade-value">2.0s</span>
              </div>
              <div class="control-group">
                <label for="gapless-playback">Gapless Playback:</label>
                <input type="checkbox" id="gapless-playback" checked class="gapless-toggle">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderEqualizer() {
    const frequencies = [60, 170, 310, 600, '1K', '3K', '6K', '12K', '14K', '16K'];
    let html = '';
    
    frequencies.forEach((freq, index) => {
      html += `
        <div class="eq-band">
          <input type="range" 
                 class="eq-slider" 
                 data-band="${index}" 
                 min="-12" 
                 max="12" 
                 step="1" 
                 value="0" 
                 orient="vertical">
          <div class="eq-value">0 dB</div>
          <div class="eq-freq">${freq}${typeof freq === 'number' ? ' Hz' : ''}</div>
        </div>
      `;
    });
    
    return html;
  }
  
  cacheElements() {
    // Cache frequently used elements
    this.elements = {
      // Track info
      albumArt: document.getElementById('album-art'),
      trackTitle: document.getElementById('track-title'),
      trackArtist: document.getElementById('track-artist'),
      trackAlbum: document.getElementById('track-album'),
      
      // Controls
      btnPlayPause: document.getElementById('btn-play-pause'),
      btnPrevious: document.getElementById('btn-previous'),
      btnNext: document.getElementById('btn-next'),
      btnShuffle: document.getElementById('btn-shuffle'),
      btnRepeat: document.getElementById('btn-repeat'),
      
      // Progress
      progressBar: document.getElementById('progress-bar'),
      progressFill: document.getElementById('progress-fill'),
      progressHandle: document.getElementById('progress-handle'),
      currentTime: document.getElementById('current-time'),
      totalTime: document.getElementById('total-time'),
      
      // Volume
      btnMute: document.getElementById('btn-mute'),
      volumeSlider: document.getElementById('volume-slider'),
      volumeFill: document.getElementById('volume-fill'),
      volumeDisplay: document.getElementById('volume-display'),
      
      // Speed
      speedSlider: document.getElementById('speed-slider'),
      speedDisplay: document.getElementById('speed-display'),
      
      // Advanced controls
      advancedControls: document.getElementById('advanced-controls'),
      btnEqualizer: document.getElementById('btn-equalizer'),
      
      // Favorites and actions
      btnFavorite: document.getElementById('btn-favorite'),
      btnAddToPlaylist: document.getElementById('btn-add-to-playlist'),
      btnTrackInfo: document.getElementById('btn-track-info')
    };
  }
  
  setupEventListeners() {
    // Playback controls
    this.elements.btnPlayPause.addEventListener('click', () => {
      this.audioEngine.togglePlayPause();
    });
    
    this.elements.btnPrevious.addEventListener('click', () => {
      this.audioEngine.previousTrack();
    });
    
    this.elements.btnNext.addEventListener('click', () => {
      this.audioEngine.nextTrack();
    });
    
    this.elements.btnShuffle.addEventListener('click', () => {
      this.isShuffled = this.audioEngine.toggleShuffle();
      this.elements.btnShuffle.classList.toggle('active', this.isShuffled);
    });
    
    this.elements.btnRepeat.addEventListener('click', () => {
      this.repeatMode = this.audioEngine.cycleRepeatMode();
      this.elements.btnRepeat.classList.toggle('active', this.repeatMode !== 'none');
      this.elements.btnRepeat.innerHTML = this.getRepeatIcon();
    });
    
    // Progress bar
    this.setupProgressBarListeners();
    
    // Volume control
    this.setupVolumeListeners();
    
    // Speed control
    this.elements.speedSlider.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      this.audioEngine.setPlaybackSpeed(speed);
      this.elements.speedDisplay.textContent = speed.toFixed(1) + 'x';
    });
    
    // Advanced controls toggle
    this.elements.btnEqualizer.addEventListener('click', () => {
      this.toggleAdvancedControls();
    });
    
    // Equalizer controls
    this.setupEqualizerListeners();
    
    // Track actions
    this.elements.btnFavorite.addEventListener('click', () => {
      this.toggleFavorite();
    });
    
    this.elements.btnAddToPlaylist.addEventListener('click', () => {
      this.showAddToPlaylistDialog();
    });
    
    this.elements.btnTrackInfo.addEventListener('click', () => {
      this.showTrackInfoDialog();
    });
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
  
  setupProgressBarListeners() {
    let isDragging = false;
    
    const handleProgressClick = (e) => {
      const rect = this.elements.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * this.duration;
      this.audioEngine.seek(newTime);
    };
    
    const handleProgressDrag = (e) => {
      if (!isDragging) return;
      handleProgressClick(e);
    };
    
    this.elements.progressBar.addEventListener('click', handleProgressClick);
    
    this.elements.progressHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', handleProgressDrag);
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  setupVolumeListeners() {
    this.elements.volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      this.setVolume(volume);
    });
    
    this.elements.btnMute.addEventListener('click', () => {
      this.toggleMute();
    });
  }
  
  setupEqualizerListeners() {
    // EQ sliders
    document.querySelectorAll('.eq-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const band = parseInt(e.target.dataset.band);
        const gain = parseInt(e.target.value);
        
        // Update display
        const valueDisplay = e.target.parentNode.querySelector('.eq-value');
        valueDisplay.textContent = gain + ' dB';
        
        // Update audio engine
        this.audioEngine.setEqualizerBand(band, gain);
      });
    });
    
    // EQ presets
    const presetSelect = document.getElementById('eq-preset-select');
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.audioEngine.setEqualizerPreset(e.target.value);
        this.updateEqualizerDisplay();
      }
    });
    
    // Reset EQ
    document.getElementById('btn-reset-eq').addEventListener('click', () => {
      this.audioEngine.setEqualizerPreset('flat');
      this.updateEqualizerDisplay();
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.audioEngine.togglePlayPause();
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.audioEngine.nextTrack();
          } else {
            e.preventDefault();
            this.audioEngine.seek(this.currentTime + 10);
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.audioEngine.previousTrack();
          } else {
            e.preventDefault();
            this.audioEngine.seek(Math.max(0, this.currentTime - 10));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.setVolume(Math.min(1, this.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.setVolume(Math.max(0, this.volume - 0.1));
          break;
        case 'KeyM':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleMute();
          }
          break;
        case 'KeyS':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.audioEngine.toggleShuffle();
          }
          break;
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.audioEngine.cycleRepeatMode();
          }
          break;
      }
    });
  }
  
  setupAudioEngineListeners() {
    this.audioEngine.on('trackLoaded', (track) => {
      this.updateTrackInfo(track);
    });
    
    this.audioEngine.on('playStateChanged', (isPlaying) => {
      this.updatePlayButton(isPlaying);
    });
    
    this.audioEngine.on('timeUpdate', (timeInfo) => {
      this.updateTimeDisplay(timeInfo);
      this.updateProgress(timeInfo);
    });
    
    this.audioEngine.on('volumeChanged', (volume) => {
      this.updateVolumeDisplay(volume);
    });
    
    this.audioEngine.on('equalizerChanged', (bands) => {
      this.updateEqualizerDisplay(bands);
    });
  }
  
  // UI Update Methods
  
  updateTrackInfo(track) {
    this.currentTrack = track;
    this.elements.trackTitle.textContent = track.title;
    this.elements.trackArtist.textContent = track.artist;
    this.elements.trackAlbum.textContent = track.album;
    
    // Update album art
    if (track.albumArt) {
      this.elements.albumArt.src = track.albumArt;
    } else {
      this.elements.albumArt.src = 'assets/images/default-album.png';
    }
    
    // Update favorite button
    this.updateFavoriteButton(track.id);
  }
  
  updatePlayButton(isPlaying) {
    this.isPlaying = isPlaying;
    this.elements.btnPlayPause.innerHTML = isPlaying ? '⏸️' : '▶️';
    this.elements.btnPlayPause.title = isPlaying ? 'Pause' : 'Play';
  }
  
  updateTimeDisplay(timeInfo) {
    this.currentTime = timeInfo.currentTime;
    this.duration = timeInfo.duration;
    
    this.elements.currentTime.textContent = this.formatTime(timeInfo.currentTime);
    this.elements.totalTime.textContent = this.formatTime(timeInfo.duration);
  }
  
  updateProgress(timeInfo) {
    const progress = timeInfo.progress * 100;
    this.elements.progressFill.style.width = progress + '%';
    this.elements.progressHandle.style.left = progress + '%';
  }
  
  updateVolumeDisplay(volume) {
    this.volume = volume;
    const volumePercent = Math.round(volume * 100);
    
    this.elements.volumeSlider.value = volumePercent;
    this.elements.volumeFill.style.width = volumePercent + '%';
    this.elements.volumeDisplay.textContent = volumePercent + '%';
    
    // Update mute button
    this.elements.btnMute.innerHTML = volume === 0 ? '🔇' : 
                                     volume < 0.5 ? '🔉' : '🔊';
  }
  
  updateEqualizerDisplay(bands) {
    if (!bands) {
      bands = this.audioEngine.equalizerBands;
    }
    
    document.querySelectorAll('.eq-slider').forEach((slider, index) => {
      slider.value = bands[index];
      const valueDisplay = slider.parentNode.querySelector('.eq-value');
      valueDisplay.textContent = bands[index] + ' dB';
    });
  }
  
  updateFavoriteButton(trackId) {
    // This would check if track is in favorites
    // Implementation depends on your favorites system
    const isFavorite = false; // Placeholder
    this.elements.btnFavorite.innerHTML = isFavorite ? '♥' : '♡';
    this.elements.btnFavorite.classList.toggle('active', isFavorite);
  }
  
  // Utility Methods
  
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  getRepeatIcon() {
    switch (this.repeatMode) {
      case 'one': return '🔂';
      case 'all': return '🔁';
      default: return '🔁';
    }
  }
  
  setVolume(volume) {
    this.audioEngine.setVolume(volume);
  }
  
  toggleMute() {
    if (this.volume > 0) {
      this.previousVolume = this.volume;
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume || 0.5);
    }
  }
  
  toggleAdvancedControls() {
    const panel = this.elements.advancedControls;
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
    this.elements.btnEqualizer.classList.toggle('active', !isVisible);
  }
  
  toggleFavorite() {
    if (this.currentTrack) {
      // Implementation depends on your favorites system
      console.log('Toggle favorite for:', this.currentTrack.id);
    }
  }
  
  showAddToPlaylistDialog() {
    if (this.currentTrack) {
      // Implementation for add to playlist dialog
      console.log('Add to playlist:', this.currentTrack.id);
    }
  }
  
  showTrackInfoDialog() {
    if (this.currentTrack) {
      // Implementation for track info dialog
      console.log('Show track info:', this.currentTrack);
    }
  }
  
  // Public API
  
  loadTrack(track) {
    this.audioEngine.loadTrack(track);
  }
  
  setPlaylist(tracks) {
    this.audioEngine.setPlaylist(tracks);
  }
  
  destroy() {
    // Cleanup event listeners and references
    this.audioEngine.removeAllListeners();
  }
}

module.exports = PlayerControls;