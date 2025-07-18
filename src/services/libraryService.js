// Library Service - Handles music library management
const { ipcRenderer } = require('electron');
const path = require('path');

class LibraryService {
  constructor() {
    this.tracks = [];
    this.artists = [];
    this.albums = [];
    this.genres = [];
    this.playlists = [];
    this.isLoading = false;
    this.listeners = {};
  }
  
  async loadLibrary() {
    this.isLoading = true;
    this.emit('loadingStateChanged', { isLoading: true });
    
    try {
      // Get library paths from main process
      const paths = await ipcRenderer.invoke('get-library-paths');
      
      if (paths.length === 0) {
        this.isLoading = false;
        this.emit('loadingStateChanged', { isLoading: false });
        return { success: false, message: 'No library paths configured' };
      }
      
      // Request library scan from main process
      const tracks = await ipcRenderer.invoke('scan-library', paths);
      
      // Process tracks
      this.processLibrary(tracks);
      
      this.isLoading = false;
      this.emit('loadingStateChanged', { isLoading: false });
      this.emit('libraryLoaded', { 
        trackCount: this.tracks.length,
        artistCount: this.artists.length,
        albumCount: this.albums.length,
        genreCount: this.genres.length
      });
      
      return { success: true, trackCount: this.tracks.length };
    } catch (error) {
      console.error('Error loading library:', error);
      this.isLoading = false;
      this.emit('loadingStateChanged', { isLoading: false });
      this.emit('error', { message: 'Failed to load library', details: error });
      
      return { success: false, message: error.message };
    }
  }
  
  processLibrary(tracks) {
    this.tracks = tracks;
    
    // Extract unique artists
    const artistMap = new Map();
    tracks.forEach(track => {
      if (track.artist && !artistMap.has(track.artist)) {
        artistMap.set(track.artist, {
          name: track.artist,
          albums: new Set(),
          trackCount: 0
        });
      }
      
      if (track.artist) {
        const artist = artistMap.get(track.artist);
        artist.trackCount++;
        if (track.album) {
          artist.albums.add(track.album);
        }
      }
    });
    
    // Convert artist map to array
    this.artists = Array.from(artistMap.values()).map(artist => ({
      name: artist.name,
      albums: Array.from(artist.albums),
      trackCount: artist.trackCount
    }));
    
    // Extract unique albums
    const albumMap = new Map();
    tracks.forEach(track => {
      if (track.album && !albumMap.has(track.album)) {
        albumMap.set(track.album, {
          title: track.album,
          artist: track.artist,
          year: track.year,
          tracks: [],
          albumArt: track.albumArt
        });
      }
      
      if (track.album) {
        const album = albumMap.get(track.album);
        album.tracks.push(track);
      }
    });
    
    // Convert album map to array
    this.albums = Array.from(albumMap.values());
    
    // Extract unique genres
    const genreSet = new Set();
    tracks.forEach(track => {
      if (track.genre) {
        genreSet.add(track.genre);
      }
    });
    
    this.genres = Array.from(genreSet);
    
    // Load playlists
    this.loadPlaylists();
  }
  
  async loadPlaylists() {
    try {
      // Get playlists from main process
      this.playlists = await ipcRenderer.invoke('get-playlists');
      this.emit('playlistsLoaded', { playlists: this.playlists });
    } catch (error) {
      console.error('Error loading playlists:', error);
      this.emit('error', { message: 'Failed to load playlists', details: error });
    }
  }
  
  async createPlaylist(name) {
    try {
      const playlist = await ipcRenderer.invoke('create-playlist', { name, tracks: [] });
      this.playlists.push(playlist);
      this.emit('playlistCreated', { playlist });
      return playlist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      this.emit('error', { message: 'Failed to create playlist', details: error });
      throw error;
    }
  }
  
