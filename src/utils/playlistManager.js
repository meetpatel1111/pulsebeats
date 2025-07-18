// Playlist Manager - Handles playlist operations
const { ipcRenderer } = require('electron');

class PlaylistManager {
  constructor() {
    this.playlists = [];
  }
  
  async loadPlaylists() {
    try {
      this.playlists = await ipcRenderer.invoke('get-playlists') || [];
      return this.playlists;
    } catch (error) {
      console.error('Error loading playlists:', error);
      throw error;
    }
  }
  
  async createPlaylist(name, tracks = []) {
    try {
      const playlist = await ipcRenderer.invoke('create-playlist', { name, tracks });
      this.playlists.push(playlist);
      return playlist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }
  
  async updatePlaylist(id, updates) {
    try {
      const updatedPlaylist = await ipcRenderer.invoke('update-playlist', { id, updates });
      
      // Update local playlist
      const index = this.playlists.findIndex(p => p.id === id);
      if (index !== -1) {
        this.playlists[index] = updatedPlaylist;
      }
      
      return updatedPlaylist;
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }
  
  async deletePlaylist(id) {
    try {
      await ipcRenderer.invoke('delete-playlist', id);
      
      // Remove from local playlists
      this.playlists = this.playlists.filter(p => p.id !== id);
      
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }
  
  async addTrackToPlaylist(playlistId, trackId) {
    try {
      const updatedPlaylist = await ipcRenderer.invoke('add-track-to-playlist', { playlistId, trackId });
      
      // Update local playlist
      const index = this.playlists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        this.playlists[index] = updatedPlaylist;
      }
      
      return updatedPlaylist;
    } catch (error) {
      console.error('Error adding track to playlist:', error);
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
      
      return updatedPlaylist;
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      throw error;
    }
  }
  
  getPlaylist(id) {
    return this.playlists.find(p => p.id === id);
  }
  
  getPlaylistTracks(playlistId, allTracks) {
    const playlist = this.getPlaylist(playlistId);
    if (!playlist) return [];
    
    return playlist.tracks.map(trackId => {
      return allTracks.find(t => t.id === trackId);
    }).filter(track => track !== undefined);
  }
}

// Export singleton instance
const playlistManager = new PlaylistManager();
module.exports = playlistManager;