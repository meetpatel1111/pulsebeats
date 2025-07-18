// AI-Powered Music Recommendation Engine
const EventEmitter = require('events');

class AIRecommendationEngine extends EventEmitter {
  constructor(libraryManager, apiKey) {
    super();
    this.libraryManager = libraryManager;
    this.apiKey = apiKey;
    this.userProfile = {
      preferences: {
        genres: new Map(),
        artists: new Map(),
        moods: new Map(),
        tempos: new Map(),
        decades: new Map()
      },
      listeningHistory: [],
      skipHistory: [],
      favoriteFeatures: {
        energy: 0.5,
        danceability: 0.5,
        valence: 0.5,
        acousticness: 0.5,
        instrumentalness: 0.5
      },
      contextualPreferences: {
        timeOfDay: new Map(),
        dayOfWeek: new Map(),
        season: new Map(),
        weather: new Map()
      }
    };
    
    this.recommendations = {
      daily: [],
      weekly: [],
      contextual: [],
      similar: [],
      discovery: []
    };
    
    this.contextData = {
      currentTime: null,
      weather: null,
      location: null,
      activity: null,
      mood: null
    };
    
    this.init();
  }
  
  async init() {
    try {
      await this.loadUserProfile();
      await this.updateContextData();
      this.startContextMonitoring();
    } catch (error) {
      console.error('Error initializing AI recommendation engine:', error);
    }
  }
  
