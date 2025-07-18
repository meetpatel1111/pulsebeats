// Lyrics Display component - Renders synchronized lyrics
const lyricsService = require('../services/lyricsService');

class LyricsDisplay {
  constructor(container, audioElement) {
    this.container = container;
    this.audioElement = audioElement;
    this.currentTrack = null;
    this.isActive = false;
    this.updateInterval = null;
    this.currentLyricIndex = -1;
    this.parsedLyrics = [];
  }
  
  async initialize() {
    try {
      // Create lyrics container
      this.lyricsContainer = document.createElement('div');
      this.lyricsContainer.className = 'lyrics-container';
      this.container.appendChild(this.lyricsContainer);
      
      // Create loading indicator
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'lyrics-loading';
      this.loadingIndicator.textContent = 'Loading lyrics...';
      this.loadingIndicator.style.display = 'none';
      this.container.appendChild(this.loadingIndicator);
      
      // Create no lyrics message
      this.noLyricsMessage = document.createElement('div');
      this.noLyricsMessage.className = 'no-lyrics';
      this.noLyricsMessage.textContent = 'No lyrics available';
      this.noLyricsMessage.style.display = 'none';
      this.container.appendChild(this.noLyricsMessage);
      
      // Set up event listeners
      lyricsService.on('lyrics-changed', (lyrics) => this.renderLyrics(lyrics));
      lyricsService.on('loading-changed', (isLoading) => this.setLoading(isLoading));
      
      // Set up audio time update listener
      this.audioElement.addEventListener('timeupdate', () => this.updateActiveLyric());
      
      return true;
    } catch (error) {
      console.error('Error initializing lyrics display:', error);
      return false;
    }
  }
  
  async loadLyrics(track) {
    if (!track) return;
    
    this.currentTrack = track;
    this.currentLyricIndex = -1;
    this.parsedLyrics = [];
    
    // Show loading indicator
    this.setLoading(true);
    
    // Hide no lyrics message
    this.noLyricsMessage.style.display = 'none';
    
    // Clear current lyrics
    this.lyricsContainer.innerHTML = '';
    
    // Load lyrics
    await lyricsService.fetchLyrics(track);
  }
  
  renderLyrics(lyrics) {
    // Hide loading indicator
    this.setLoading(false);
    
    if (!lyrics) {
      // Show no lyrics message
      this.noLyricsMessage.style.display = 'block';
      this.lyricsContainer.innerHTML = '';
      return;
    }
    
    // Clear current lyrics
    this.lyricsContainer.innerHTML = '';
    
    if (lyrics.type === 'lrc') {
      // Parse LRC format
      this.parsedLyrics = this.parseLRC(lyrics.text);
      
      // Create lyrics elements
      this.parsedLyrics.forEach((line, index) => {
        const lyricElement = document.createElement('div');
        lyricElement.className = 'lyric-line';
        lyricElement.textContent = line.text;
        lyricElement.dataset.index = index;
        lyricElement.dataset.time = line.time;
        
        this.lyricsContainer.appendChild(lyricElement);
      });
      
      // Start update interval
      this.startLyricsUpdate();
    } else {
      // Plain text lyrics
      const lines = lyrics.text.split('\n');
      
      lines.forEach(line => {
        const lyricElement = document.createElement('div');
        lyricElement.className = 'lyric-line';
        lyricElement.textContent = line || ' '; // Use space for empty lines
        
        this.lyricsContainer.appendChild(lyricElement);
      });
    }
  }
  
  parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
    
    return lines.map(line => {
      const match = timeRegex.exec(line);
      if (!match) return { time: -1, text: line };
      
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const hundredths = parseInt(match[3]);
      const timeInSeconds = minutes * 60 + seconds + hundredths / 100;
      
      return {
        time: timeInSeconds,
        text: line.replace(timeRegex, '').trim()
      };
    }).filter(line => line.time >= 0 && line.text);
  }
  
  startLyricsUpdate() {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Set up new interval
    this.updateInterval = setInterval(() => this.updateActiveLyric(), 100);
  }
  
  updateActiveLyric() {
    if (!this.parsedLyrics.length || !this.audioElement) return;
    
    const currentTime = this.audioElement.currentTime;
    
    // Find current lyric
    let activeIndex = -1;
    
    for (let i = 0; i < this.parsedLyrics.length; i++) {
      if (this.parsedLyrics[i].time <= currentTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
    
    // Update active lyric if changed
    if (activeIndex !== this.currentLyricIndex) {
      this.currentLyricIndex = activeIndex;
      
      // Update UI
      const lyricElements = this.lyricsContainer.querySelectorAll('.lyric-line');
      
      lyricElements.forEach((element, index) => {
        if (index === activeIndex) {
          element.classList.add('active');
          
          // Scroll to active lyric
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          element.classList.remove('active');
        }
      });
    }
  }
  
  setLoading(isLoading) {
    this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
  }
  
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.lyricsContainer && this.container.contains(this.lyricsContainer)) {
      this.container.removeChild(this.lyricsContainer);
    }
    
    if (this.loadingIndicator && this.container.contains(this.loadingIndicator)) {
      this.container.removeChild(this.loadingIndicator);
    }
    
    if (this.noLyricsMessage && this.container.contains(this.noLyricsMessage)) {
      this.container.removeChild(this.noLyricsMessage);
    }
  }
}

module.exports = LyricsDisplay;