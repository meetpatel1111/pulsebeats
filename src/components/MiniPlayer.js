// Floating Mini Player Component
class MiniPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.isVisible = false;
    this.isDragging = false;
    this.isMinimized = false;
    this.position = { x: window.innerWidth - 320, y: 100 };
    this.size = { width: 300, height: 120 };
    
    this.currentTrack = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    
    this.createElement();
    this.setupEventListeners();
    this.setupAudioEngineListeners();
  }
  
  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'mini-player';
    this.element.innerHTML = `
      <div class="mini-player-header">
        <div class="mini-player-drag-handle"></div>
        <div class="mini-player-controls">
          <button class="mini-player-btn" id="mini-minimize" title="Minimize">−</button>
          <button class="mini-player-btn" id="mini-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="mini-player-content">
        <div class="mini-player-art">
          <img id="mini-album-art" src="assets/images/default-album.png" alt="Album Art">
          <div class="mini-player-overlay">
            <button class="mini-play-btn" id="mini-play-pause">▶️</button>
          </div>
        </div>
        
        <div class="mini-player-info">
          <div class="mini-track-title" id="mini-track-title">No Track</div>
          <div class="mini-track-artist" id="mini-track-artist">Unknown Artist</div>
          
          <div class="mini-progress-container">
            <div class="mini-progress-bar" id="mini-progress-bar">
              <div class="mini-progress-fill" id="mini-progress-fill"></div>
            </div>
            <div class="mini-time-display">
              <span id="mini-current-time">0:00</span>
              <span id="mini-total-time">0:00</span>
            </div>
          </div>
        </div>
        
        <div class="mini-player-actions">
          <button class="mini-action-btn" id="mini-previous" title="Previous">⏮️</button>
          <button class="mini-action-btn" id="mini-next" title="Next">⏭️</button>
          <button class="mini-action-btn" id="mini-volume" title="Volume">🔊</button>
        </div>
      </div>
      
      <div class="mini-player-minimized" style="display: none;">
        <div class="mini-minimized-content">
          <img id="mini-minimized-art" src="assets/images/default-album.png" alt="Album Art">
          <button class="mini-minimized-play" id="mini-minimized-play-pause">▶️</button>
        </div>
      </div>
    `;
    
    // Apply initial styles
    this.updatePosition();
    this.updateSize();
    
    document.body.appendChild(this.element);
  }
  
  setupEventListeners() {
    // Drag functionality
    const dragHandle = this.element.querySelector('.mini-player-drag-handle');
    const header = this.element.querySelector('.mini-player-header');
    
    let startX, startY, startPosX, startPosY;
    
    const startDrag = (e) => {
      this.isDragging = true;
      startX = e.clientX || e.touches[0].clientX;
      startY = e.clientY || e.touches[0].clientY;
      startPosX = this.position.x;
      startPosY = this.position.y;
      
      this.element.classList.add('dragging');
      e.preventDefault();
    };
    
    const drag = (e) => {
      if (!this.isDragging) return;
      
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      this.position.x = startPosX + (clientX - startX);
      this.position.y = startPosY + (clientY - startY);
      
      // Keep within screen bounds
      this.constrainPosition();
      this.updatePosition();
      
      e.preventDefault();
    };
    
    const endDrag = () => {
      this.isDragging = false;
      this.element.classList.remove('dragging');
      this.snapToEdge();
    };
    
    // Mouse events
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    header.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);
    
    // Control buttons
    document.getElementById('mini-minimize').addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    document.getElementById('mini-close').addEventListener('click', () => {
      this.hide();
    });
    
    // Playback controls
    document.getElementById('mini-play-pause').addEventListener('click', () => {
      this.audioEngine.togglePlayPause();
    });
    
    document.getElementById('mini-minimized-play-pause').addEventListener('click', () => {
      this.audioEngine.togglePlayPause();
    });
    
    document.getElementById('mini-previous').addEventListener('click', () => {
      this.audioEngine.previousTrack();
    });
    
    document.getElementById('mini-next').addEventListener('click', () => {
      this.audioEngine.nextTrack();
    });
    
    // Progress bar
    const progressBar = document.getElementById('mini-progress-bar');
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * this.duration;
      this.audioEngine.seek(newTime);
    });
    
    // Double-click to restore main window
    this.element.addEventListener('dblclick', () => {
      this.restoreMainWindow();
    });
    
    // Window resize handler
    window.addEventListener('resize', () => {
      this.constrainPosition();
      this.updatePosition();
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
      this.updateProgress(timeInfo);
    });
  }
  
  updateTrackInfo(track) {
    this.currentTrack = track;
    
    // Update track info
    document.getElementById('mini-track-title').textContent = track.title;
    document.getElementById('mini-track-artist').textContent = track.artist;
    
    // Update album art
    const albumArt = track.albumArt || 'assets/images/default-album.png';
    document.getElementById('mini-album-art').src = albumArt;
    document.getElementById('mini-minimized-art').src = albumArt;
    
    // Add animation
    this.element.classList.add('track-changed');
    setTimeout(() => {
      this.element.classList.remove('track-changed');
    }, 300);
  }
  
  updatePlayButton(isPlaying) {
    this.isPlaying = isPlaying;
    const playIcon = isPlaying ? '⏸️' : '▶️';
    
    document.getElementById('mini-play-pause').textContent = playIcon;
    document.getElementById('mini-minimized-play-pause').textContent = playIcon;
    
    // Update playing animation
    this.element.classList.toggle('playing', isPlaying);
  }
  
  updateProgress(timeInfo) {
    this.currentTime = timeInfo.currentTime;
    this.duration = timeInfo.duration;
    
    // Update progress bar
    const progress = timeInfo.progress * 100;
    document.getElementById('mini-progress-fill').style.width = progress + '%';
    
    // Update time display
    document.getElementById('mini-current-time').textContent = this.formatTime(timeInfo.currentTime);
    document.getElementById('mini-total-time').textContent = this.formatTime(timeInfo.duration);
  }
  
  show() {
    this.isVisible = true;
    this.element.style.display = 'block';
    
    // Animate in
    setTimeout(() => {
      this.element.classList.add('visible');
    }, 10);
    
    this.emit('shown');
  }
  
  hide() {
    this.isVisible = false;
    this.element.classList.remove('visible');
    
    // Hide after animation
    setTimeout(() => {
      this.element.style.display = 'none';
    }, 300);
    
    this.emit('hidden');
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    
    const content = this.element.querySelector('.mini-player-content');
    const minimized = this.element.querySelector('.mini-player-minimized');
    
    if (this.isMinimized) {
      content.style.display = 'none';
      minimized.style.display = 'flex';
      this.size = { width: 80, height: 80 };
    } else {
      content.style.display = 'flex';
      minimized.style.display = 'none';
      this.size = { width: 300, height: 120 };
    }
    
    this.updateSize();
    this.element.classList.toggle('minimized', this.isMinimized);
  }
  
  updatePosition() {
    this.element.style.left = this.position.x + 'px';
    this.element.style.top = this.position.y + 'px';
  }
  
  updateSize() {
    this.element.style.width = this.size.width + 'px';
    this.element.style.height = this.size.height + 'px';
  }
  
  constrainPosition() {
    const maxX = window.innerWidth - this.size.width;
    const maxY = window.innerHeight - this.size.height;
    
    this.position.x = Math.max(0, Math.min(maxX, this.position.x));
    this.position.y = Math.max(0, Math.min(maxY, this.position.y));
  }
  
  snapToEdge() {
    const centerX = this.position.x + this.size.width / 2;
    const screenCenter = window.innerWidth / 2;
    
    // Snap to left or right edge
    if (centerX < screenCenter) {
      this.position.x = 20; // Left edge with margin
    } else {
      this.position.x = window.innerWidth - this.size.width - 20; // Right edge with margin
    }
    
    this.updatePosition();
    
    // Animate the snap
    this.element.style.transition = 'left 0.3s ease-out';
    setTimeout(() => {
      this.element.style.transition = '';
    }, 300);
  }
  
  restoreMainWindow() {
    // Send message to main process to restore window
    if (typeof window !== 'undefined' && window.ipcRenderer) {
      window.ipcRenderer.invoke('restore-main-window');
    }
  }
  
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Event emitter
  emit(event, data) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(`mini-player-${event}`, { detail: data }));
    }
  }
  
  // Get current state
  getState() {
    return {
      isVisible: this.isVisible,
      isMinimized: this.isMinimized,
      position: { ...this.position },
      size: { ...this.size },
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying
    };
  }
  
  // Set position programmatically
  setPosition(x, y) {
    this.position = { x, y };
    this.constrainPosition();
    this.updatePosition();
  }
  
  // Cleanup
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

module.exports = MiniPlayer;