  // User Profile Management
  async loadUserProfile() {
    try {
      const savedProfile = await this.libraryManager.store.get('userProfile');
      if (savedProfile) {
        this.userProfile = { ...this.userProfile, ...savedProfile };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }
  
  async saveUserProfile() {
    try {
      await this.libraryManager.store.set('userProfile', this.userProfile);
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }
  
  // Learning from User Behavior
  trackListeningBehavior(track, duration, completed) {
    const listeningData = {
      trackId: track.id,
      timestamp: Date.now(),
      duration,
      completed,
      context: { ...this.contextData },
      trackFeatures: this.extractTrackFeatures(track)
    };
    
    this.userProfile.listeningHistory.push(listeningData);
    
    // Limit history size
    if (this.userProfile.listeningHistory.length > 1000) {
      this.userProfile.listeningHistory = this.userProfile.listeningHistory.slice(-1000);
    }
    
    // Update preferences based on listening behavior
    this.updatePreferences(track, duration, completed);
    
    this.saveUserProfile();
  }
  
  trackSkipBehavior(track, position) {
    const skipData = {
      trackId: track.id,
      timestamp: Date.now(),
      position,
      context: { ...this.contextData },
      trackFeatures: this.extractTrackFeatures(track)
    };
    
    this.userProfile.skipHistory.push(skipData);
    
    // Limit skip history
    if (this.userProfile.skipHistory.length > 500) {
      this.userProfile.skipHistory = this.userProfile.skipHistory.slice(-500);
    }
    
    // Decrease preference for skipped tracks
    this.decreasePreference(track, position);
    
    this.saveUserProfile();
  }
  
  updatePreferences(track, duration, completed) {
    const weight = this.calculateWeight(duration, completed);
    
    // Update genre preferences
    if (track.genre) {
      const currentWeight = this.userProfile.preferences.genres.get(track.genre) || 0;
      this.userProfile.preferences.genres.set(track.genre, currentWeight + weight);
    }
    
    // Update artist preferences
    if (track.artist) {
      const currentWeight = this.userProfile.preferences.artists.get(track.artist) || 0;
      this.userProfile.preferences.artists.set(track.artist, currentWeight + weight);
    }
    
    // Update decade preferences
    if (track.year) {
      const decade = Math.floor(track.year / 10) * 10;
      const currentWeight = this.userProfile.preferences.decades.get(decade) || 0;
      this.userProfile.preferences.decades.set(decade, currentWeight + weight);
    }
    
    // Update contextual preferences
    this.updateContextualPreferences(weight);
  }
  
  updateContextualPreferences(weight) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const season = this.getCurrentSeason();
    
    // Time of day preferences
    const timeSlot = this.getTimeSlot(hour);
    const currentTimeWeight = this.userProfile.contextualPreferences.timeOfDay.get(timeSlot) || 0;
    this.userProfile.contextualPreferences.timeOfDay.set(timeSlot, currentTimeWeight + weight);
    
    // Day of week preferences
    const currentDayWeight = this.userProfile.contextualPreferences.dayOfWeek.get(dayOfWeek) || 0;
    this.userProfile.contextualPreferences.dayOfWeek.set(dayOfWeek, currentDayWeight + weight);
    
    // Season preferences
    const currentSeasonWeight = this.userProfile.contextualPreferences.season.get(season) || 0;
    this.userProfile.contextualPreferences.season.set(season, currentSeasonWeight + weight);
  }
  
  calculateWeight(duration, completed) {
    // Base weight on completion and duration
    let weight = 0.1;
    
    if (completed) {
      weight = 1.0;
    } else if (duration > 30) {
      weight = 0.5;
    } else if (duration > 10) {
      weight = 0.3;
    }
    
    return weight;
  }
  
  decreasePreference(track, position) {
    const penalty = position < 10 ? -0.5 : -0.2;
    
    // Decrease genre preference
    if (track.genre) {
      const currentWeight = this.userProfile.preferences.genres.get(track.genre) || 0;
      this.userProfile.preferences.genres.set(track.genre, Math.max(0, currentWeight + penalty));
    }
    
    // Decrease artist preference
    if (track.artist) {
      const currentWeight = this.userProfile.preferences.artists.get(track.artist) || 0;
      this.userProfile.preferences.artists.set(track.artist, Math.max(0, currentWeight + penalty));
    }
  }
  
  // Context Data Management
  async updateContextData() {
    this.contextData.currentTime = new Date();
    
    // Get weather data if location is available
    try {
      if (navigator.geolocation) {
        const position = await this.getCurrentPosition();
        this.contextData.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        this.contextData.weather = await this.getWeatherData(this.contextData.location);
      }
    } catch (error) {
      console.log('Could not get location/weather data:', error);
    }
    
    // Detect activity based on time and context
    this.contextData.activity = this.detectActivity();
  }
  
  startContextMonitoring() {
    // Update context every 30 minutes
    setInterval(() => {
      this.updateContextData();
    }, 30 * 60 * 1000);
  }
  
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });
    });
  }
  
  async getWeatherData(location) {
    // This would integrate with a weather API
    // For now, return mock data
    return {
      condition: 'sunny',
      temperature: 22,
      humidity: 60
    };
  }
  
  detectActivity() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'work';
    if (hour >= 12 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  // AI-Powered Recommendations
  async generateRecommendations(type = 'all', options = {}) {
    try {
      switch (type) {
        case 'daily':
          return await this.generateDailyMix();
        case 'discovery':
          return await this.generateDiscoveryPlaylist();
        case 'similar':
          return await this.generateSimilarTracks(options.seedTrack);
        case 'contextual':
          return await this.generateContextualRecommendations();
        case 'mood':
          return await this.generateMoodBasedRecommendations(options.mood);
        case 'all':
        default:
          return await this.generateAllRecommendations();
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }
  
  async generateDailyMix() {
    const tracks = this.libraryManager.getAllTracks();
    const preferences = this.getUserPreferences();
    
    // Score tracks based on user preferences
    const scoredTracks = tracks.map(track => ({
      track,
      score: this.calculateTrackScore(track, preferences)
    }));
    
    // Sort by score and take top tracks
    scoredTracks.sort((a, b) => b.score - a.score);
    
    // Add some variety by including different genres/artists
    const dailyMix = this.diversifySelection(scoredTracks.slice(0, 100), 30);
    
    this.recommendations.daily = dailyMix;
    this.emit('recommendationsGenerated', { type: 'daily', recommendations: dailyMix });
    
    return dailyMix;
  }
  
  async generateDiscoveryPlaylist() {
    const tracks = this.libraryManager.getAllTracks();
    const listeningHistory = new Set(this.userProfile.listeningHistory.map(h => h.trackId));
    
    // Find tracks user hasn't listened to much
    const unheardTracks = tracks.filter(track => !listeningHistory.has(track.id));
    
    // Use AI to find interesting tracks based on user profile
    const discoveryTracks = await this.aiAnalyzeDiscoveryTracks(unheardTracks);
    
    this.recommendations.discovery = discoveryTracks;
    this.emit('recommendationsGenerated', { type: 'discovery', recommendations: discoveryTracks });
    
    return discoveryTracks;
  }
  
  async generateSimilarTracks(seedTrack) {
    if (!seedTrack) return [];
    
    const tracks = this.libraryManager.getAllTracks();
    const seedFeatures = this.extractTrackFeatures(seedTrack);
    
    // Calculate similarity scores
    const similarTracks = tracks
      .filter(track => track.id !== seedTrack.id)
      .map(track => ({
        track,
        similarity: this.calculateSimilarity(seedFeatures, this.extractTrackFeatures(track))
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20)
      .map(item => item.track);
    
    this.recommendations.similar = similarTracks;
    this.emit('recommendationsGenerated', { type: 'similar', recommendations: similarTracks });
    
    return similarTracks;
  }
  
  async generateContextualRecommendations() {
    const context = this.contextData;
    const tracks = this.libraryManager.getAllTracks();
    
    // Filter tracks based on current context
    const contextualTracks = tracks.filter(track => {
      return this.isTrackSuitableForContext(track, context);
    });
    
    // Use AI to refine selection
    const recommendations = await this.aiAnalyzeContextualTracks(contextualTracks, context);
    
    this.recommendations.contextual = recommendations;
    this.emit('recommendationsGenerated', { type: 'contextual', recommendations });
    
    return recommendations;
  }
  
  async generateMoodBasedRecommendations(mood) {
    const tracks = this.libraryManager.getAllTracks();
    
    // Use AI to analyze mood and recommend appropriate tracks
    const prompt = `Generate a playlist for someone feeling ${mood}. Consider energy levels, tempo, and emotional content.`;
    const moodTracks = await this.aiGeneratePlaylist(prompt, tracks);
    
    return moodTracks;
  }
  
  // AI Integration
  async aiAnalyzeDiscoveryTracks(tracks) {
    if (!this.apiKey) return tracks.slice(0, 20);
    
    try {
      const userPrefs = this.getUserPreferencesString();
      const trackList = tracks.slice(0, 50).map(t => `${t.artist} - ${t.title} (${t.genre})`).join('\n');
      
      const prompt = `Based on these user preferences: ${userPrefs}
      
      From this list of tracks, recommend 15 songs for music discovery:
      ${trackList}
      
      Focus on tracks that match the user's taste but introduce new elements. Return just the track names.`;
      
      const response = await this.queryGeminiAPI(prompt);
      return this.parseAITrackRecommendations(response, tracks);
    } catch (error) {
      console.error('Error with AI discovery analysis:', error);
      return tracks.slice(0, 20);
    }
  }
  
  async aiAnalyzeContextualTracks(tracks, context) {
    if (!this.apiKey) return tracks.slice(0, 15);
    
    try {
      const contextString = this.getContextString(context);
      const trackList = tracks.slice(0, 30).map(t => `${t.artist} - ${t.title} (${t.genre})`).join('\n');
      
      const prompt = `Current context: ${contextString}
      
      From this list, recommend 10 tracks that fit the current mood and situation:
      ${trackList}
      
      Consider the time of day, weather, and activity. Return just the track names.`;
      
      const response = await this.queryGeminiAPI(prompt);
      return this.parseAITrackRecommendations(response, tracks);
    } catch (error) {
      console.error('Error with AI contextual analysis:', error);
      return tracks.slice(0, 15);
    }
  }
  
  async aiGeneratePlaylist(prompt, availableTracks) {
    if (!this.apiKey) return availableTracks.slice(0, 20);
    
    try {
      const trackList = availableTracks.slice(0, 100).map(t => `${t.artist} - ${t.title} (${t.genre})`).join('\n');
      
      const fullPrompt = `${prompt}
      
      Choose from these available tracks:
      ${trackList}
      
      Return a list of 15-20 track names that best fit the request.`;
      
      const response = await this.queryGeminiAPI(fullPrompt);
      return this.parseAITrackRecommendations(response, availableTracks);
    } catch (error) {
      console.error('Error with AI playlist generation:', error);
      return availableTracks.slice(0, 20);
    }
  }
  
  async queryGeminiAPI(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  parseAITrackRecommendations(aiResponse, availableTracks) {
    const recommendations = [];
    const lines = aiResponse.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim();
      if (!cleanLine) continue;
      
      // Find matching track
      const matchingTrack = availableTracks.find(track => {
        const trackString = `${track.artist} - ${track.title}`.toLowerCase();
        return trackString.includes(cleanLine.toLowerCase()) || 
               cleanLine.toLowerCase().includes(trackString);
      });
      
      if (matchingTrack && !recommendations.find(r => r.id === matchingTrack.id)) {
        recommendations.push(matchingTrack);
      }
      
      if (recommendations.length >= 20) break;
    }
    
    return recommendations;
  }
  
  // Utility Functions
  extractTrackFeatures(track) {
    return {
      genre: track.genre,
      year: track.year,
      duration: track.duration,
      tempo: track.bpm || this.estimateTempo(track),
      energy: this.estimateEnergy(track),
      danceability: this.estimateDanceability(track),
      valence: this.estimateValence(track),
      acousticness: this.estimateAcousticness(track),
      instrumentalness: this.estimateInstrumentalness(track)
    };
  }
  
  calculateTrackScore(track, preferences) {
    let score = 0;
    
    // Genre preference
    if (track.genre && preferences.genres.has(track.genre)) {
      score += preferences.genres.get(track.genre) * 0.3;
    }
    
    // Artist preference
    if (track.artist && preferences.artists.has(track.artist)) {
      score += preferences.artists.get(track.artist) * 0.4;
    }
    
    // Decade preference
    if (track.year) {
      const decade = Math.floor(track.year / 10) * 10;
      if (preferences.decades.has(decade)) {
        score += preferences.decades.get(decade) * 0.2;
      }
    }
    
    // Contextual bonus
    score += this.getContextualBonus(track) * 0.1;
    
    return score;
  }
  
  calculateSimilarity(features1, features2) {
    let similarity = 0;
    let factors = 0;
    
    // Genre similarity
    if (features1.genre === features2.genre) {
      similarity += 0.3;
    }
    factors++;
    
    // Numerical feature similarities
    const numericalFeatures = ['energy', 'danceability', 'valence', 'acousticness'];
    numericalFeatures.forEach(feature => {
      if (features1[feature] !== undefined && features2[feature] !== undefined) {
        const diff = Math.abs(features1[feature] - features2[feature]);
        similarity += (1 - diff) * 0.15;
        factors++;
      }
    });
    
    return similarity / factors;
  }
  
  getUserPreferences() {
    return {
      genres: this.userProfile.preferences.genres,
      artists: this.userProfile.preferences.artists,
      decades: this.userProfile.preferences.decades
    };
  }
  
  getUserPreferencesString() {
    const topGenres = Array.from(this.userProfile.preferences.genres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
    
    const topArtists = Array.from(this.userProfile.preferences.artists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);
    
    return `Favorite genres: ${topGenres.join(', ')}. Favorite artists: ${topArtists.join(', ')}.`;
  }
  
  getContextString(context) {
    const time = context.currentTime ? context.currentTime.toLocaleTimeString() : 'unknown';
    const activity = context.activity || 'unknown';
    const weather = context.weather ? context.weather.condition : 'unknown';
    
    return `Time: ${time}, Activity: ${activity}, Weather: ${weather}`;
  }
  
  diversifySelection(scoredTracks, count) {
    const selected = [];
    const usedGenres = new Set();
    const usedArtists = new Set();
    
    for (const item of scoredTracks) {
      if (selected.length >= count) break;
      
      const track = item.track;
      const genreCount = Array.from(usedGenres).filter(g => g === track.genre).length;
      const artistCount = Array.from(usedArtists).filter(a => a === track.artist).length;
      
      // Limit repetition of same genre/artist
      if (genreCount < 3 && artistCount < 2) {
        selected.push(track);
        usedGenres.add(track.genre);
        usedArtists.add(track.artist);
      }
    }
    
    return selected;
  }
  
  // Estimation functions (would be replaced with actual audio analysis)
  estimateTempo(track) {
    return track.bpm || 120; // Default BPM
  }
  
  estimateEnergy(track) {
    // Estimate based on genre and other factors
    const energyByGenre = {
      'rock': 0.8,
      'electronic': 0.9,
      'classical': 0.3,
      'jazz': 0.5,
      'pop': 0.7
    };
    return energyByGenre[track.genre?.toLowerCase()] || 0.5;
  }
  
  estimateDanceability(track) {
    const danceByGenre = {
      'electronic': 0.9,
      'pop': 0.8,
      'hip-hop': 0.9,
      'classical': 0.2,
      'rock': 0.6
    };
    return danceByGenre[track.genre?.toLowerCase()] || 0.5;
  }
  
  estimateValence(track) {
    // Estimate mood/positivity
    return 0.5; // Neutral default
  }
  
  estimateAcousticness(track) {
    const acousticByGenre = {
      'classical': 0.9,
      'folk': 0.8,
      'electronic': 0.1,
      'rock': 0.3
    };
    return acousticByGenre[track.genre?.toLowerCase()] || 0.5;
  }
  
  estimateInstrumentalness(track) {
    return track.title.toLowerCase().includes('instrumental') ? 0.9 : 0.1;
  }
  
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  isTrackSuitableForContext(track, context) {
    // Simple context filtering logic
    const hour = context.currentTime ? context.currentTime.getHours() : 12;
    
    // Night time - prefer calmer music
    if (hour >= 22 || hour < 6) {
      const calmGenres = ['classical', 'ambient', 'jazz', 'folk'];
      return calmGenres.includes(track.genre?.toLowerCase());
    }
    
    // Morning - prefer energetic music
    if (hour >= 6 && hour < 10) {
      const energeticGenres = ['pop', 'rock', 'electronic', 'hip-hop'];
      return energeticGenres.includes(track.genre?.toLowerCase());
    }
    
    return true; // Default: all tracks suitable
  }
  
  getContextualBonus(track) {
    const now = new Date();
    const hour = now.getHours();
    const timeSlot = this.getTimeSlot(hour);
    
    const timePreference = this.userProfile.contextualPreferences.timeOfDay.get(timeSlot) || 0;
    return Math.min(timePreference / 10, 1); // Normalize to 0-1
  }
  
  // Public API
  async generateAllRecommendations() {
    const results = {};
    
    results.daily = await this.generateDailyMix();
    results.discovery = await this.generateDiscoveryPlaylist();
    results.contextual = await this.generateContextualRecommendations();
    
    return results;
  }
  
  getRecommendations(type) {
    return this.recommendations[type] || [];
  }
  
  // Cleanup
  destroy() {
    this.removeAllListeners();
  }
}

module.exports = AIRecommendationEngine;