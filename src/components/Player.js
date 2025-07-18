// Player component - Handles audio playback UI
const audioService = require('../services/audioService');
const { formatTime } = require('../utils/formatters');

class Player {
  constructor(container) {
    this.container = container;
    this.isPlaying = false;
    this.currentTrack = null;
    this.volume = 1.0;
    this.isMuted = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.isShuffled = false;
    
    this.render();
    this.setupEventListeners();
    this.setupAudioServiceListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="player-bar" id="player-bar">
        <div class="now-playing">
          <img src="assets/images/default-album.png" alt="Album Art" class="album-thumb" width="60" height="60" />
          <div class="track-info">
            <div class="track-title">No Track Selected</div>
            <div class="track-artist">-</div>
          </div>
        </div>
        
        <div class="player-controls">
          <button class="btn-icon" id="btn-shuffle">🔀</button>
          <button class="btn-icon" id="btn-prev">⏮️</button>
          <button class="btn-icon" id="btn-play">▶️</button>
          <button class="btn-icon" id="btn-next">⏭️</button>
          <button class="btn-icon" id="btn-repeat">🔁</button>
        </div>
        
        <div class="player-timeline">
          <span class="time-current">0:00</span>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="time-total">0:00</span>
        </div>
        
        <div class="player-volume">
          <button class="btn-icon" id="btn-volume">🔊</button>
          <div class="volume-slider">
            <div class="volume-fill"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Play/Pause button
    document.getElementById('btn-play').addEventListener('click', () => {
      this.togglePlayPause();
    });
    
    // Next button
    document.getElementById('btn-next').addEventListener('click', () => {
      audioService.playNext();
    });
    
    // Previous button
    document.getElementById('btn-prev').addEventListener('click', () => {
      audioService.playPrevious();
    });
    
    // Shuffle button
    document.getElementById('btn-shuffle').addEventListener('click', () => {
      this.toggleShuffle();
    });
    
    // Repeat button
    document.getElementById('btn-repeat').addEventListener('click', () => {
      this.toggleRepeat();
    });
    
    // Volume button
    document.getElementById('btn-volume').addEventListener('click', () => {
      this.toggleMute();
    });
    
    // Progress bar
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.seekToPercent(percent);
    });
    
    // Volume slider
    const volumeSlider = document.querySelector('.volume-slider');
    volumeSlider.addEventListener('click', (e) => {
      const rect = volumeSlider.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.setVolume(percent);
    });
  }
  
  setupAudioServiceListeners() {
    // Listen for playback state changes
    audioService.on('playStateChanged', (data) => {
      this.isPlaying = data.isPlaying;
      this.currentTrack = data.track;
      this.updatePlayPauseButton();
      this.updateTrackInfo();
    });
    
    // Listen for progress updates
    audioService.on('progressChanged', (data) => {
      this.updateProgress(data);
    });
    
    // Listen for volume changes
    audioService.on('volumeChanged', (data) => {
      this.volume = data.volume;
      this.isMuted = data.isMuted;
      this.updateVolumeUI();
    });
    
    // Listen for repeat mode changes
    audioService.on('repeatModeChanged', (data) => {
      this.repeatMode = data.mode;
      this.updateRepeatButton();
    });
    
    // Listen for shuffle changes
    audioService.on('shuffleChanged', (data) => {
      this.isShuffled = data.isShuffled;
      this.updateShuffleButton();
    });
  }
  
  togglePlayPause() {
    audioService.togglePlayPause();
  }
  
  toggleShuffle() {
    audioService.toggleShuffle();
  }
  
  toggleRepeat() {
    audioService.toggleRepeatMode();
  }
  
  toggleMute() {
    audioService.toggleMute();
  }
  
  seekToPercent(percent) {
    if (!audioService.currentSound) return;
    
    const duration = audioService.currentSound.duration();
    const seekTime = duration * percent;
    audioService.seek(seekTime);
  }
  
  setVolume(percent) {
    const volume = Math.max(0, Math.min(1, percent));
    audioService.setVolume(volume);
  }
  
  updatePlayPauseButton() {
    const playButton = document.getElementById('btn-play');
    playButton.textContent = this.isPlaying ? '⏸️' : '▶️';
  }
  
  updateTrackInfo() {
    const titleElement = document.querySelector('.track-title');
    const artistElement = document.querySelector('.track-artist');
    const albumArt = document.querySelector('.album-thumb');
    
    if (this.currentTrack) {
      titleElement.textContent = this.currentTrack.title;
      artistElement.textContent = this.currentTrack.artist;
      
      if (this.currentTrack.albumArt) {
        albumArt.src = this.currentTrack.albumArt;
      } else {
        albumArt.src = 'assets/images/default-album.png';
      }
    } else {
      titleElement.textContent = 'No Track Selected';
      artistElement.textContent = '-';
      albumArt.src = 'assets/images/default-album.png';
    }
  }
  
  updateProgress(data) {
    const progressFill = document.querySelector('.progress-fill');
    const currentTimeElement = document.querySelector('.time-current');
    const totalTimeElement = document.querySelector('.time-total');
    
    progressFill.style.width = `${data.percent}%`;
    currentTimeElement.textContent = formatTime(data.currentTime);
    totalTimeElement.textContent = formatTime(data.duration);
  }
  
  updateVolumeUI() {
    const volumeButton = document.getElementById('btn-volume');
    const volumeFill = document.querySelector('.volume-fill');
    
    volumeButton.textContent = this.isMuted ? '🔇' : '🔊';
    volumeFill.style.width = `${this.volume * 100}%`;
  }
  
  updateRepeatButton() {
    const repeatButton = document.getElementById('btn-repeat');
    
    switch (this.repeatMode) {
      case 'none':
        repeatButton.textContent = '🔁';
        repeatButton.classList.remove('active');
        break;
      case 'all':
        repeatButton.textContent = '🔁';
        repeatButton.classList.add('active');
        break;
      case 'one':
        repeatButton.textContent = '🔂';
        repeatButton.classList.add('active');
        break;
    }
  }
  
  updateShuffleButton() {
    const shuffleButton = document.getElementById('btn-shuffle');
    
    if (this.isShuffled) {
      shuffleButton.classList.add('active');
    } else {
      shuffleButton.classList.remove('active');
    }
  }
}

module.exports = Player;