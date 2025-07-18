// AI Utilities for PulseBeats
const https = require('https');

/**
 * Makes a request to the Gemini API
 * @param {string} apiKey - The Gemini API key
 * @param {string} prompt - The prompt to send to the API
 * @param {string} model - The model to use (default: gemini-2.5-flash)
 * @returns {Promise<Object>} - The API response
 */
async function queryGeminiAPI(apiKey, prompt, model = 'gemini-2.5-flash') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Tests the Gemini API connection
 * @param {string} apiKey - The Gemini API key
 * @returns {Promise<Object>} - The test result
 */
async function testGeminiAPI(apiKey) {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is not provided'
      };
    }

    const response = await queryGeminiAPI(
      apiKey,
      'Explain how AI works in a few words'
    );

    return {
      success: true,
      message: 'API connection successful',
      response
    };
  } catch (error) {
    return {
      success: false,
      message: `API connection failed: ${error.message}`
    };
  }
}

/**
 * Generates music recommendations based on user preferences
 * @param {string} apiKey - The Gemini API key
 * @param {Object} preferences - User preferences
 * @returns {Promise<Object>} - The recommendations
 */
async function generateMusicRecommendations(apiKey, preferences) {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is not provided'
      };
    }

    const { artists, genres, mood } = preferences;
    
    const prompt = `
      I'm looking for music recommendations based on the following preferences:
      Artists I like: ${artists.join(', ')}
      Genres I enjoy: ${genres.join(', ')}
      Current mood: ${mood}
      
      Please suggest 5 songs that I might enjoy, including the artist name and song title.
    `;

    const response = await queryGeminiAPI(apiKey, prompt);
    
    return {
      success: true,
      message: 'Generated music recommendations',
      recommendations: response
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate recommendations: ${error.message}`
    };
  }
}

/**
 * Generates a playlist based on a theme or mood
 * @param {string} apiKey - The Gemini API key
 * @param {string} theme - The theme or mood for the playlist
 * @param {number} count - Number of songs to include (default: 10)
 * @returns {Promise<Object>} - The generated playlist
 */
async function generatePlaylist(apiKey, theme, count = 10) {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is not provided'
      };
    }
    
    const prompt = `
      Create a music playlist with ${count} songs that fit the theme or mood: "${theme}".
      For each song, provide the artist name and song title in a clear format.
    `;

    const response = await queryGeminiAPI(apiKey, prompt);
    
    return {
      success: true,
      message: `Generated playlist for theme: ${theme}`,
      playlist: response
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate playlist: ${error.message}`
    };
  }
}

module.exports = {
  queryGeminiAPI,
  testGeminiAPI,
  generateMusicRecommendations,
  generatePlaylist
};