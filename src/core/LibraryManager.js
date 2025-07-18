// Library Management System for PulseBeats
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const mm = require('music-metadata');
const crypto = require('crypto');

class LibraryManager extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    
    // Library data
    this.tracks = new Map();
    this.artists = new Map();
    this.albums = new Map();
    this.genres = new Map();
    this.playlists = new Map();
    this.smartPlaylists = new Map();
    this.favorites = new Set();
    this.recentlyPlayed = [];
    this.recentlyAdded = [];
    
    // Library paths
    this.libraryPaths = [];
    this.watchedFolders = new Set();
    
    // Supported formats
    this.supportedFormats = [
      '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac',
      '.alac', '.ape', '.wv', '.opus', '.wma', '.mp4'
    ];
    
    // Scan settings
    this.scanInProgress = false;
    this.scanStats = {
      totalFiles: 0,
      processedFiles: 0,
      addedTracks: 0,
      errors: 0
    };
    
    this.loadLibraryData();
  }
  
  // LIBRARY INITIALIZATION
  
  async loadLibraryData() {
    try {
      // Load existing library data
      const savedTracks = this.store.get('tracks') || [];
      const savedPlaylists = this.store.get('playlists') || [];
      const savedFavorites = this.store.get('favorites') || [];
      const savedRecentlyPlayed = this.store.get('recentlyPlayed') || [];
      
      // Rebuild maps from saved data
      this.rebuildLibraryMaps(savedTracks);
      this.rebuildPlaylists(savedPlaylists);
      this.favorites = new Set(savedFavorites);
      this.recentlyPlayed = savedRecentlyPlayed;
      
      // Load library paths
      this.libraryPaths = this.store.get('libraryPaths') || [];
      
      this.emit('libraryLoaded', {
        trackCount: this.tracks.size,
        artistCount: this.artists.size,
        albumCount: this.albums.size,
        playlistCount: this.playlists.size
      });
      
    } catch (error) {
      this.emit('error', `Failed to load library: ${error.message}`);
    }
  }
  
  rebuildLibraryMaps(tracks) {
    this.tracks.clear();
    this.artists.clear();
    this.albums.clear();
    this.genres.clear();
    
    tracks.forEach(track => {
      this.tracks.set(track.id, track);
      this.indexTrack(track);
    });
  }
  
  rebuildPlaylists(playlists) {
    this.playlists.clear();
    playlists.forEach(playlist => {
      this.playlists.set(playlist.id, playlist);
    });
  }
  
  // LIBRARY SCANNING
  
  async scanLibrary(paths = null, options = {}) {
    if (this.scanInProgress) {
      throw new Error('Library scan already in progress');
    }
    
    const scanPaths = paths || this.libraryPaths;
    if (scanPaths.length === 0) {
      throw new Error('No library paths configured');
    }
    
    this.scanInProgress = true;
    this.scanStats = {
      totalFiles: 0,
      processedFiles: 0,
      addedTracks: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    this.emit('scanStarted', { paths: scanPaths });
    
    try {
      // First pass: count total files
      for (const scanPath of scanPaths) {
        await this.countFiles(scanPath);
      }
      
      // Second pass: process files
      for (const scanPath of scanPaths) {
        await this.scanDirectory(scanPath, options);
      }
      
      // Update library indexes
      this.updateLibraryIndexes();
      
      // Save to store
      await this.saveLibraryData();
      
      this.scanStats.endTime = Date.now();
      this.scanStats.duration = this.scanStats.endTime - this.scanStats.startTime;
      
      this.emit('scanCompleted', this.scanStats);
      
    } catch (error) {
      this.emit('scanError', error.message);
      throw error;
    } finally {
      this.scanInProgress = false;
    }
  }
  
  async countFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.countFiles(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.supportedFormats.includes(ext)) {
            this.scanStats.totalFiles++;
          }
        }
      }
    } catch (error) {
      console.warn(`Error counting files in ${dirPath}:`, error.message);
    }
  }
  
  async scanDirectory(dirPath, options = {}) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, options);
        } else if (entry.isFile()) {
          await this.processAudioFile(fullPath, options);
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${dirPath}:`, error.message);
      this.scanStats.errors++;
    }
  }
  
  async processAudioFile(filePath, options = {}) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        return;
      }
      
      this.scanStats.processedFiles++;
      
      // Generate unique ID
      const id = crypto.createHash('md5').update(filePath).digest('hex');
      
      // Check if track already exists
      if (this.tracks.has(id) && !options.forceUpdate) {
        this.emit('scanProgress', {
          ...this.scanStats,
          currentFile: path.basename(filePath),
          status: 'skipped'
        });
        return;
      }
      
      this.emit('scanProgress', {
        ...this.scanStats,
        currentFile: path.basename(filePath),
        status: 'processing'
      });
      
      // Parse metadata
      const metadata = await mm.parseFile(filePath);
      const stats = await fs.stat(filePath);
      
      // Create track object
      const track = {
        id,
        path: filePath,
        filename: path.basename(filePath),
        title: metadata.common.title || path.parse(filePath).name,
        artist: metadata.common.artist || 'Unknown Artist',
        albumArtist: metadata.common.albumartist || metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        genre: metadata.common.genre ? metadata.common.genre[0] : 'Unknown',
        year: metadata.common.year,
        track: metadata.common.track?.no,
        disc: metadata.common.disk?.no,
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        bitsPerSample: metadata.format.bitsPerSample,
        format: metadata.format.container,
        codec: metadata.format.codec,
        fileSize: stats.size,
        dateAdded: new Date().toISOString(),
        dateModified: stats.mtime.toISOString(),
        playCount: 0,
        lastPlayed: null,
        rating: 0,
        tags: [],
        // Additional metadata
        composer: metadata.common.composer,
        comment: metadata.common.comment,
        lyrics: metadata.common.lyrics,
        bpm: metadata.common.bpm,
        key: metadata.common.key,
        // Audio analysis placeholders
        loudness: null,
        tempo: null,
        energy: null,
        danceability: null
      };
      
      // Extract album art if available
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        track.albumArt = await this.extractAlbumArt(metadata.common.picture[0], id);
      }
      
      // Add to library
      this.tracks.set(id, track);
      this.indexTrack(track);
      this.scanStats.addedTracks++;
      
      // Add to recently added
      this.addToRecentlyAdded(track);
      
      this.emit('trackAdded', track);
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      this.scanStats.errors++;
      this.emit('scanError', {
        file: filePath,
        error: error.message
      });
    }
  }
  
  async extractAlbumArt(picture, trackId) {
    try {
      // Save album art to cache directory
      const artDir = path.join(this.store.path, '..', 'albumart');
      await fs.mkdir(artDir, { recursive: true });
      
      const artPath = path.join(artDir, `${trackId}.${picture.format.split('/')[1]}`);
      await fs.writeFile(artPath, picture.data);
      
      return artPath;
    } catch (error) {
      console.warn('Failed to extract album art:', error.message);
      return null;
    }
  }
  
  // LIBRARY INDEXING
  
  indexTrack(track) {
    // Index by artist
    if (!this.artists.has(track.artist)) {
      this.artists.set(track.artist, {
        name: track.artist,
        albums: new Set(),
        tracks: new Set(),
        genres: new Set()
      });
    }
    const artist = this.artists.get(track.artist);
    artist.tracks.add(track.id);
    artist.albums.add(track.album);
    artist.genres.add(track.genre);
    
    // Index by album
    const albumKey = `${track.albumArtist}::${track.album}`;
    if (!this.albums.has(albumKey)) {
      this.albums.set(albumKey, {
        title: track.album,
        artist: track.albumArtist,
        year: track.year,
        genre: track.genre,
        tracks: new Set(),
        totalDuration: 0,
        albumArt: track.albumArt
      });
    }
    const album = this.albums.get(albumKey);
    album.tracks.add(track.id);
    album.totalDuration += track.duration || 0;
    if (track.albumArt && !album.albumArt) {
      album.albumArt = track.albumArt;
    }
    
    // Index by genre
    if (!this.genres.has(track.genre)) {
      this.genres.set(track.genre, {
        name: track.genre,
        tracks: new Set(),
        artists: new Set(),
        albums: new Set()
      });
    }
    const genre = this.genres.get(track.genre);
    genre.tracks.add(track.id);
    genre.artists.add(track.artist);
    genre.albums.add(albumKey);
  }
  
  updateLibraryIndexes() {
    // Clean up empty entries
    for (const [artistName, artist] of this.artists) {
      if (artist.tracks.size === 0) {
        this.artists.delete(artistName);
      }
    }
    
    for (const [albumKey, album] of this.albums) {
      if (album.tracks.size === 0) {
        this.albums.delete(albumKey);
      }
    }
    
    for (const [genreName, genre] of this.genres) {
      if (genre.tracks.size === 0) {
        this.genres.delete(genreName);
      }
    }
  }
  
  // LIBRARY QUERIES
  
  getAllTracks() {
    return Array.from(this.tracks.values());
  }
  
  getTrackById(id) {
    return this.tracks.get(id);
  }
  
  getTracksByArtist(artistName) {
    const artist = this.artists.get(artistName);
    if (!artist) return [];
    
    return Array.from(artist.tracks).map(id => this.tracks.get(id)).filter(Boolean);
  }
  
  getTracksByAlbum(albumTitle, artistName) {
    const albumKey = `${artistName}::${albumTitle}`;
    const album = this.albums.get(albumKey);
    if (!album) return [];
    
    return Array.from(album.tracks)
      .map(id => this.tracks.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.track || 0) - (b.track || 0));
  }
  
  getTracksByGenre(genreName) {
    const genre = this.genres.get(genreName);
    if (!genre) return [];
    
    return Array.from(genre.tracks).map(id => this.tracks.get(id)).filter(Boolean);
  }
  
  searchTracks(query, options = {}) {
    const results = {
      tracks: [],
      artists: [],
      albums: [],
      genres: []
    };
    
    const searchTerm = query.toLowerCase();
    const maxResults = options.maxResults || 50;
    
    // Search tracks
    for (const track of this.tracks.values()) {
      if (results.tracks.length >= maxResults) break;
      
      if (track.title.toLowerCase().includes(searchTerm) ||
          track.artist.toLowerCase().includes(searchTerm) ||
          track.album.toLowerCase().includes(searchTerm) ||
          track.genre.toLowerCase().includes(searchTerm)) {
        results.tracks.push(track);
      }
    }
    
    // Search artists
    for (const [name, artist] of this.artists) {
      if (results.artists.length >= maxResults) break;
      
      if (name.toLowerCase().includes(searchTerm)) {
        results.artists.push({
          name,
          trackCount: artist.tracks.size,
          albumCount: artist.albums.size
        });
      }
    }
    
    // Search albums
    for (const [key, album] of this.albums) {
      if (results.albums.length >= maxResults) break;
      
      if (album.title.toLowerCase().includes(searchTerm) ||
          album.artist.toLowerCase().includes(searchTerm)) {
        results.albums.push({
          ...album,
          trackCount: album.tracks.size
        });
      }
    }
    
    // Search genres
    for (const [name, genre] of this.genres) {
      if (results.genres.length >= maxResults) break;
      
      if (name.toLowerCase().includes(searchTerm)) {
        results.genres.push({
          name,
          trackCount: genre.tracks.size
        });
      }
    }
    
    return results;
  }
  
  // PLAYLIST MANAGEMENT
  
  createPlaylist(name, tracks = []) {
    const id = crypto.randomUUID();
    const playlist = {
      id,
      name,
      tracks: [...tracks],
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      description: '',
      isSmartPlaylist: false
    };
    
    this.playlists.set(id, playlist);
    this.saveLibraryData();
    this.emit('playlistCreated', playlist);
    
    return playlist;
  }
  
  createSmartPlaylist(name, rules) {
    const id = crypto.randomUUID();
    const playlist = {
      id,
      name,
      rules,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      description: '',
      isSmartPlaylist: true
    };
    
    this.smartPlaylists.set(id, playlist);
    this.saveLibraryData();
    this.emit('smartPlaylistCreated', playlist);
    
    return playlist;
  }
  
  getSmartPlaylistTracks(playlistId) {
    const playlist = this.smartPlaylists.get(playlistId);
    if (!playlist) return [];
    
    return this.getAllTracks().filter(track => {
      return playlist.rules.every(rule => this.evaluateRule(track, rule));
    });
  }
  
  evaluateRule(track, rule) {
    const { field, operator, value } = rule;
    const trackValue = track[field];
    
    if (trackValue === undefined || trackValue === null) return false;
    
    switch (operator) {
      case 'equals':
        return trackValue === value;
      case 'contains':
        return trackValue.toString().toLowerCase().includes(value.toLowerCase());
      case 'startsWith':
        return trackValue.toString().toLowerCase().startsWith(value.toLowerCase());
      case 'endsWith':
        return trackValue.toString().toLowerCase().endsWith(value.toLowerCase());
      case 'greaterThan':
        return Number(trackValue) > Number(value);
      case 'lessThan':
        return Number(trackValue) < Number(value);
      case 'between':
        return Number(trackValue) >= Number(value.min) && Number(trackValue) <= Number(value.max);
      default:
        return false;
    }
  }
  
  // FAVORITES AND RECENTLY PLAYED
  
  addToFavorites(trackId) {
    this.favorites.add(trackId);
    this.saveLibraryData();
    this.emit('favoriteAdded', trackId);
  }
  
  removeFromFavorites(trackId) {
    this.favorites.delete(trackId);
    this.saveLibraryData();
    this.emit('favoriteRemoved', trackId);
  }
  
  getFavorites() {
    return Array.from(this.favorites)
      .map(id => this.tracks.get(id))
      .filter(Boolean);
  }
  
  addToRecentlyPlayed(trackId) {
    // Remove if already exists
    this.recentlyPlayed = this.recentlyPlayed.filter(id => id !== trackId);
    
    // Add to beginning
    this.recentlyPlayed.unshift(trackId);
    
    // Limit to 100 items
    if (this.recentlyPlayed.length > 100) {
      this.recentlyPlayed = this.recentlyPlayed.slice(0, 100);
    }
    
    // Update track play count and last played
    const track = this.tracks.get(trackId);
    if (track) {
      track.playCount = (track.playCount || 0) + 1;
      track.lastPlayed = new Date().toISOString();
    }
    
    this.saveLibraryData();
    this.emit('recentlyPlayedUpdated', this.recentlyPlayed);
  }
  
  addToRecentlyAdded(track) {
    this.recentlyAdded.unshift(track.id);
    
    // Limit to 50 items
    if (this.recentlyAdded.length > 50) {
      this.recentlyAdded = this.recentlyAdded.slice(0, 50);
    }
  }
  
  getRecentlyPlayed() {
    return this.recentlyPlayed
      .map(id => this.tracks.get(id))
      .filter(Boolean);
  }
  
  getRecentlyAdded() {
    return this.recentlyAdded
      .map(id => this.tracks.get(id))
      .filter(Boolean);
  }
  
  // DATA PERSISTENCE
  
  async saveLibraryData() {
    try {
      this.store.set('tracks', Array.from(this.tracks.values()));
      this.store.set('playlists', Array.from(this.playlists.values()));
      this.store.set('smartPlaylists', Array.from(this.smartPlaylists.values()));
      this.store.set('favorites', Array.from(this.favorites));
      this.store.set('recentlyPlayed', this.recentlyPlayed);
      this.store.set('recentlyAdded', this.recentlyAdded);
    } catch (error) {
      this.emit('error', `Failed to save library data: ${error.message}`);
    }
  }
  
  // LIBRARY STATISTICS
  
  getLibraryStats() {
    const tracks = Array.from(this.tracks.values());
    const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const totalSize = tracks.reduce((sum, track) => sum + (track.fileSize || 0), 0);
    
    return {
      trackCount: this.tracks.size,
      artistCount: this.artists.size,
      albumCount: this.albums.size,
      genreCount: this.genres.size,
      playlistCount: this.playlists.size,
      smartPlaylistCount: this.smartPlaylists.size,
      favoriteCount: this.favorites.size,
      totalDuration,
      totalSize,
      averageBitrate: tracks.length > 0 ? 
        tracks.reduce((sum, track) => sum + (track.bitrate || 0), 0) / tracks.length : 0
    };
  }
  
  // CLEANUP
  
  destroy() {
    this.removeAllListeners();
    this.tracks.clear();
    this.artists.clear();
    this.albums.clear();
    this.genres.clear();
    this.playlists.clear();
    this.smartPlaylists.clear();
  }
}

module.exports = LibraryManager;