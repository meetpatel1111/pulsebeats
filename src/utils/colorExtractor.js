// Color Extractor - Extracts dominant colors from album art
const { getColorFromURL } = require('color-thief-node');

class ColorExtractor {
  constructor() {
    this.cache = new Map(); // Cache extracted colors
  }
  
  /**
   * Extract dominant color and palette from an image
   * @param {string} imageUrl - URL or path to image
   * @param {number} colorCount - Number of colors to extract (default: 5)
   * @returns {Promise<{dominant: string, palette: string[]}>} - Dominant color and palette as hex strings
   */
  async extractColors(imageUrl, colorCount = 5) {
    try {
      // Check cache first
      const cacheKey = `${imageUrl}_${colorCount}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // Extract colors using color-thief
      const palette = await getColorFromURL(imageUrl, colorCount);
      
      // Convert RGB arrays to hex strings
      const hexPalette = palette.map(this.rgbToHex);
      const dominantColor = hexPalette[0];
      
      // Create result object
      const result = {
        dominant: dominantColor,
        palette: hexPalette
      };
      
      // Cache result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error extracting colors:', error);
      
      // Return default colors
      return {
        dominant: '#1db954', // Default accent color
        palette: ['#1db954', '#1ed760', '#121212', '#282828', '#b3b3b3']
      };
    }
  }
  
  /**
   * Convert RGB array to hex string
   * @param {number[]} rgb - RGB array [r, g, b]
   * @returns {string} - Hex color string
   */
  rgbToHex(rgb) {
    return '#' + rgb.map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  /**
   * Generate a contrasting text color (black or white) for a background color
   * @param {string} hexColor - Hex color string
   * @returns {string} - '#ffffff' or '#000000'
   */
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  /**
   * Generate a color scheme from a base color
   * @param {string} baseColor - Base color as hex string
   * @returns {Object} - Color scheme object
   */
  generateColorScheme(baseColor) {
    // Convert hex to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // Generate lighter and darker variants
    const lighten = (amount) => {
      return this.rgbToHex([
        Math.min(255, Math.round(r + (255 - r) * amount)),
        Math.min(255, Math.round(g + (255 - g) * amount)),
        Math.min(255, Math.round(b + (255 - b) * amount))
      ]);
    };
    
    const darken = (amount) => {
      return this.rgbToHex([
        Math.round(r * (1 - amount)),
        Math.round(g * (1 - amount)),
        Math.round(b * (1 - amount))
      ]);
    };
    
    return {
      base: baseColor,
      lighter: lighten(0.3),
      lightest: lighten(0.6),
      darker: darken(0.3),
      darkest: darken(0.6),
      contrast: this.getContrastColor(baseColor)
    };
  }
  
  /**
   * Apply a color scheme to the UI
   * @param {Object} colorScheme - Color scheme object
   */
  applyColorScheme(colorScheme) {
    // Create CSS variables
    const root = document.documentElement;
    
    root.style.setProperty('--dynamic-primary', colorScheme.base);
    root.style.setProperty('--dynamic-secondary', colorScheme.lighter);
    root.style.setProperty('--dynamic-tertiary', colorScheme.lightest);
    root.style.setProperty('--dynamic-dark', colorScheme.darker);
    root.style.setProperty('--dynamic-darkest', colorScheme.darkest);
    root.style.setProperty('--dynamic-contrast', colorScheme.contrast);
    
    // Add dynamic theme class to body
    document.body.classList.add('dynamic-theme');
  }
  
  /**
   * Reset to default theme
   */
  resetColorScheme() {
    // Remove dynamic theme class from body
    document.body.classList.remove('dynamic-theme');
    
    // Reset CSS variables
    const root = document.documentElement;
    
    root.style.removeProperty('--dynamic-primary');
    root.style.removeProperty('--dynamic-secondary');
    root.style.removeProperty('--dynamic-tertiary');
    root.style.removeProperty('--dynamic-dark');
    root.style.removeProperty('--dynamic-darkest');
    root.style.removeProperty('--dynamic-contrast');
  }
}

// Export singleton instance
const colorExtractor = new ColorExtractor();
module.exports = colorExtractor;