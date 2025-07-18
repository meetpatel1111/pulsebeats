// Home Page component - Displays recommendations and recently played
const { ipcRenderer } = require('electron');
const recommendationEngine = require('../components/RecommendationEngine');
const { formatTime } = require('../utils/formatters');

class HomePage {
  constructor(container, audioService) {
    this.container = container;
    this.audioService = audioService;
    this.recommendations = null;
    this.recentlyPlayed = [];
    this.favorites = [];
  }
  
  async initialize() {
    try {
      // Initialize recommendation engine
      await recommendationEngine.initialize();
      
      // Render initial content
      this.render();
      
      // Load data
      await this.loadData();
      
      return true;
    } catch (error) {
      console.error('Error initializing home page:', error);
      return false;
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div id="home-page" class="page active">
        <h2>Welcome to PulseBeats</h2>
        
        <div class="section recently-played-section">
          <h3>Recently Played</h3>
          <div class="track-grid" id="recently-played-grid">
            <div class="loading">Loading recently played tracks...</div>
          </div>
        </div>
        
        <div class="section favorites-section">
          <h3>Your Favorites</h3>
          <div class="track-grid" id="favorites-grid">
            <div class="loading">Loading favorites...</div>
          </div>
        </div>
        
        <div class="section daily-mix-section">
          <h3>Daily Mix</h3>
          <div class="track-grid" id="daily-mix-grid">
            <div class="loading">Generating recommendations...</div>
          </div>
        </div>
        
        <div class="section mood-recommendations">
          <h3>Music by Mood</h3>
          <div class="mood-tabs">
            <button class="mood-tab active" data-mood="energetic">Energetic</button>
            <button class="mood-tab" data-mood="calm">Calm</button>
            <button class="mood-tab" data-mood="happy">Happy</button>
            <button class="mood-tab" data-mood="sad">Sad</button>
          </div>
          <div class="track-grid" id="mood-grid">
            <div class="loading">Analyzing mood...</div>
          </div>
        </div>
      </div>
    `;
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Mood tabs
    const moodTabs = this.container.querySelectorAll('.mood-tab');
    moodTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        moodTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show selected mood recommendations
        const mood = tab.dataset.mood;
        this.showMoodRecommendations(mood);
      });
    });
  }
  
  async loadData() {
    try {
      // Load recently played
      this.recentlyPlayed = await ipcRenderer.invoke('get-recently-played');
      this.renderRecentlyPlayed();
      
      // Load favorites
      this.favorites = await ipcRenderer.invoke('get-favorites');
      this.renderFavorites();
      
      // Generate recommendations
      this.recommendations = await recommendationEngine.generateAllRecommendations();
      
      // Render daily mix
      this.renderDailyMix();
      
      // Render mood recommendations (default: energetic)
      this.showMoodRecommendations('energetic');
    } catch (error) {
      console.error('Error loading home page data:', error);
    }
  }
  
  renderRecentlyPlayed() {
    const container = this.container.querySelector('#recently-played-grid');
    
    if (!this.recentlyPlayed || this.recentlyPlayed.length === 0) {
      container.innerHTML = '<div class="empty-message">No recently played tracks</div>';
      return;
    }
    
    // Get tracks for recently played IDs
    const tracks = this.recentlyPlayed.map(id => {
      // In a real app, we would look up the track by ID
      // For now, we'll just create a placeholder
      return {
        id,
        title: `Track ${id}`,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 180
      };
    });
    
    this.renderTrackGrid(container, tracks.slice(0, 10));
  }
  
  renderFavorites() {
    const container = this.container.querySelector('#favorites-grid');
    
    if (!this.favorites || this.favorites.length === 0) {
      container.innerHTML = '<div class="empty-message">No favorites yet</div>';
      return;
    }
    
    // Get tracks for favorite IDs
    const tracks = this.favorites.map(id => {
      // In a real app, we would look up the track by ID
      // For now, we'll just create a placeholder
      return {
        id,
        title: `Track ${id}`,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 180
      };
    });
    
    this.renderTrackGrid(container, tracks.slice(0, 10));
  }
  
  renderDailyMix() {
    const container = this.container.querySelector('#daily-mix-grid');
    
    if (!this.recommendations || !this.recommendations.dailyMix || this.recommendations.dailyMix.length === 0) {
      container.innerHTML = '<div class="empty-message">No recommendations available</div>';
      return;
    }
    
    this.renderTrackGrid(container, this.recommendations.dailyMix.slice(0, 10));
  }
  
  showMoodRecommendations(mood) {
    const container = this.container.querySelector('#mood-grid');
    
    if (!this.recommendations || !this.recommendations.byMood || !this.recommendations.byMood[mood]) {
      container.innerHTML = '<div class="loading">Analyzing mood...</div>';
      return;
    }
    
    const tracks = this.recommendations.byMood[mood];
    
    if (tracks.length === 0) {
      container.innerHTML = `<div class="empty-message">No ${mood} tracks found</div>`;
      return;
    }
    
    this.renderTrackGrid(container, tracks.slice(0, 10));
  }
  
  renderTrackGrid(container, tracks) {
    let html = '';
    
    tracks.forEach(track => {
      html += `
        <div class="track-card" data-id="${track.id}">
          <div class="track-card-image">
            <img src="${track.albumArt || 'assets/images/default-album.png'}" alt="Album Art">
            <div class="track-card-play">▶️</div>
          </div>
          <div class="track-card-info">
            <div class="track-card-title">${track.title}</div>
            <div class="track-card-artist">${track.artist}</div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to track cards
    const trackCards = container.querySelectorAll('.track-card');
    trackCards.forEach(card => {
      card.addEventListener('click', () => {
        const trackId = card.dataset.id;
        const track = tracks.find(t => t.id === trackId);
        
        if (track) {
          this.audioService.playTrack(track);
        }
      });
    });
  }
  
  cleanup() {
    // Nothing to clean up
  }
}

module.exports = HomePage;