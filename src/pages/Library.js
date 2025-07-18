// Advanced Library Management Page
const { ipcRenderer } = require('electron');

class LibraryPage {
  constructor(container) {
    this.container = container;
    this.currentView = 'tracks';
    this.sortBy = 'title';
    this.sortOrder = 'asc';
    this.filterText = '';
    this.selectedTracks = new Set();
    
    // Library data
    this.tracks = [];
    this.artists = [];
    this.albums = [];
    this.genres = [];
    this.playlists = [];
    
    // View settings
    this.viewSettings = {
      tracks: { columns: ['title', 'artist', 'album', 'duration'], layout: 'list' },
      artists: { layout: 'grid' },
      albums: { layout: 'grid' },
      genres: { layout: 'list' },
      playlists: { layout: 'list' }
    };
    
    this.init();
  }
  
  async init() {
    try {
      await this.loadLibraryData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing library:', error);
      this.showError('Failed to load library');
    }
  }
  
  async loadLibraryData() {
    try {
      // Load library data from main process
      this.tracks = await ipcRenderer.invoke('get-all-tracks') || [];
      this.artists = await ipcRenderer.invoke('get-all-artists') || [];
      this.albums = await ipcRenderer.invoke('get-all-albums') || [];
      this.genres = await ipcRenderer.invoke('get-all-genres') || [];
      this.playlists = await ipcRenderer.invoke('get-playlists') || [];
      
      // Load library stats
      this.libraryStats = await ipcRenderer.invoke('get-library-stats') || {};
    } catch (error) {
      console.error('Error loading library data:', error);
      throw error;
    }
  }  
  
render() {
    this.container.innerHTML = `
      <div id="library-page" class="page">
        <!-- Library Header -->
        <div class="library-header">
          <div class="library-title">
            <h2>Music Library</h2>
            <div class="library-stats">
              <span>${this.libraryStats.trackCount || 0} tracks</span>
              <span>•</span>
              <span>${this.libraryStats.artistCount || 0} artists</span>
              <span>•</span>
              <span>${this.libraryStats.albumCount || 0} albums</span>
            </div>
          </div>
          
          <div class="library-actions">
            <button class="btn" id="btn-scan-library">🔄 Scan Library</button>
            <button class="btn" id="btn-import-playlist">📁 Import</button>
          </div>
        </div>
        
        <!-- Library Navigation -->
        <div class="library-nav">
          <div class="library-tabs">
            <button class="tab-btn ${this.currentView === 'tracks' ? 'active' : ''}" data-view="tracks">🎵 Tracks</button>
            <button class="tab-btn ${this.currentView === 'artists' ? 'active' : ''}" data-view="artists">👤 Artists</button>
            <button class="tab-btn ${this.currentView === 'albums' ? 'active' : ''}" data-view="albums">💿 Albums</button>
            <button class="tab-btn ${this.currentView === 'genres' ? 'active' : ''}" data-view="genres">🎭 Genres</button>
            <button class="tab-btn ${this.currentView === 'playlists' ? 'active' : ''}" data-view="playlists">📋 Playlists</button>
          </div>
          
          <div class="library-controls">
            <div class="search-container">
              <input type="text" id="library-search" placeholder="Search library..." value="${this.filterText}" class="search-input">
              <button class="btn-icon" id="btn-clear-search" title="Clear Search">✕</button>
            </div>
            
            <div class="sort-container">
              <select id="sort-select" class="sort-select">
                ${this.renderSortOptions()}
              </select>
              <button class="btn-icon" id="btn-sort-order" title="Sort Order">
                ${this.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Library Content -->
        <div class="library-content" id="library-content">
          ${this.renderCurrentView()}
        </div>
      </div>
    `;
  }  

  renderSortOptions() {
    const options = {
      tracks: [
        { value: 'title', label: 'Title' },
        { value: 'artist', label: 'Artist' },
        { value: 'album', label: 'Album' },
        { value: 'duration', label: 'Duration' }
      ],
      artists: [
        { value: 'name', label: 'Name' },
        { value: 'trackCount', label: 'Track Count' }
      ],
      albums: [
        { value: 'title', label: 'Title' },
        { value: 'artist', label: 'Artist' },
        { value: 'year', label: 'Year' }
      ]
    };
    
    const currentOptions = options[this.currentView] || options.tracks;
    
    return currentOptions.map(option => 
      `<option value="${option.value}" ${this.sortBy === option.value ? 'selected' : ''}>
        ${option.label}
      </option>`
    ).join('');
  }
  
  renderCurrentView() {
    switch (this.currentView) {
      case 'tracks':
        return this.renderTracksView();
      case 'artists':
        return this.renderArtistsView();
      case 'albums':
        return this.renderAlbumsView();
      case 'genres':
        return this.renderGenresView();
      case 'playlists':
        return this.renderPlaylistsView();
      default:
        return this.renderTracksView();
    }
  }
  
  renderTracksView() {
    const filteredTracks = this.getFilteredAndSortedData(this.tracks);
    
    if (filteredTracks.length === 0) {
      return this.renderEmptyState('No tracks found');
    }
    
    return this.renderTracksTable(filteredTracks);
  }
  
