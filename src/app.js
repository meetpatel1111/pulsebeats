// Modern PulseBeats Application
class PulseBeatsApp {
  constructor() {
    this.currentPage = 'home';
    this.currentTheme = 'dark';
    this.isPlaying = false;
    this.currentTrack = null;
    this.volume = 1.0;
    this.currentTime = 0;
    this.duration = 0;
    this.isShuffled = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.isMuted = false;
    this.previousVolume = 1.0;
    
    // Initialize app
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.setupNavigation();
    this.setupPlayer();
    this.setupResponsive();
    this.loadInitialData();
    
    // Add entrance animations
    this.addEntranceAnimations();
  }
  
  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Mobile menu toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
      this.toggleMobileMenu();
    });
    
    // Sidebar overlay
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
      this.closeMobileMenu();
    });
    
    // Get started button
    document.getElementById('get-started-btn').addEventListener('click', () => {
      this.navigateTo('library');
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
    
    // Player controls
    this.setupPlayerControls();
    
    // Navigation links
    this.setupNavigationLinks();
  }
  
  setupPlayerControls() {
    // Play/Pause
    document.getElementById('play-btn').addEventListener('click', () => {
      this.togglePlayPause();
    });
    
    // Previous track
    document.getElementById('prev-btn').addEventListener('click', () => {
      this.previousTrack();
    });
    
    // Next track
    document.getElementById('next-btn').addEventListener('click', () => {
      this.nextTrack();
    });
    
    // Shuffle
    document.getElementById('shuffle-btn').addEventListener('click', () => {
      this.toggleShuffle();
    });
    
    // Repeat
    document.getElementById('repeat-btn').addEventListener('click', () => {
      this.toggleRepeat();
    });
    
    // Volume
    document.getElementById('volume-btn').addEventListener('click', () => {
      this.toggleMute();
    });
    
    // Favorite
    document.getElementById('favorite-btn').addEventListener('click', () => {
      this.toggleFavorite();
    });
    
    // Progress bar
    document.getElementById('progress-bar').addEventListener('click', (e) => {
      this.handleProgressClick(e);
    });
    
    // Volume slider
    document.getElementById('volume-slider').addEventListener('click', (e) => {
      this.handleVolumeClick(e);
    });
  }
  
  setupNavigationLinks() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('href').substring(1);
        this.navigateTo(page);
      });
    });
  }
  
  setupTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('pulsebeats-theme') || 'dark';
    this.currentTheme = savedTheme;
    this.applyTheme(savedTheme);
  }
  
  setupNavigation() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const page = window.location.hash.substring(1) || 'home';
      this.navigateTo(page, false);
    });
    
    // Set initial page
    const initialPage = window.location.hash.substring(1) || 'home';
    this.navigateTo(initialPage, false);
  }
  
  setupPlayer() {
    // Initialize audio context and player
    this.initializeAudioPlayer();
    
    // Start time updates
    this.startTimeUpdates();
  }
  
  setupResponsive() {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Initial resize check
    this.handleResize();
  }
  
  addEntranceAnimations() {
    // Stagger animations for nav items
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link, index) => {
      link.style.animationDelay = `${index * 0.1}s`;
      link.classList.add('animate-slide-left');
    });
  }
  
  // Theme Management
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.currentTheme = newTheme;
    localStorage.setItem('pulsebeats-theme', newTheme);
  }
  
  applyTheme(theme) {
    document.body.className = `${theme}-theme`;
    
    const themeIcon = document.querySelector('#theme-toggle i');
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
  
  // Navigation
  navigateTo(page, updateHistory = true) {
    // Update URL
    if (updateHistory) {
      window.history.pushState({}, '', `#${page}`);
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${page}`) {
        link.classList.add('active');
      }
    });
    
    // Load page content
    this.loadPage(page);
    this.currentPage = page;
    
    // Close mobile menu if open
    this.closeMobileMenu();
  }
  
  loadPage(page) {
    const content = document.getElementById('content');
    
    // Add loading state
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>
    `;
    
    // Simulate loading and render page
    setTimeout(() => {
      this.renderPage(page, content);
    }, 300);
  }
  
  renderPage(page, container) {
    switch (page) {
      case 'home':
        this.renderHomePage(container);
        break;
      case 'library':
        this.renderLibraryPage(container);
        break;
      case 'artists':
        this.renderArtistsPage(container);
        break;
      case 'albums':
        this.renderAlbumsPage(container);
        break;
      case 'playlists':
        this.renderPlaylistsPage(container);
        break;
      case 'liked':
        this.renderLikedSongsPage(container);
        break;
      case 'recent':
        this.renderRecentPage(container);
        break;
      case 'ai-mix':
        this.renderAIMixPage(container);
        break;
      case 'browse':
        this.renderBrowsePage(container);
        break;
      case 'radio':
        this.renderRadioPage(container);
        break;
      default:
        this.renderHomePage(container);
    }
  }
  
  renderHomePage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Good ${this.getTimeOfDay()}</h1>
          <p class="page-subtitle">Ready to discover some amazing music?</p>
        </div>
        
        <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-8);">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Quick Start</h3>
              <i class="fas fa-rocket" style="color: var(--primary-500);"></i>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
              Get started by adding your music library or exploring our features.
            </p>
            <div class="flex gap-3">
              <button class="btn btn-sm" onclick="app.navigateTo('library')">
                <i class="fas fa-plus"></i>
                Add Music
              </button>
              <button class="btn-secondary btn-sm" onclick="app.navigateTo('browse')">
                <i class="fas fa-compass"></i>
                Explore
              </button>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">AI Recommendations</h3>
              <i class="fas fa-brain" style="color: var(--accent-500);"></i>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
              Let our AI create personalized playlists based on your taste.
            </p>
            <button class="btn btn-sm" onclick="app.navigateTo('ai-mix')">
              <i class="fas fa-magic"></i>
              Generate Mix
            </button>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Activity</h3>
              <i class="fas fa-clock" style="color: var(--primary-400);"></i>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
              Continue where you left off with your recently played music.
            </p>
            <button class="btn-ghost btn-sm" onclick="app.navigateTo('recent')">
              <i class="fas fa-history"></i>
              View Recent
            </button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Featured Playlists</h3>
            <button class="btn-ghost btn-sm">View All</button>
          </div>
          <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4);">
            ${this.renderFeaturedPlaylists()}
          </div>
        </div>
      </div>
    `;
  }
  
  renderLibraryPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Your Library</h1>
          <p class="page-subtitle">Manage and organize your music collection</p>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Music Folders</h3>
            <button class="btn" id="add-folder-btn">
              <i class="fas fa-folder-plus"></i>
              Add Folder
            </button>
          </div>
          <div id="library-content">
            <div class="flex flex-col items-center justify-center" style="padding: var(--space-16);">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-4);">
                <i class="fas fa-music" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Music Found</h3>
              <p style="color: var(--text-secondary); text-center; margin-bottom: var(--space-6);">
                Add your music folders to get started with your personal library.
              </p>
              <button class="btn" onclick="document.getElementById('add-folder-btn').click()">
                <i class="fas fa-folder-plus"></i>
                Add Music Folder
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Setup add folder functionality
    document.getElementById('add-folder-btn').addEventListener('click', () => {
      this.showAddFolderDialog();
    });
  }
  
  renderArtistsPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Artists</h1>
          <p class="page-subtitle">Explore music by your favorite artists</p>
        </div>
        
        <div class="card">
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-user-music" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Artists Found</h3>
              <p style="color: var(--text-secondary);">Add music to your library to see artists here.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderAlbumsPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Albums</h1>
          <p class="page-subtitle">Browse your album collection</p>
        </div>
        
        <div class="card">
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-compact-disc" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Albums Found</h3>
              <p style="color: var(--text-secondary);">Add music to your library to see albums here.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderPlaylistsPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Playlists</h1>
          <p class="page-subtitle">Create and manage your playlists</p>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Your Playlists</h3>
            <button class="btn" id="create-playlist-btn">
              <i class="fas fa-plus"></i>
              Create Playlist
            </button>
          </div>
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-list-music" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Playlists Yet</h3>
              <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">Create your first playlist to organize your favorite songs.</p>
              <button class="btn" onclick="document.getElementById('create-playlist-btn').click()">
                <i class="fas fa-plus"></i>
                Create Your First Playlist
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('create-playlist-btn').addEventListener('click', () => {
      this.showCreatePlaylistDialog();
    });
  }
  
  renderLikedSongsPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Liked Songs</h1>
          <p class="page-subtitle">Your favorite tracks in one place</p>
        </div>
        
        <div class="card">
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--accent-500), var(--accent-600)); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-heart" style="font-size: 2rem; color: white;"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Liked Songs</h3>
              <p style="color: var(--text-secondary);">Songs you like will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderRecentPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Recently Played</h1>
          <p class="page-subtitle">Pick up where you left off</p>
        </div>
        
        <div class="card">
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-clock" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">No Recent Activity</h3>
              <p style="color: var(--text-secondary);">Your recently played songs will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderAIMixPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">AI Daily Mix</h1>
          <p class="page-subtitle">Personalized playlists powered by artificial intelligence</p>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Generate New Mix</h3>
            <i class="fas fa-robot" style="color: var(--accent-500); font-size: 1.5rem;"></i>
          </div>
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 100px; height: 100px; background: linear-gradient(135deg, var(--primary-500), var(--accent-500)); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-6); animation: float 3s ease-in-out infinite;">
                <i class="fas fa-brain" style="font-size: 2.5rem; color: white;"></i>
              </div>
              <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: var(--space-3);">AI-Powered Music Discovery</h3>
              <p style="color: var(--text-secondary); margin-bottom: var(--space-6); max-width: 400px;">
                Our AI analyzes your listening habits to create the perfect mix of songs you'll love.
              </p>
              <button class="btn btn-lg" id="generate-mix-btn">
                <i class="fas fa-magic"></i>
                Generate My Daily Mix
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('generate-mix-btn').addEventListener('click', () => {
      this.generateAIMix();
    });
  }
  
  renderBrowsePage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Browse</h1>
          <p class="page-subtitle">Discover new music and genres</p>
        </div>
        
        <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-6);">
          ${this.renderBrowseCategories()}
        </div>
      </div>
    `;
  }
  
  renderRadioPage(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <div class="page-header">
          <h1 class="page-title">Radio</h1>
          <p class="page-subtitle">Listen to curated radio stations</p>
        </div>
        
        <div class="card">
          <div class="flex items-center justify-center" style="padding: var(--space-16);">
            <div class="text-center">
              <div style="width: 80px; height: 80px; background: var(--bg-glass-light); border-radius: var(--radius-2xl); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i class="fas fa-broadcast-tower" style="font-size: 2rem; color: var(--text-tertiary);"></i>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-2);">Radio Coming Soon</h3>
              <p style="color: var(--text-secondary);">Internet radio stations will be available in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderFeaturedPlaylists() {
    const playlists = [
      { name: 'Chill Vibes', image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400', color: 'var(--primary-500)' },
      { name: 'Workout Mix', image: 'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=400', color: 'var(--accent-500)' },
      { name: 'Focus Flow', image: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400', color: '#8b5cf6' },
      { name: 'Night Drive', image: 'https://images.pexels.com/photos/1666021/pexels-photo-1666021.jpeg?auto=compress&cs=tinysrgb&w=400', color: '#f59e0b' }
    ];
    
    return playlists.map(playlist => `
      <div class="card" style="cursor: pointer; padding: 0; overflow: hidden;">
        <div style="position: relative; height: 150px; background: linear-gradient(135deg, ${playlist.color}, ${playlist.color}dd); display: flex; align-items: center; justify-content: center;">
          <img src="${playlist.image}" alt="${playlist.name}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7;">
          <div style="position: absolute; inset: 0; background: linear-gradient(135deg, ${playlist.color}66, ${playlist.color}33);"></div>
          <i class="fas fa-play" style="position: absolute; color: white; font-size: 2rem; opacity: 0.8;"></i>
        </div>
        <div style="padding: var(--space-4);">
          <h4 style="font-weight: 600; margin-bottom: var(--space-1);">${playlist.name}</h4>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">Curated playlist</p>
        </div>
      </div>
    `).join('');
  }
  
  renderBrowseCategories() {
    const categories = [
      { name: 'Pop', color: '#ff6b6b', icon: 'fas fa-star' },
      { name: 'Rock', color: '#4ecdc4', icon: 'fas fa-guitar' },
      { name: 'Hip Hop', color: '#45b7d1', icon: 'fas fa-microphone' },
      { name: 'Electronic', color: '#f9ca24', icon: 'fas fa-bolt' },
      { name: 'Jazz', color: '#6c5ce7', icon: 'fas fa-saxophone' },
      { name: 'Classical', color: '#fd79a8', icon: 'fas fa-music' }
    ];
    
    return categories.map(category => `
      <div class="card" style="cursor: pointer; background: linear-gradient(135deg, ${category.color}22, ${category.color}11); border-color: ${category.color}33;">
        <div class="flex items-center gap-4">
          <div style="width: 60px; height: 60px; background: ${category.color}; border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center;">
            <i class="${category.icon}" style="color: white; font-size: 1.5rem;"></i>
          </div>
          <div>
            <h3 style="font-weight: 600; margin-bottom: var(--space-1);">${category.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem;">Explore ${category.name.toLowerCase()} music</p>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  // Player Functions
  initializeAudioPlayer() {
    // Initialize Howler.js or Web Audio API
    console.log('Audio player initialized');
  }
  
  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    const playBtn = document.getElementById('play-btn');
    const icon = playBtn.querySelector('i');
    
    if (this.isPlaying) {
      icon.className = 'fas fa-pause';
      playBtn.title = 'Pause';
      this.simulatePlayback();
    } else {
      icon.className = 'fas fa-play';
      playBtn.title = 'Play';
      this.stopSimulation();
    }
    
    // Add animation
    playBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      playBtn.style.transform = 'scale(1)';
    }, 150);
  }
  
  previousTrack() {
    console.log('Previous track');
    this.animateControlButton('prev-btn');
  }
  
  nextTrack() {
    console.log('Next track');
    this.animateControlButton('next-btn');
  }
  
  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const shuffleBtn = document.getElementById('shuffle-btn');
    shuffleBtn.classList.toggle('active', this.isShuffled);
    this.animateControlButton('shuffle-btn');
  }
  
  toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIndex + 1) % modes.length];
    
    const repeatBtn = document.getElementById('repeat-btn');
    const icon = repeatBtn.querySelector('i');
    
    switch (this.repeatMode) {
      case 'none':
        repeatBtn.classList.remove('active');
        icon.className = 'fas fa-redo';
        break;
      case 'all':
        repeatBtn.classList.add('active');
        icon.className = 'fas fa-redo';
        break;
      case 'one':
        repeatBtn.classList.add('active');
        icon.className = 'fas fa-redo-alt';
        break;
    }
    
    this.animateControlButton('repeat-btn');
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    const volumeBtn = document.getElementById('volume-btn');
    const icon = volumeBtn.querySelector('i');
    
    if (this.isMuted) {
      this.previousVolume = this.volume;
      this.volume = 0;
      icon.className = 'fas fa-volume-mute';
    } else {
      this.volume = this.previousVolume;
      icon.className = this.volume > 0.5 ? 'fas fa-volume-up' : 'fas fa-volume-down';
    }
    
    this.updateVolumeDisplay();
    this.animateControlButton('volume-btn');
  }
  
  toggleFavorite() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const icon = favoriteBtn.querySelector('i');
    const isLiked = icon.className.includes('fas');
    
    if (isLiked) {
      icon.className = 'far fa-heart';
      favoriteBtn.style.color = 'var(--text-secondary)';
    } else {
      icon.className = 'fas fa-heart';
      favoriteBtn.style.color = 'var(--accent-500)';
    }
    
    this.animateControlButton('favorite-btn');
  }
  
  handleProgressClick(e) {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    this.currentTime = percent * this.duration;
    this.updateProgressDisplay();
  }
  
  handleVolumeClick(e) {
    const volumeSlider = e.currentTarget;
    const rect = volumeSlider.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    this.volume = Math.max(0, Math.min(1, percent));
    this.isMuted = false;
    this.updateVolumeDisplay();
    
    const volumeBtn = document.getElementById('volume-btn');
    const icon = volumeBtn.querySelector('i');
    icon.className = this.volume === 0 ? 'fas fa-volume-mute' : 
                     this.volume > 0.5 ? 'fas fa-volume-up' : 'fas fa-volume-down';
  }
  
  updateProgressDisplay() {
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    progressFill.style.width = `${progress}%`;
    
    currentTimeEl.textContent = this.formatTime(this.currentTime);
    totalTimeEl.textContent = this.formatTime(this.duration);
  }
  
  updateVolumeDisplay() {
    const volumeFill = document.getElementById('volume-fill');
    volumeFill.style.width = `${this.volume * 100}%`;
  }
  
  animateControlButton(buttonId) {
    const button = document.getElementById(buttonId);
    button.style.transform = 'scale(0.9)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 150);
  }
  
  simulatePlayback() {
    this.duration = 180; // 3 minutes
    this.currentTime = 0;
    
    this.playbackInterval = setInterval(() => {
      this.currentTime += 1;
      if (this.currentTime >= this.duration) {
        this.currentTime = 0;
      }
      this.updateProgressDisplay();
    }, 1000);
  }
  
  stopSimulation() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
  }
  
  startTimeUpdates() {
    this.updateProgressDisplay();
    this.updateVolumeDisplay();
  }
  
  // Mobile Functions
  toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  }
  
  closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }
  
  handleResize() {
    const menuToggle = document.getElementById('menu-toggle');
    
    if (window.innerWidth <= 1024) {
      menuToggle.style.display = 'flex';
    } else {
      menuToggle.style.display = 'none';
      this.closeMobileMenu();
    }
  }
  
  // Utility Functions
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  handleSearch(query) {
    console.log('Searching for:', query);
    // Implement search functionality
  }
  
  showAddFolderDialog() {
    this.showNotification('Add folder functionality will be implemented with backend integration.', 'info');
  }
  
  showCreatePlaylistDialog() {
    this.showNotification('Create playlist functionality will be implemented with backend integration.', 'info');
  }
  
  generateAIMix() {
    const button = document.getElementById('generate-mix-btn');
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    button.disabled = true;
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
      this.showNotification('AI Mix generation will be implemented with backend integration.', 'info');
    }, 2000);
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-6);
      color: var(--text-primary);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="fas fa-info-circle" style="color: var(--primary-500);"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  loadInitialData() {
    // Load any saved data or initialize defaults
    console.log('Loading initial data...');
  }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PulseBeatsApp();
});

// Export for global access
window.PulseBeatsApp = PulseBeatsApp;