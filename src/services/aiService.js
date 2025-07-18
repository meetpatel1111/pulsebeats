// AI Service - Handles AI-based features
const EventEmitter = require('events');
const databaseService = require('./databaseService');

class AIService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.moodCache = new Map(); // Cache mood analysis results
  }
  
  async initialize() {
    try {
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('Error initializing AI service:', error);
      throw error;
    }
  }
  
  // Generate recommendations based on listening history and preferences
  async generateRecommendations(limit = 20) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }
    
    try {
      // Get user's listening history
      const recentlyPlayed = databaseService.getRecentlyPlayed(50);
      const mostPlayed = databaseService.getMostPlayed(50);
      const favorites = databaseService.getFavorites();
      
      // Get all tracks
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Extract features from user's history
      const likedArtists = new Map();
      const likedGenres = new Map();
      
      // Process recently played
      recentlyPlayed.forEach(item => {
        if (!item.track) return;
        
        // Increment artist count
        const artist = item.track.artist;
        likedArtists.set(artist, (likedArtists.get(artist) || 0) + 1);
        
        // Increment genre count
        const genre = item.track.genre;
        if (genre) {
          likedGenres.set(genre, (likedGenres.get(genre) || 0) + 1);
        }
      });
      
      // Process most played
      mostPlayed.forEach(item => {
        if (!item.track) return;
        
        // Increment artist count (with higher weight)
        const artist = item.track.artist;
        likedArtists.set(artist, (likedArtists.get(artist) || 0) + 2);
        
        // Increment genre count
        const genre = item.track.genre;
        if (genre) {
          likedGenres.set(genre, (likedGenres.get(genre) || 0) + 2);
        }
      });
      
      // Process favorites
      favorites.forEach(track => {
        if (!track) return;
        
        // Increment artist count (with highest weight)
        const artist = track.artist;
        likedArtists.set(artist, (likedArtists.get(artist) || 0) + 3);
        
        // Increment genre count
        const genre = track.genre;
        if (genre) {
          likedGenres.set(genre, (likedGenres.get(genre) || 0) + 3);
        }
      });
      
      // Sort artists and genres by preference
      const sortedArtists = Array.from(likedArtists.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      const sortedGenres = Array.from(likedGenres.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      // Filter out tracks that user has already listened to recently
      const recentTrackIds = new Set(recentlyPlayed.map(item => item.track?.id).filter(Boolean));
      
      // Score each track based on similarity to user preferences
      const scoredTracks = allTracks
        .filter(track => !recentTrackIds.has(track.id))
        .map(track => {
          let score = 0;
          
          // Score based on artist
          const artistIndex = sortedArtists.indexOf(track.artist);
          if (artistIndex !== -1) {
            score += (sortedArtists.length - artistIndex) / sortedArtists.length * 10;
          }
          
          // Score based on genre
          if (track.genre) {
            const genreIndex = sortedGenres.indexOf(track.genre);
            if (genreIndex !== -1) {
              score += (sortedGenres.length - genreIndex) / sortedGenres.length * 5;
            }
          }
          
          return { track, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.track);
      
      return scoredTracks;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      this.emit('error', error);
      return [];
    }
  }
  
  // Generate a daily mix playlist
  async generateDailyMix() {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }
    
    try {
      // Get recommendations
      const recommendations = await this.generateRecommendations(30);
      
      // Create a new playlist
      const date = new Date();
      const playlistName = `Daily Mix - ${date.toLocaleDateString()}`;
      
      const playlist = databaseService.createPlaylist(
        playlistName,
        recommendations.map(track => track.id)
      );
      
      return playlist;
    } catch (error) {
      console.error('Error generating daily mix:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  // Analyze mood of a track
  async analyzeMood(track) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }
    
    try {
      // Check cache first
      if (this.moodCache.has(track.id)) {
        return this.moodCache.get(track.id);
      }
      
      // In a real implementation, this would use audio analysis
      // For now, we'll use a simple heuristic based on genre and title
      
      const title = track.title.toLowerCase();
      const artist = track.artist.toLowerCase();
      const genre = (track.genre || '').toLowerCase();
      
      let mood = {
        energy: 0.5,    // 0 to 1 (calm to energetic)
        valence: 0.5,   // 0 to 1 (sad to happy)
        danceability: 0.5, // 0 to 1
        tags: []
      };
      
      // Genre-based analysis
      if (genre.includes('rock') || genre.includes('metal')) {
        mood.energy += 0.3;
      } else if (genre.includes('classical')) {
        mood.energy -= 0.3;
      } else if (genre.includes('dance') || genre.includes('edm') || genre.includes('electronic')) {
        mood.energy += 0.2;
        mood.danceability += 0.3;
      } else if (genre.includes('jazz')) {
        mood.energy -= 0.1;
        mood.valence += 0.1;
      } else if (genre.includes('blues')) {
        mood.energy -= 0.2;
        mood.valence -= 0.2;
      }
      
      // Title-based analysis
      const happyWords = ['happy', 'joy', 'love', 'sun', 'smile', 'dance', 'party'];
      const sadWords = ['sad', 'cry', 'tear', 'pain', 'hurt', 'alone', 'lonely'];
      const energeticWords = ['jump', 'run', 'fire', 'wild', 'crazy', 'power'];
      const calmWords = ['sleep', 'dream', 'calm', 'peace', 'quiet', 'gentle'];
      
      happyWords.forEach(word => {
        if (title.includes(word)) mood.valence += 0.1;
      });
      
      sadWords.forEach(word => {
        if (title.includes(word)) mood.valence -= 0.1;
      });
      
      energeticWords.forEach(word => {
        if (title.includes(word)) mood.energy += 0.1;
      });
      
      calmWords.forEach(word => {
        if (title.includes(word)) mood.energy -= 0.1;
      });
      
      // Clamp values
      mood.energy = Math.max(0, Math.min(1, mood.energy));
      mood.valence = Math.max(0, Math.min(1, mood.valence));
      mood.danceability = Math.max(0, Math.min(1, mood.danceability));
      
      // Generate tags
      if (mood.energy > 0.7) mood.tags.push('energetic');
      if (mood.energy < 0.3) mood.tags.push('calm');
      if (mood.valence > 0.7) mood.tags.push('happy');
      if (mood.valence < 0.3) mood.tags.push('sad');
      if (mood.danceability > 0.7) mood.tags.push('danceable');
      
      // Cache result
      this.moodCache.set(track.id, mood);
      
      return mood;
    } catch (error) {
      console.error('Error analyzing mood:', error);
      this.emit('error', error);
      return {
        energy: 0.5,
        valence: 0.5,
        danceability: 0.5,
        tags: []
      };
    }
  }
  
  // Generate a mood-based playlist
  async generateMoodPlaylist(moodTag, limit = 20) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }
    
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return null;
      }
      
      // Analyze mood for all tracks (this would be slow in a real app)
      const tracksWithMood = await Promise.all(
        allTracks.map(async track => {
          const mood = await this.analyzeMood(track);
          return { track, mood };
        })
      );
      
      // Filter tracks by mood tag
      let filteredTracks;
      
      switch (moodTag) {
        case 'energetic':
          filteredTracks = tracksWithMood.filter(item => item.mood.energy > 0.7);
          break;
        case 'calm':
          filteredTracks = tracksWithMood.filter(item => item.mood.energy < 0.3);
          break;
        case 'happy':
          filteredTracks = tracksWithMood.filter(item => item.mood.valence > 0.7);
          break;
        case 'sad':
          filteredTracks = tracksWithMood.filter(item => item.mood.valence < 0.3);
          break;
        case 'danceable':
          filteredTracks = tracksWithMood.filter(item => item.mood.danceability > 0.7);
          break;
        default:
          filteredTracks = tracksWithMood;
      }
      
      // Sort by mood intensity and take top tracks
      filteredTracks.sort((a, b) => {
        if (moodTag === 'energetic' || moodTag === 'happy' || moodTag === 'danceable') {
          return b.mood[moodTag === 'energetic' ? 'energy' : 
                        moodTag === 'happy' ? 'valence' : 'danceability'] - 
                 a.mood[moodTag === 'energetic' ? 'energy' : 
                        moodTag === 'happy' ? 'valence' : 'danceability'];
        } else {
          return a.mood[moodTag === 'calm' ? 'energy' : 'valence'] - 
                 b.mood[moodTag === 'calm' ? 'energy' : 'valence'];
        }
      });
      
      const selectedTracks = filteredTracks.slice(0, limit).map(item => item.track);
      
      // Create playlist
      const playlistName = `${moodTag.charAt(0).toUpperCase() + moodTag.slice(1)} Mood`;
      
      const playlist = databaseService.createPlaylist(
        playlistName,
        selectedTracks.map(track => track.id)
      );
      
      return playlist;
    } catch (error) {
      console.error('Error generating mood playlist:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  // Generate smart crossfade settings based on BPM
  calculateCrossfadeForTracks(track1, track2) {
    if (!track1 || !track2) {
      return 2; // Default crossfade
    }
    
    // In a real implementation, this would use BPM detection
    // For now, we'll use a simple heuristic
    
    const genre1 = (track1.genre || '').toLowerCase();
    const genre2 = (track2.genre || '').toLowerCase();
    
    // Electronic music typically benefits from beat-matched crossfades
    if ((genre1.includes('electronic') || genre1.includes('dance') || genre1.includes('edm')) &&
        (genre2.includes('electronic') || genre2.includes('dance') || genre2.includes('edm'))) {
      return 4; // Longer crossfade for electronic music
    }
    
    // Classical music typically benefits from shorter or no crossfades
    if ((genre1.includes('classical') || genre1.includes('piano')) ||
        (genre2.includes('classical') || genre2.includes('piano'))) {
      return 1; // Shorter crossfade for classical music
    }
    
    return 2; // Default crossfade
  }
}

// Export singleton instance
const aiService = new AIService();
module.exports = aiService;