  renderTracksTable(tracks) {
    return `
      <div class="tracks-table-container">
        <table class="tracks-table">
          <thead>
            <tr>
              <th class="play-column"></th>
              <th>Title</th>
              <th>Artist</th>
              <th>Album</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${tracks.map(track => this.renderTrackRow(track)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  renderTrackRow(track) {
    return `
      <tr class="track-row" data-track-id="${track.id}">
        <td class="play-column">
          <button class="btn-play-track" title="Play Track">▶️</button>
        </td>
        <td class="title-column">${track.title}</td>
        <td class="artist-column">${track.artist}</td>
        <td class="album-column">${track.album}</td>
        <td class="duration-column">${this.formatDuration(track.duration)}</td>
      </tr>
    `;
  }  

  renderArtistsView() {
    const filteredArtists = this.getFilteredAndSortedData(this.artists);
    
    if (filteredArtists.length === 0) {
      return this.renderEmptyState('No artists found');
    }
    
    return `
      <div class="artists-grid">
        ${filteredArtists.map(artist => this.renderArtistCard(artist)).join('')}
      </div>
    `;
  }
  
  renderArtistCard(artist) {
    return `
      <div class="artist-card" data-artist="${artist.name}">
        <div class="artist-image">👤</div>
        <div class="artist-info">
          <div class="artist-name">${artist.name}</div>
          <div class="artist-stats">${artist.trackCount || 0} tracks</div>
        </div>
      </div>
    `;
  }
  
  renderAlbumsView() {
    const filteredAlbums = this.getFilteredAndSortedData(this.albums);
    
    if (filteredAlbums.length === 0) {
      return this.renderEmptyState('No albums found');
    }
    
    return `
      <div class="albums-grid">
        ${filteredAlbums.map(album => this.renderAlbumCard(album)).join('')}
      </div>
    `;
  }
  
  renderAlbumCard(album) {
    return `
      <div class="album-card" data-album="${album.title}" data-artist="${album.artist}">
        <div class="album-art-container">
          <img src="${album.albumArt || 'assets/images/default-album.png'}" 
               alt="${album.title}" class="album-art">
        </div>
        <div class="album-info">
          <div class="album-title">${album.title}</div>
          <div class="album-artist">${album.artist}</div>
        </div>
      </div>
    `;
  }
  
  renderGenresView() {
    return '<div class="genres-list">Genres view coming soon...</div>';
  }
  
  renderPlaylistsView() {
    return '<div class="playlists-list">Playlists view coming soon...</div>';
  }
  
  renderEmptyState(message) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-message">${message}</div>
        ${this.currentView === 'tracks' ? 
          '<button class="btn" id="btn-scan-library-empty">Scan Library</button>' : ''}
      </div>
    `;
  }  
  s
etupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });
    
    // Search
    const searchInput = document.getElementById('library-search');
    searchInput.addEventListener('input', (e) => {
      this.filterText = e.target.value;
      this.updateContent();
    });
    
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      this.filterText = '';
      searchInput.value = '';
      this.updateContent();
    });
    
    // Sort controls
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.updateContent();
    });
    
    document.getElementById('btn-sort-order').addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      document.getElementById('btn-sort-order').innerHTML = this.sortOrder === 'asc' ? '↑' : '↓';
      this.updateContent();
    });
    
    // Library actions
    document.getElementById('btn-scan-library').addEventListener('click', () => {
      this.scanLibrary();
    });
    
    // Content event delegation
    this.setupContentEventListeners();
  }
  
  setupContentEventListeners() {
    const content = document.getElementById('library-content');
    
    content.addEventListener('click', (e) => {
      const target = e.target;
      
      // Play buttons
      if (target.classList.contains('btn-play-track')) {
        this.playTrack(target.closest('.track-row').dataset.trackId);
      }
    });
    
    // Double-click to play
    content.addEventListener('dblclick', (e) => {
      const trackRow = e.target.closest('.track-row');
      if (trackRow) {
        this.playTrack(trackRow.dataset.trackId);
      }
    });
  }
  
  // Data filtering and sorting
  getFilteredAndSortedData(data) {
    let filtered = data;
    
    // Apply filter
    if (this.filterText) {
      const searchTerm = this.filterText.toLowerCase();
      filtered = data.filter(item => {
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal ? bVal.toLowerCase() : '';
      }
      
      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }  
  //
 View management
  switchView(view) {
    this.currentView = view;
    this.render();
    this.setupEventListeners();
  }
  
  updateContent() {
    const content = document.getElementById('library-content');
    content.innerHTML = this.renderCurrentView();
    this.setupContentEventListeners();
  }
  
  // Playback actions
  async playTrack(trackId) {
    try {
      const track = this.tracks.find(t => t.id === trackId);
      if (track) {
        // Send to audio engine via main process
        await ipcRenderer.invoke('play-track', track);
        
        // Add to recently played
        await ipcRenderer.invoke('add-to-recently-played', trackId);
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }
  
  // Library management
  async scanLibrary() {
    try {
      const scanBtn = document.getElementById('btn-scan-library');
      scanBtn.disabled = true;
      scanBtn.innerHTML = '⏳ Scanning...';
      
      await ipcRenderer.invoke('scan-library');
      
      // Reload library data
      await this.loadLibraryData();
      this.updateContent();
      
    } catch (error) {
      console.error('Error scanning library:', error);
      this.showError('Failed to scan library');
    } finally {
      const scanBtn = document.getElementById('btn-scan-library');
      scanBtn.disabled = false;
      scanBtn.innerHTML = '🔄 Scan Library';
    }
  }
  
  // Utility methods
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  showError(message) {
    console.error(message);
    // Could show a toast notification here
  }
  
  // Cleanup
  destroy() {
    this.selectedTracks.clear();
  }
}

module.exports = LibraryPage;