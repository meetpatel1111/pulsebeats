// Now Playing Page component - Displays current track with visualizer and lyrics
const Visualizer = require('../components/Visualizer');
const LyricsDisplay = require('../components/LyricsDisplay');
const colorExtractor = require('../utils/colorExtractor');
const { formatTime } = require('../utils/formatters');

class NowPlayingPage {
  constructor(container, audioService) {
    this.container = container;
    this.audioService = audioService;
    this.currentTrack = null;
    this.visualizer = null;
    this.lyricsDisplay = null;
    this.isFullscreen = false;
    this.activeTab = 'visualizer'; // 'visualizer', 'lyrics', 'info'
  }
  
  async initialize() {
    try {
      // Render initial content
      this.render();
      
      // Create visualizer
      const visualizerContainer = this.container.querySelector('.visualizer-container');
      this.visualizer = new Visualizer(visualizerContainer, this.audioService.getAudioElement());
      await this.visualizer.initialize();
      
      // Create lyrics display
      const lyricsContainer = this.container.querySelector('.lyrics-container');
      this.lyricsDisplay = new LyricsDisplay(lyricsContainer, this.audioService.getAudioElement());
      await this.lyricsDisplay.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Listen for audio service events
      this.audioService.on('playStateChanged', (data) => this.updatePlayState(data));
      this.audioService.on('progressChanged', (data) => this.updateProgress(data));
      
      return true;
    } catch (error) {
      console.error('Error initializing now playing page:', error);
      return false;
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div id="now-playing-page" class="page">
        <div class="now-playing-header">
          <button class="btn-text back-btn">↓</button>
          <h2>Now Playing</h2>
          <button class="btn-text fullscreen-btn">⛶</button>
        </div>
        
        <div class="now-playing-content">
          <div class="album-art-container">
            <img src="assets/images/default-album.png" class="album-art large" alt="Album Art">
          </div>
          
          <div class="track-info-container">
            <div class="track-title large">No Track Selected</div>
            <div class="track-artist large">-</div>
            <div class="track-album">-</div>
          </div>
          
          <div class="playback-controls">
            <div class="playback-timeline">
              <span class="time-current">0:00</span>
              <div class="progress-bar large">
                <div class="progress-fill"></div>
              </div>
              <span class="time-total">0:00</span>
            </div>
            
            <div class="playback-buttons">
              <button class="btn-icon large" id="btn-shuffle">🔀</button>
              <button class="btn-icon large" id="btn-prev">⏮️</button>
              <button class="btn-icon large" id="btn-play">▶️</button>
              <button class="btn-icon large" id="btn-next">⏭️</button>
              <button class="btn-icon large" id="btn-repeat">🔁</button>
            </div>
            
            <div class="playback-options">
              <button class="btn-icon" id="btn-favorite">♡</button>
              <button class="btn-icon" id="btn-add-to-playlist">+</button>
              <button class="btn-icon" id="btn-equalizer">⚙️</button>
              <button class="btn-icon" id="btn-sleep-timer">⏱️</button>
            </div>
          </div>
          
          <div class="tabs-container">
            <div class="tabs">
              <button class="tab-btn active" data-tab="visualizer">Visualizer</button>
              <button class="tab-btn" data-tab="lyrics">Lyrics</button>
              <button class="tab-btn" data-tab="info">Info</button>
            </div>
            
            <div class="tab-content">
              <div class="tab-pane active" id="visualizer-tab">
                <div class="visualizer-container"></div>
              </div>
              
              <div class="tab-pane" id="lyrics-tab">
                <div class="lyrics-container"></div>
              </div>
              
              <div class="tab-pane" id="info-tab">
                <div class="track-details">
                  <h3>Track Details</h3>
                  <table class="details-table">
                    <tr>
                      <th>Title</th>
                      <td id="detail-title">-</td>
                    </tr>
                    <tr>
                      <th>Artist</th>
                      <td id="detail-artist">-</td>
                    </tr>
                    <tr>
                      <th>Album</th>
                      <td id="detail-album">-</td>
                    </tr>
                    <tr>
                      <th>Genre</th>
                      <td id="detail-genre">-</td>
                    </tr>
                    <tr>
                      <th>Year</th>
                      <td id="detail-year">-</td>
                    </tr>
                    <tr>
                      <th>Duration</th>
                      <td id="detail-duration">-</td>
                    </tr>
                    <tr>
                      <th>Format</th>
                      <td id="detail-format">-</td>
                    </tr>
                    <tr>
                      <th>Bit Rate</th>
                      <td id="detail-bitrate">-</td>
                    </tr>
                    <tr>
                      <th>Sample Rate</th>
                      <td id="detail-samplerate">-</td>
                    </tr>
                    <tr>
                      <th>File Size</th>
                      <td id="detail-filesize">-</td>
                    </tr>
                    <tr>
                      <th>File Path</th>
                      <td id="detail-path">-</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Back button
    const backButton = this.container.querySelector('.back-btn');
    backButton.addEventListener('click', () => {
      // Hide now playing page
      this.container.querySelector('#now-playing-page').classList.remove('active');
    });
    
    // Fullscreen button
    const fullscreenButton = this.container.querySelector('.fullscreen-btn');
    fullscreenButton.addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    // Play/pause button
    const playButton = this.container.querySelector('#btn-play');
    playButton.addEventListener('click', () => {
      this.audioService.togglePlayPause();
    });
    
    // Next button
    const nextButton = this.container.querySelector('#btn-next');
    nextButton.addEventListener('click', () => {
      this.audioService.playNext();
    });
    
    // Previous button
    const prevButton = this.container.querySelector('#btn-prev');
    prevButton.addEventListener('click', () => {
      this.audioService.playPrevious();
    });
    
    // Shuffle button
    const shuffleButton = this.container.querySelector('#btn-shuffle');
    shuffleButton.addEventListener('click', () => {
      this.audioService.toggleShuffle();
    });
    
    // Repeat button
    const repeatButton = this.container.querySelector('#btn-repeat');
    repeatButton.addEventListener('click', () => {
      this.audioService.toggleRepeat();
    });
    
    // Favorite button
    const favoriteButton = this.container.querySelector('#btn-favorite');
    favoriteButton.addEventListener('click', () => {
      this.toggleFavorite();
    });
    
    // Progress bar
    const progressBar = this.container.querySelector('.progress-bar');
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.audioService.seekToPercent(percent);
    });
    
    // Tabs
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show selected tab content
        const tabId = button.dataset.tab;
        this.activeTab = tabId;
        
        const tabPanes = this.container.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        this.container.querySelector(`#${tabId}-tab`).classList.add('active');
      });
    });
  }
  
  updatePlayState(data) {
    // Update play/pause button
    const playButton = this.container.querySelector('#btn-play');
    playButton.textContent = data.isPlaying ? '⏸️' : '▶️';
    
    // Update track info if track is provided
    if (data.track) {
      this.currentTrack = data.track;
      
      // Update track info
      this.container.querySelector('.track-title').textContent = data.track.title;
      this.container.querySelector('.track-artist').textContent = data.track.artist;
      this.container.querySelector('.track-album').textContent = data.track.album || '-';
      
      // Update album art
      const albumArt = this.container.querySelector('.album-art');
      if (data.track.albumArt) {
        albumArt.src = data.track.albumArt;
        
        // Extract colors from album art
        this.extractColorsFromAlbumArt(data.track.albumArt);
      } else {
        albumArt.src = 'assets/images/default-album.png';
        
        // Reset color scheme
        colorExtractor.resetColorScheme();
      }
      
      // Update track details
      this.updateTrackDetails(data.track);
      
      // Update lyrics
      if (this.lyricsDisplay) {
        this.lyricsDisplay.loadLyrics(data.track);
      }
      
      // Update favorite button
      this.updateFavoriteButton();
      
      // Show now playing page
      this.container.querySelector('#now-playing-page').classList.add('active');
    }
  }
  
  updateProgress(data) {
    // Update progress bar
    const progressFill = this.container.querySelector('.progress-fill');
    progressFill.style.width = `${data.percent}%`;
    
    // Update time displays
    const currentTime = this.container.querySelector('.time-current');
    const totalTime = this.container.querySelector('.time-total');
    
    currentTime.textContent = formatTime(data.currentTime);
    totalTime.textContent = formatTime(data.duration);
  }
  
  updateTrackDetails(track) {
    // Update track details in info tab
    this.container.querySelector('#detail-title').textContent = track.title || '-';
    this.container.querySelector('#detail-artist').textContent = track.artist || '-';
    this.container.querySelector('#detail-album').textContent = track.album || '-';
    this.container.querySelector('#detail-genre').textContent = track.genre || '-';
    this.container.querySelector('#detail-year').textContent = track.year || '-';
    this.container.querySelector('#detail-duration').textContent = formatTime(track.duration) || '-';
    this.container.querySelector('#detail-format').textContent = track.format || '-';
    this.container.querySelector('#detail-bitrate').textContent = track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : '-';
    this.container.querySelector('#detail-samplerate').textContent = track.sampleRate ? `${track.sampleRate} Hz` : '-';
    this.container.querySelector('#detail-filesize').textContent = track.fileSize ? this.formatFileSize(track.fileSize) : '-';
    this.container.querySelector('#detail-path').textContent = track.path || '-';
  }
  
  async extractColorsFromAlbumArt(imageUrl) {
    try {
      // Extract colors
      const colors = await colorExtractor.extractColors(imageUrl);
      
      // Generate color scheme
      const colorScheme = colorExtractor.generateColorScheme(colors.dominant);
      
      // Apply color scheme
      colorExtractor.applyColorScheme(colorScheme);
      
      // Update visualizer colors
      if (this.visualizer) {
        this.visualizer.setAlbumColors(colors.palette);
      }
    } catch (error) {
      console.error('Error extracting colors from album art:', error);
    }
  }
  
  async toggleFavorite() {
    if (!this.currentTrack) return;
    
    try {
      const favorites = await ipcRenderer.invoke('get-favorites');
      const isFavorite = favorites.includes(this.currentTrack.id);
      
      if (isFavorite) {
        // Remove from favorites
        await ipcRenderer.invoke('remove-from-favorites', this.currentTrack.id);
      } else {
        // Add to favorites
        await ipcRenderer.invoke('add-to-favorites', this.currentTrack.id);
      }
      
      // Update favorite button
      this.updateFavoriteButton();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
  
  async updateFavoriteButton() {
    if (!this.currentTrack) return;
    
    try {
      const favorites = await ipcRenderer.invoke('get-favorites');
      const isFavorite = favorites.includes(this.currentTrack.id);
      
      const favoriteButton = this.container.querySelector('#btn-favorite');
      favoriteButton.textContent = isFavorite ? '❤️' : '♡';
    } catch (error) {
      console.error('Error updating favorite button:', error);
    }
  }
  
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    const nowPlayingPage = this.container.querySelector('#now-playing-page');
    nowPlayingPage.classList.toggle('fullscreen', this.isFullscreen);
    
    const fullscreenButton = this.container.querySelector('.fullscreen-btn');
    fullscreenButton.textContent = this.isFullscreen ? '⛶' : '⛶';
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  show() {
    this.container.querySelector('#now-playing-page').classList.add('active');
  }
  
  hide() {
    this.container.querySelector('#now-playing-page').classList.remove('active');
  }
  
  cleanup() {
    if (this.visualizer) {
      this.visualizer.cleanup();
    }
    
    if (this.lyricsDisplay) {
      this.lyricsDisplay.cleanup();
    }
  }
}

module.exports = NowPlayingPage;