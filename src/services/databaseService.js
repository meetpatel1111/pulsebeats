// Database Service - Real-time JSON database for PulseBeats
const { ipcRenderer } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class DatabaseService extends EventEmitter {
  constructor() {
    super();
    this.data = {
      tracks: [],
      playlists: [],
      favorites: [],
      recentlyPlayed: [],
      statistics: {
        mostPlayed: [],
        playHistory: []
      },
      smartPlaylists: [],
      userProfiles: [],
      settings: {},
      lyrics: {},
      equalizer: {
        presets: []
      }
    };
    
    this.dbPath = '';
    this.isInitialized = false;
    this.autoSaveInterval = null;
    this.saveDebounceTimeout = null;
  }
  
  async initialize(dbPath) {
    try {
      this.dbPath = dbPath || path.join(process.env.APPDATA || process.env.HOME, '.pulsebeats', 'database.json');
      
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });
      
      // Try to load existing database
      try {
        const data = await fs.readFile(this.dbPath, 'utf8');
        this.data = JSON.parse(data);
        console.log('Database loaded successfully');
      } catch (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, create it
          await this.save();
          console.log('New database created');
        } else {
          console.error('Error parsing database file:', err);
          throw err;
        }
      }
      
      // Start auto-save interval (every 5 minutes)
      this.autoSaveInterval = setInterval(() => this.save(), 5 * 60 * 1000);
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  async save() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
      this.emit('saved');
      return true;
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }
  
  // Debounced save to prevent too many writes
  debouncedSave() {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    
    this.saveDebounceTimeout = setTimeout(() => this.save(), 2000);
  }
  
  // Generic CRUD operations
  get(collection, id = null) {
    if (!this.data[collection]) {
      return null;
    }
    
    if (id === null) {
      return this.data[collection];
    }
    
    if (Array.isArray(this.data[collection])) {
      return this.data[collection].find(item => item.id === id);
    }
    
    return this.data[collection][id];
  }
  
  set(collection, data, id = null) {
    if (!this.data[collection]) {
      this.data[collection] = Array.isArray(data) ? [] : {};
    }
    
    if (id === null) {
      this.data[collection] = data;
    } else if (Array.isArray(this.data[collection])) {
      const index = this.data[collection].findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.data[collection][index] = { ...this.data[collection][index], ...data };
      } else {
        this.data[collection].push({ id, ...data });
      }
    } else {
      this.data[collection][id] = data;
    }
    
    this.debouncedSave();
    this.emit('updated', { collection, id, data });
    
    return id === null ? this.data[collection] : (Array.isArray(this.data[collection]) ? 
      this.data[collection].find(item => item.id === id) : this.data[collection][id]);
  }
  
  remove(collection, id) {
    if (!this.data[collection]) {
      return false;
    }
    
    if (Array.isArray(this.data[collection])) {
      const index = this.data[collection].findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.data[collection].splice(index, 1);
        this.debouncedSave();
        this.emit('removed', { collection, id });
        return true;
      }
    } else if (this.data[collection][id]) {
      delete this.data[collection][id];
      this.debouncedSave();
      this.emit('removed', { collection, id });
      return true;
    }
    
    return false;
  }
  
  // Specific operations for tracks
  addTrack(track) {
    if (!track.id) {
      throw new Error('Track must have an ID');
    }
    
    const existingTrack = this.data.tracks.find(t => t.id === track.id);
    
    if (existingTrack) {
      // Update existing track
      Object.assign(existingTrack, track);
    } else {
      // Add new track
      this.data.tracks.push(track);
    }
    
    this.debouncedSave();
    this.emit('track-added', track);
    
    return track;
  }
  
  updateTrack(id, updates) {
    const track = this.data.tracks.find(t => t.id === id);
    
    if (!track) {
      throw new Error(`Track with ID ${id} not found`);
    }
    
    Object.assign(track, updates);
    
    this.debouncedSave();
    this.emit('track-updated', track);
    
    return track;
  }
  
  removeTrack(id) {
    const index = this.data.tracks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.data.tracks.splice(index, 1);
    
    // Also remove from playlists
    this.data.playlists.forEach(playlist => {
      playlist.tracks = playlist.tracks.filter(trackId => trackId !== id);
    });
    
    // Remove from favorites
    this.data.favorites = this.data.favorites.filter(trackId => trackId !== id);
    
    // Remove from recently played
    this.data.recentlyPlayed = this.data.recentlyPlayed.filter(item => item.trackId !== id);
    
    this.debouncedSave();
    this.emit('track-removed', id);
    
    return true;
  }
  
  // Playlist operations
  createPlaylist(name, tracks = []) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const playlist = {
      id,
      name,
      tracks,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };
    
    this.data.playlists.push(playlist);
    
    this.debouncedSave();
    this.emit('playlist-created', playlist);
    
    return playlist;
  }
  
  updatePlaylist(id, updates) {
    const playlist = this.data.playlists.find(p => p.id === id);
    
    if (!playlist) {
      throw new Error(`Playlist with ID ${id} not found`);
    }
    
    Object.assign(playlist, updates, {
      dateModified: new Date().toISOString()
    });
    
    this.debouncedSave();
    this.emit('playlist-updated', playlist);
    
    return playlist;
  }
  
  deletePlaylist(id) {
    const index = this.data.playlists.findIndex(p => p.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.data.playlists.splice(index, 1);
    
    this.debouncedSave();
    this.emit('playlist-deleted', id);
    
    return true;
  }
  
  addTrackToPlaylist(playlistId, trackId) {
    const playlist = this.data.playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }
    
    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      playlist.dateModified = new Date().toISOString();
      
      this.debouncedSave();
      this.emit('playlist-track-added', { playlistId, trackId });
    }
    
    return playlist;
  }
  
  removeTrackFromPlaylist(playlistId, trackId) {
    const playlist = this.data.playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }
    
    playlist.tracks = playlist.tracks.filter(id => id !== trackId);
    playlist.dateModified = new Date().toISOString();
    
    this.debouncedSave();
    this.emit('playlist-track-removed', { playlistId, trackId });
    
    return playlist;
  }
  
  // Smart playlists
  createSmartPlaylist(name, rules) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const smartPlaylist = {
      id,
      name,
      rules,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };
    
    this.data.smartPlaylists.push(smartPlaylist);
    
    this.debouncedSave();
    this.emit('smart-playlist-created', smartPlaylist);
    
    return smartPlaylist;
  }
  
  getSmartPlaylistTracks(id) {
    const smartPlaylist = this.data.smartPlaylists.find(p => p.id === id);
    
    if (!smartPlaylist) {
      throw new Error(`Smart playlist with ID ${id} not found`);
    }
    
    return this.filterTracksByRules(smartPlaylist.rules);
  }
  
  filterTracksByRules(rules) {
    return this.data.tracks.filter(track => {
      // Check if track matches all rules
      return rules.every(rule => {
        const { field, operator, value } = rule;
        
        if (!track[field]) {
          return false;
        }
        
        switch (operator) {
          case 'equals':
            return track[field] === value;
          case 'contains':
            return track[field].toString().toLowerCase().includes(value.toLowerCase());
          case 'startsWith':
            return track[field].toString().toLowerCase().startsWith(value.toLowerCase());
          case 'endsWith':
            return track[field].toString().toLowerCase().endsWith(value.toLowerCase());
          case 'greaterThan':
            return track[field] > value;
          case 'lessThan':
            return track[field] < value;
          default:
            return false;
        }
      });
    });
  }
  
  // Favorites
  addToFavorites(trackId) {
    if (!this.data.favorites.includes(trackId)) {
      this.data.favorites.push(trackId);
      this.debouncedSave();
      this.emit('favorite-added', trackId);
    }
    
    return this.data.favorites;
  }
  
  removeFromFavorites(trackId) {
    this.data.favorites = this.data.favorites.filter(id => id !== trackId);
    this.debouncedSave();
    this.emit('favorite-removed', trackId);
    
    return this.data.favorites;
  }
  
  getFavorites() {
    return this.data.favorites.map(id => this.data.tracks.find(track => track.id === id)).filter(Boolean);
  }
  
  // Recently played
  addToRecentlyPlayed(trackId) {
    // Remove if already exists
    this.data.recentlyPlayed = this.data.recentlyPlayed.filter(item => item.trackId !== trackId);
    
    // Add to beginning
    this.data.recentlyPlayed.unshift({
      trackId,
      timestamp: new Date().toISOString()
    });
    
    // Limit to 100 items
    if (this.data.recentlyPlayed.length > 100) {
      this.data.recentlyPlayed = this.data.recentlyPlayed.slice(0, 100);
    }
    
    this.debouncedSave();
    this.emit('recently-played-updated', this.data.recentlyPlayed);
    
    return this.data.recentlyPlayed;
  }
  
  getRecentlyPlayed(limit = 20) {
    return this.data.recentlyPlayed
      .slice(0, limit)
      .map(item => ({
        track: this.data.tracks.find(track => track.id === item.trackId),
        timestamp: item.timestamp
      }))
      .filter(item => item.track); // Filter out tracks that no longer exist
  }
  
  // Play statistics
  incrementPlayCount(trackId) {
    const track = this.data.tracks.find(t => t.id === trackId);
    
    if (!track) {
      return;
    }
    
    // Update track play count
    track.playCount = (track.playCount || 0) + 1;
    track.lastPlayed = new Date().toISOString();
    
    // Update most played
    let mostPlayed = this.data.statistics.mostPlayed.find(item => item.trackId === trackId);
    
    if (mostPlayed) {
      mostPlayed.count++;
    } else {
      this.data.statistics.mostPlayed.push({
        trackId,
        count: 1
      });
    }
    
    // Sort most played
    this.data.statistics.mostPlayed.sort((a, b) => b.count - a.count);
    
    // Add to play history
    this.data.statistics.playHistory.unshift({
      trackId,
      timestamp: new Date().toISOString()
    });
    
    // Limit play history to 1000 items
    if (this.data.statistics.playHistory.length > 1000) {
      this.data.statistics.playHistory = this.data.statistics.playHistory.slice(0, 1000);
    }
    
    this.debouncedSave();
    this.emit('play-count-updated', { trackId, count: track.playCount });
    
    return track.playCount;
  }
  
  getMostPlayed(limit = 20) {
    return this.data.statistics.mostPlayed
      .slice(0, limit)
      .map(item => ({
        track: this.data.tracks.find(track => track.id === item.trackId),
        count: item.count
      }))
      .filter(item => item.track); // Filter out tracks that no longer exist
  }
  
  // Lyrics
  saveLyrics(trackId, lyrics) {
    this.data.lyrics[trackId] = lyrics;
    this.debouncedSave();
    this.emit('lyrics-saved', { trackId, lyrics });
    
    return lyrics;
  }
  
  getLyrics(trackId) {
    return this.data.lyrics[trackId] || null;
  }
  
  // Equalizer presets
  saveEqualizerPreset(name, values) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const preset = {
      id,
      name,
      values,
      dateCreated: new Date().toISOString()
    };
    
    this.data.equalizer.presets.push(preset);
    
    this.debouncedSave();
    this.emit('equalizer-preset-saved', preset);
    
    return preset;
  }
  
  getEqualizerPresets() {
    return this.data.equalizer.presets;
  }
  
  deleteEqualizerPreset(id) {
    this.data.equalizer.presets = this.data.equalizer.presets.filter(preset => preset.id !== id);
    this.debouncedSave();
    this.emit('equalizer-preset-deleted', id);
    
    return this.data.equalizer.presets;
  }
  
  // User profiles
  createUserProfile(name, settings = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const profile = {
      id,
      name,
      settings,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };
    
    this.data.userProfiles.push(profile);
    
    this.debouncedSave();
    this.emit('user-profile-created', profile);
    
    return profile;
  }
  
  updateUserProfile(id, updates) {
    const profile = this.data.userProfiles.find(p => p.id === id);
    
    if (!profile) {
      throw new Error(`User profile with ID ${id} not found`);
    }
    
    Object.assign(profile, updates, {
      dateModified: new Date().toISOString()
    });
    
    this.debouncedSave();
    this.emit('user-profile-updated', profile);
    
    return profile;
  }
  
  deleteUserProfile(id) {
    this.data.userProfiles = this.data.userProfiles.filter(profile => profile.id !== id);
    this.debouncedSave();
    this.emit('user-profile-deleted', id);
    
    return this.data.userProfiles;
  }
  
  // Cleanup on exit
  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    
    return this.save();
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService;