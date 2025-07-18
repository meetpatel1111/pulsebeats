// Recommendation Engine component - Generates AI-based recommendations
const aiService = require('../services/aiService');
const databaseService = require('../services/databaseService');

class RecommendationEngine {
  constructor() {
    this.isInitialized = false;
    this.recommendations = {
      dailyMix: [],
      forYou: [],
      byMood: {},
      byGenre: {},
      byArtist: {}
    };
  }
  
  async initialize() {
    try {
      // Initialize AI service
      await aiService.initialize();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing recommendation engine:', error);
      return false;
    }
  }
  
  /**
   * Generate all recommendations
   */
  async generateAllRecommendations() {
    if (!this.isInitialized) {
      throw new Error('Recommendation engine not initialized');
    }
    
    try {
      // Generate daily mix
      this.recommendations.dailyMix = await this.generateDailyMix();
      
      // Generate "For You" recommendations
      this.recommendations.forYou = await this.generateForYouRecommendations();
      
      // Generate mood-based recommendations
      this.recommendations.byMood = {
        energetic: await this.generateMoodBasedRecommendations('energetic'),
        calm: await this.generateMoodBasedRecommendations('calm'),
        happy: await this.generateMoodBasedRecommendations('happy'),
        sad: await this.generateMoodBasedRecommendations('sad')
      };
      
      // Generate genre-based recommendations
      const genres = await this.getTopGenres(5);
      
      this.recommendations.byGenre = {};
      
      for (const genre of genres) {
        this.recommendations.byGenre[genre] = await this.generateGenreBasedRecommendations(genre);
      }
      
      // Generate artist-based recommendations
      const artists = await this.getTopArtists(5);
      
      this.recommendations.byArtist = {};
      
      for (const artist of artists) {
        this.recommendations.byArtist[artist] = await this.generateArtistBasedRecommendations(artist);
      }
      
      return this.recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Generate daily mix playlist
   */
  async generateDailyMix() {
    try {
      return await aiService.generateRecommendations(30);
    } catch (error) {
      console.error('Error generating daily mix:', error);
      return [];
    }
  }
  
  /**
   * Generate "For You" recommendations
   */
  async generateForYouRecommendations() {
    try {
      // Get recently played tracks
      const recentlyPlayed = databaseService.getRecentlyPlayed(10);
      
      // Get tracks similar to recently played
      const recommendations = [];
      
      for (const item of recentlyPlayed) {
        if (!item.track) continue;
        
        // Find similar tracks
        const similarTracks = await this.findSimilarTracks(item.track, 3);
        
        // Add to recommendations
        recommendations.push(...similarTracks);
      }
      
      // Remove duplicates
      const uniqueRecommendations = this.removeDuplicates(recommendations);
      
      // Limit to 20 tracks
      return uniqueRecommendations.slice(0, 20);
    } catch (error) {
      console.error('Error generating "For You" recommendations:', error);
      return [];
    }
  }
  
  /**
   * Generate mood-based recommendations
   * @param {string} mood - Mood tag ('energetic', 'calm', 'happy', 'sad')
   */
  async generateMoodBasedRecommendations(mood) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Analyze mood for all tracks
      const tracksWithMood = await Promise.all(
        allTracks.map(async track => {
          const moodData = await aiService.analyzeMood(track);
          return { track, mood: moodData };
        })
      );
      
      // Filter tracks by mood
      let filteredTracks;
      
      switch (mood) {
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
        default:
          filteredTracks = tracksWithMood;
      }
      
      // Sort by mood intensity
      filteredTracks.sort((a, b) => {
        if (mood === 'energetic' || mood === 'happy') {
          return b.mood[mood === 'energetic' ? 'energy' : 'valence'] - 
                 a.mood[mood === 'energetic' ? 'energy' : 'valence'];
        } else {
          return a.mood[mood === 'calm' ? 'energy' : 'valence'] - 
                 b.mood[mood === 'calm' ? 'energy' : 'valence'];
        }
      });
      
      // Return top tracks
      return filteredTracks.slice(0, 15).map(item => item.track);
    } catch (error) {
      console.error(`Error generating ${mood} recommendations:`, error);
      return [];
    }
  }
  
  /**
   * Generate genre-based recommendations
   * @param {string} genre - Genre name
   */
  async generateGenreBasedRecommendations(genre) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Filter tracks by genre
      const genreTracks = allTracks.filter(track => 
        track.genre && track.genre.toLowerCase() === genre.toLowerCase()
      );
      
      // Sort by play count (most played first)
      genreTracks.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      
      // Return top tracks
      return genreTracks.slice(0, 15);
    } catch (error) {
      console.error(`Error generating recommendations for genre ${genre}:`, error);
      return [];
    }
  }
  
  /**
   * Generate artist-based recommendations
   * @param {string} artist - Artist name
   */
  async generateArtistBasedRecommendations(artist) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Filter tracks by artist
      const artistTracks = allTracks.filter(track => 
        track.artist && track.artist.toLowerCase() === artist.toLowerCase()
      );
      
      // Sort by play count (most played first)
      artistTracks.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      
      // Return top tracks
      return artistTracks.slice(0, 15);
    } catch (error) {
      console.error(`Error generating recommendations for artist ${artist}:`, error);
      return [];
    }
  }
  
  /**
   * Find tracks similar to a given track
   * @param {Object} track - Track object
   * @param {number} limit - Maximum number of tracks to return
   */
  async findSimilarTracks(track, limit = 5) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Filter out the input track
      const otherTracks = allTracks.filter(t => t.id !== track.id);
      
      // Score each track based on similarity
      const scoredTracks = otherTracks.map(t => {
        let score = 0;
        
        // Same artist
        if (t.artist === track.artist) {
          score += 5;
        }
        
        // Same album
        if (t.album === track.album) {
          score += 3;
        }
        
        // Same genre
        if (t.genre === track.genre) {
          score += 2;
        }
        
        return { track: t, score };
      });
      
      // Sort by score (highest first)
      scoredTracks.sort((a, b) => b.score - a.score);
      
      // Return top tracks
      return scoredTracks.slice(0, limit).map(item => item.track);
    } catch (error) {
      console.error('Error finding similar tracks:', error);
      return [];
    }
  }
  
  /**
   * Get top genres by track count
   * @param {number} limit - Maximum number of genres to return
   */
  async getTopGenres(limit = 5) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Count tracks by genre
      const genreCounts = {};
      
      allTracks.forEach(track => {
        if (track.genre) {
          genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
        }
      });
      
      // Convert to array and sort
      const genres = Object.keys(genreCounts).map(genre => ({
        name: genre,
        count: genreCounts[genre]
      }));
      
      genres.sort((a, b) => b.count - a.count);
      
      // Return top genres
      return genres.slice(0, limit).map(item => item.name);
    } catch (error) {
      console.error('Error getting top genres:', error);
      return [];
    }
  }
  
  /**
   * Get top artists by track count
   * @param {number} limit - Maximum number of artists to return
   */
  async getTopArtists(limit = 5) {
    try {
      const allTracks = databaseService.get('tracks');
      
      if (!allTracks || allTracks.length === 0) {
        return [];
      }
      
      // Count tracks by artist
      const artistCounts = {};
      
      allTracks.forEach(track => {
        if (track.artist) {
          artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
        }
      });
      
      // Convert to array and sort
      const artists = Object.keys(artistCounts).map(artist => ({
        name: artist,
        count: artistCounts[artist]
      }));
      
      artists.sort((a, b) => b.count - a.count);
      
      // Return top artists
      return artists.slice(0, limit).map(item => item.name);
    } catch (error) {
      console.error('Error getting top artists:', error);
      return [];
    }
  }
  
  /**
   * Remove duplicate tracks from an array
   * @param {Array} tracks - Array of track objects
   */
  removeDuplicates(tracks) {
    const uniqueIds = new Set();
    return tracks.filter(track => {
      if (uniqueIds.has(track.id)) {
        return false;
      }
      uniqueIds.add(track.id);
      return true;
    });
  }
  
  /**
   * Create a smart playlist from recommendations
   * @param {string} name - Playlist name
   * @param {Array} tracks - Array of track objects
   */
  async createPlaylistFromRecommendations(name, tracks) {
    try {
      return await databaseService.createPlaylist(name, tracks.map(track => track.id));
    } catch (error) {
      console.error('Error creating playlist from recommendations:', error);
      throw error;
    }
  }
}

// Export singleton instance
const recommendationEngine = new RecommendationEngine();
module.exports = recommendationEngine;