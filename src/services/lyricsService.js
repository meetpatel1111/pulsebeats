// Lyrics Service - Handles fetching and displaying lyrics
const { ipcRenderer } = require('electron');
const EventEmitter = require('events');
const databaseService = require('./databaseService');

class LyricsService extends EventEmitter {
  constructor() {
    super();
    this.currentLyrics = null;
    this.currentTrackId = null;
    this.isLoading = false;
    this.providers = [
      { name: 'Local', fetchFn: this.fetchLocalLyrics.bind(this) },
      { name: 'Musixmatch', fetchFn: this.fetchMusixmatchLyrics.bind(this) },
      { name: 'LRC File', fetchFn: this.fetchLRCFileLyrics.bind(this) }
    ];
  }
  
  async fetchLyrics(track) {
    if (!track) {
      this.currentLyrics = null;
      this.currentTrackId = null;
      this.emit('lyrics-changed', null);
      return null;
    }
    
    this.isLoading = true;
    this.emit('loading-changed', true);
    
    try {
      // First check if we have cached lyrics
      const cachedLyrics = await databaseService.getLyrics(track.id);
      
      if (cachedLyrics) {
        this.currentLyrics = cachedLyrics;
        this.currentTrackId = track.id;
        this.isLoading = false;
        this.emit('loading-changed', false);
        this.emit('lyrics-changed', cachedLyrics);
        return cachedLyrics;
      }
      
      // Try each provider in order
      for (const provider of this.providers) {
        try {
          const lyrics = await provider.fetchFn(track);
          
          if (lyrics) {
            // Save to database
            await databaseService.saveLyrics(track.id, lyrics);
            
            this.currentLyrics = lyrics;
            this.currentTrackId = track.id;
            this.isLoading = false;
            this.emit('loading-changed', false);
            this.emit('lyrics-changed', lyrics);
            return lyrics;
          }
        } catch (err) {
          console.error(`Error fetching lyrics from ${provider.name}:`, err);
        }
      }
      
      // No lyrics found
      this.currentLyrics = { text: 'No lyrics found', type: 'plain' };
      this.currentTrackId = track.id;
      this.isLoading = false;
      this.emit('loading-changed', false);
      this.emit('lyrics-changed', this.currentLyrics);
      
      // Save empty lyrics to avoid repeated searches
      await databaseService.saveLyrics(track.id, this.currentLyrics);
      
      return this.currentLyrics;
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      this.isLoading = false;
      this.emit('loading-changed', false);
      this.emit('error', error);
      return null;
    }
  }
  
  async fetchLocalLyrics(track) {
    // Check if there's a lyrics file in the same directory as the track
    try {
      const trackPath = track.path;
      const trackDir = trackPath.substring(0, trackPath.lastIndexOf('\\') || trackPath.lastIndexOf('/'));
      const trackName = trackPath.substring(trackPath.lastIndexOf('\\') + 1 || trackPath.lastIndexOf('/') + 1, trackPath.lastIndexOf('.'));
      
      // Check for .txt lyrics
      const txtPath = `${trackDir}/${trackName}.txt`;
      try {
        const txtContent = await ipcRenderer.invoke('read-file', txtPath);
        return { text: txtContent, type: 'plain' };
      } catch (err) {
        // File not found, continue
      }
      
      // Check for .lrc lyrics
      const lrcPath = `${trackDir}/${trackName}.lrc`;
      try {
        const lrcContent = await ipcRenderer.invoke('read-file', lrcPath);
        return { text: lrcContent, type: 'lrc' };
      } catch (err) {
        // File not found, continue
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching local lyrics:', error);
      return null;
    }
  }
  
  async fetchMusixmatchLyrics(track) {
    // This would normally use the Musixmatch API
    // For now, we'll just return a placeholder
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, return lyrics for some well-known songs
      if (track.title.toLowerCase().includes('bohemian rhapsody') && 
          track.artist.toLowerCase().includes('queen')) {
        return {
          text: "Is this the real life? Is this just fantasy?\nCaught in a landslide, no escape from reality\nOpen your eyes, look up to the skies and see\nI'm just a poor boy, I need no sympathy\nBecause I'm easy come, easy go, little high, little low\nAny way the wind blows doesn't really matter to me, to me",
          type: 'plain'
        };
      }
      
      if (track.title.toLowerCase().includes('imagine') && 
          track.artist.toLowerCase().includes('john lennon')) {
        return {
          text: "Imagine there's no heaven\nIt's easy if you try\nNo hell below us\nAbove us only sky\nImagine all the people\nLiving for today...",
          type: 'plain'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Musixmatch lyrics:', error);
      return null;
    }
  }
  
  async fetchLRCFileLyrics(track) {
    // This would search for .lrc files in the music directory
    // For now, we'll just return a placeholder for demo purposes
    try {
      // For demo purposes, return timed lyrics for some well-known songs
      if (track.title.toLowerCase().includes('bohemian rhapsody') && 
          track.artist.toLowerCase().includes('queen')) {
        return {
          text: "[00:00.00]Is this the real life?\n[00:05.32]Is this just fantasy?\n[00:10.54]Caught in a landslide\n[00:15.32]No escape from reality",
          type: 'lrc'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching LRC file lyrics:', error);
      return null;
    }
  }
  
  getCurrentLyrics() {
    return this.currentLyrics;
  }
  
  getLyricsForTime(time) {
    if (!this.currentLyrics || this.currentLyrics.type !== 'lrc') {
      return null;
    }
    
    // Parse LRC format
    const lines = this.currentLyrics.text.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
    
    const parsedLines = lines.map(line => {
      const match = timeRegex.exec(line);
      if (!match) return { time: -1, text: line };
      
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const hundredths = parseInt(match[3]);
      const timeInSeconds = minutes * 60 + seconds + hundredths / 100;
      
      return {
        time: timeInSeconds,
        text: line.replace(timeRegex, '')
      };
    }).filter(line => line.time >= 0);
    
    // Sort by time
    parsedLines.sort((a, b) => a.time - b.time);
    
    // Find current line
    let currentLine = null;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time > time) {
        break;
      }
      currentLine = parsedLines[i];
    }
    
    return currentLine;
  }
  
  async saveLyrics(trackId, lyrics) {
    try {
      await databaseService.saveLyrics(trackId, lyrics);
      
      if (trackId === this.currentTrackId) {
        this.currentLyrics = lyrics;
        this.emit('lyrics-changed', lyrics);
      }
      
      return lyrics;
    } catch (error) {
      console.error('Error saving lyrics:', error);
      this.emit('error', error);
      throw error;
    }
  }
}

// Export singleton instance
const lyricsService = new LyricsService();
module.exports = lyricsService;