  async updatePlaylist(playlistId, updates) {
    try {
      const updatedPlaylist = await ipcRenderer.invoke('update-playlist', { id: playlistId, updates });
      
      // Update local playlist
      const index = this.playlists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        this.playlists[index] = updatedPlaylist;
      }
      
      this.emit('playlistUpdated', { playlist: updatedPlaylist });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error updating playlist:', error);
      this.emit('error', { message: 'Failed to update playlist', details: error });
      throw error;
    }
  }
  
  async deletePlaylist(playlistId) {
    try {
      await ipcRenderer.invoke('delete-playlist', playlistId);
      
      // Remove from local playlists
      this.playlists = this.playlists.filter(p => p.id !== playlistId);
      
      this.emit('playlistDeleted', { playlistId });
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      this.emit('error', { message: 'Failed to delete playlist', details: error });
      throw error;
    }
  }
  
  async addTrackToPlaylist(playlistId, trackId) {
    try {
      const playlist = this.playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }
      
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) {
        throw new Error('Track not found');
      }
      
      // Check if track is already in playlist
      if (playlist.tracks.includes(trackId)) {
        return playlist; // Track already in playlist
      }
      
      // Add track to playlist
      const updatedPlaylist = await ipcRenderer.invoke('add-track-to-playlist', { playlistId, trackId });
      
      // Update local playlist
      const index = this.playlists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        this.playlists[index] = updatedPlaylist;
      }
      
      this.emit('playlistUpdated', { playlist: updatedPlaylist });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      this.emit('error', { message: 'Failed to add track to playlist', details: error });
      throw error;
    }
  }
  
  async removeTrackFromPlaylist(playlistId, trackId) {
    try {
      const updatedPlaylist = await ipcRenderer.invoke('remove-track-from-playlist', { playlistId, trackId });
      
      // Update local playlist
      const index = this.playlists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        this.playlists[index] = updatedPlaylist;
      }
      
      this.emit('playlistUpdated', { playlist: updatedPlaylist });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      this.emit('error', { message: 'Failed to remove track from playlist', details: error });
      throw error;
    }
  }
  
  async addLibraryPath(folderPath) {
    try {
      const paths = await ipcRenderer.invoke('add-library-path', folderPath);
      this.emit('libraryPathsChanged', { paths });
      return paths;
    } catch (error) {
      console.error('Error adding library path:', error);
      this.emit('error', { message: 'Failed to add library path', details: error });
      throw error;
    }
  }
  
  async removeLibraryPath(folderPath) {
    try {
      const paths = await ipcRenderer.invoke('remove-library-path', folderPath);
      this.emit('libraryPathsChanged', { paths });
      return paths;
    } catch (error) {
      console.error('Error removing library path:', error);
      this.emit('error', { message: 'Failed to remove library path', details: error });
      throw error;
    }
  }
  
  async getLibraryPaths() {
    try {
      return await ipcRenderer.invoke('get-library-paths');
    } catch (error) {
      console.error('Error getting library paths:', error);
      this.emit('error', { message: 'Failed to get library paths', details: error });
      throw error;
    }
  }
  
  async updateTrackMetadata(trackId, updates) {
    try {
      const updatedTrack = await ipcRenderer.invoke('update-track-metadata', { trackId, updates });
      
      // Update local track
      const index = this.tracks.findIndex(t => t.id === trackId);
      if (index !== -1) {
        this.tracks[index] = { ...this.tracks[index], ...updatedTrack };
      }
      
      this.emit('trackUpdated', { track: this.tracks[index] });
      return this.tracks[index];
    } catch (error) {
      console.error('Error updating track metadata:', error);
      this.emit('error', { message: 'Failed to update track metadata', details: error });
      throw error;
    }
  }
  
  // Search functions
  searchTracks(query) {
    if (!query) return this.tracks;
    
    const lowerQuery = query.toLowerCase();
    return this.tracks.filter(track => 
      (track.title && track.title.toLowerCase().includes(lowerQuery)) ||
      (track.artist && track.artist.toLowerCase().includes(lowerQuery)) ||
      (track.album && track.album.toLowerCase().includes(lowerQuery))
    );
  }
  
  searchArtists(query) {
    if (!query) return this.artists;
    
    const lowerQuery = query.toLowerCase();
    return this.artists.filter(artist => 
      artist.name.toLowerCase().includes(lowerQuery)
    );
  }
  
  searchAlbums(query) {
    if (!query) return this.albums;
    
    const lowerQuery = query.toLowerCase();
    return this.albums.filter(album => 
      (album.title && album.title.toLowerCase().includes(lowerQuery)) ||
      (album.artist && album.artist.toLowerCase().includes(lowerQuery))
    );
  }
  
  // Filter functions
  getTracksByArtist(artistName) {
    return this.tracks.filter(track => track.artist === artistName);
  }
  
  getTracksByAlbum(albumTitle) {
    return this.tracks.filter(track => track.album === albumTitle);
  }
  
  getTracksByGenre(genre) {
    return this.tracks.filter(track => track.genre === genre);
  }
  
  getAlbumsByArtist(artistName) {
    return this.albums.filter(album => album.artist === artistName);
  }
  
  // Sort functions
  sortTracks(tracks, sortBy = 'title', sortOrder = 'asc') {
    return [...tracks].sort((a, b) => {
      let valueA = a[sortBy] || '';
      let valueB = b[sortBy] || '';
      
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // Event handling
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
const libraryService = new LibraryService();
module.exports = libraryService;