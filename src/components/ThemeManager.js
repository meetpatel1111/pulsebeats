// Advanced Theme Management System
class ThemeManager {
  constructor() {
    this.currentTheme = 'dark';
    this.customThemes = new Map();
    this.dynamicColors = null;
    this.gradientEnabled = false;
    this.blurEnabled = false;
    
    // Default themes
    this.defaultThemes = {
      dark: {
        name: 'Dark',
        colors: {
          primary: '#121212',
          secondary: '#1e1e1e',
          tertiary: '#282828',
          textPrimary: '#ffffff',
          textSecondary: '#b3b3b3',
          accent: '#1db954',
          accentSecondary: '#1ed760',
          error: '#e74c3c',
          warning: '#f39c12',
          success: '#2ecc71',
          divider: '#333333'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
          accent: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)'
        }
      },
      light: {
        name: 'Light',
        colors: {
          primary: '#f8f8f8',
          secondary: '#ffffff',
          tertiary: '#eeeeee',
          textPrimary: '#121212',
          textSecondary: '#555555',
          accent: '#1db954',
          accentSecondary: '#1ed760',
          error: '#e74c3c',
          warning: '#f39c12',
          success: '#2ecc71',
          divider: '#dddddd'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #f8f8f8 0%, #ffffff 100%)',
          accent: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)'
        }
      },
      amoled: {
        name: 'AMOLED',
        colors: {
          primary: '#000000',
          secondary: '#0a0a0a',
          tertiary: '#121212',
          textPrimary: '#ffffff',
          textSecondary: '#b3b3b3',
          accent: '#1db954',
          accentSecondary: '#1ed760',
          error: '#e74c3c',
          warning: '#f39c12',
          success: '#2ecc71',
          divider: '#1a1a1a'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
          accent: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)'
        }
      },
      neon: {
        name: 'Neon',
        colors: {
          primary: '#0a0a0a',
          secondary: '#1a1a2e',
          tertiary: '#16213e',
          textPrimary: '#00f5ff',
          textSecondary: '#0066cc',
          accent: '#ff0080',
          accentSecondary: '#ff3399',
          error: '#ff0040',
          warning: '#ffaa00',
          success: '#00ff80',
          divider: '#003366'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          accent: 'linear-gradient(135deg, #ff0080 0%, #ff3399 100%)'
        }
      },
      sunset: {
        name: 'Sunset',
        colors: {
          primary: '#2d1b69',
          secondary: '#11998e',
          tertiary: '#38ef7d',
          textPrimary: '#ffffff',
          textSecondary: '#e0e0e0',
          accent: '#ff6b6b',
          accentSecondary: '#ffa726',
          error: '#e74c3c',
          warning: '#f39c12',
          success: '#2ecc71',
          divider: '#4a4a4a'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #2d1b69 0%, #11998e 50%, #38ef7d 100%)',
          accent: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)'
        }
      }
    };
    
    this.init();
  }
  
  init() {
    this.loadThemeSettings();
    this.applyTheme(this.currentTheme);
    this.setupColorExtraction();
  }
  
  // Load theme settings from storage
  async loadThemeSettings() {
    try {
      const { ipcRenderer } = require('electron');
      const settings = await ipcRenderer.invoke('get-theme-settings');
      
      this.currentTheme = settings.currentTheme || 'dark';
      this.gradientEnabled = settings.gradientEnabled || false;
      this.blurEnabled = settings.blurEnabled || false;
      this.customThemes = new Map(settings.customThemes || []);
    } catch (error) {
      console.warn('Could not load theme settings:', error);
    }
  }
  
  // Save theme settings
  async saveThemeSettings() {
    try {
      const { ipcRenderer } = require('electron');
      await ipcRenderer.invoke('save-theme-settings', {
        currentTheme: this.currentTheme,
        gradientEnabled: this.gradientEnabled,
        blurEnabled: this.blurEnabled,
        customThemes: Array.from(this.customThemes.entries())
      });
    } catch (error) {
      console.warn('Could not save theme settings:', error);
    }
  }
  
  // Apply theme to document
  applyTheme(themeName, dynamicColors = null) {
    const theme = this.getTheme(themeName);
    if (!theme) return;
    
    this.currentTheme = themeName;
    const root = document.documentElement;
    
    // Apply base colors
    const colors = dynamicColors || theme.colors;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${this.camelToKebab(key)}`, value);
    });
    
    // Apply gradients if enabled
    if (this.gradientEnabled && theme.gradients) {
      Object.entries(theme.gradients).forEach(([key, value]) => {
        root.style.setProperty(`--gradient-${key}`, value);
      });
      
      // Use gradients for backgrounds
      root.style.setProperty('--bg-primary', `var(--gradient-primary)`);
    }
    
    // Apply blur effects if enabled
    if (this.blurEnabled) {
      root.style.setProperty('--backdrop-filter', 'blur(20px)');
      root.style.setProperty('--bg-opacity', '0.8');
    } else {
      root.style.setProperty('--backdrop-filter', 'none');
      root.style.setProperty('--bg-opacity', '1');
    }
    
    // Update body class
    document.body.className = `${themeName}-theme ${this.gradientEnabled ? 'gradient-enabled' : ''} ${this.blurEnabled ? 'blur-enabled' : ''}`;
    
    // Emit theme change event
    this.emit('themeChanged', { theme: themeName, colors, dynamicColors: !!dynamicColors });
    
    this.saveThemeSettings();
  }
  
  // Get theme by name
  getTheme(themeName) {
    return this.customThemes.get(themeName) || this.defaultThemes[themeName];
  }
  
  // Get all available themes
  getAllThemes() {
    const themes = { ...this.defaultThemes };
    this.customThemes.forEach((theme, name) => {
      themes[name] = theme;
    });
    return themes;
  }
  
  // Create custom theme
  createCustomTheme(name, colors, gradients = null) {
    const theme = {
      name,
      colors,
      gradients: gradients || this.generateGradients(colors),
      isCustom: true,
      dateCreated: new Date().toISOString()
    };
    
    this.customThemes.set(name, theme);
    this.saveThemeSettings();
    
    return theme;
  }
  
  // Generate gradients from colors
  generateGradients(colors) {
    return {
      primary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      accent: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentSecondary} 100%)`
    };
  }
  
  // Extract colors from album art
  async extractColorsFromImage(imagePath) {
    try {
      // Use color-thief or similar library to extract dominant colors
      const ColorThief = require('color-thief-node');
      const colorThief = new ColorThief();
      
      const palette = await colorThief.getPalette(imagePath, 5);
      const dominantColor = await colorThief.getColor(imagePath);
      
      return this.createDynamicTheme(palette, dominantColor);
    } catch (error) {
      console.warn('Could not extract colors from image:', error);
      return null;
    }
  }
  
  // Create dynamic theme from extracted colors
  createDynamicTheme(palette, dominantColor) {
    const [r, g, b] = dominantColor;
    const baseTheme = this.getTheme(this.currentTheme);
    
    // Generate complementary colors
    const accent = this.generateComplementaryColor(r, g, b);
    const secondary = this.adjustBrightness(r, g, b, 0.2);
    const tertiary = this.adjustBrightness(r, g, b, 0.4);
    
    return {
      ...baseTheme.colors,
      primary: `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`,
      secondary: `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`,
      tertiary: `rgb(${tertiary.r}, ${tertiary.g}, ${tertiary.b})`,
      accent: `rgb(${accent.r}, ${accent.g}, ${accent.b})`,
      accentSecondary: `rgb(${Math.min(255, accent.r + 20)}, ${Math.min(255, accent.g + 20)}, ${Math.min(255, accent.b + 20)})`
    };
  }
  
  // Generate complementary color
  generateComplementaryColor(r, g, b) {
    return {
      r: 255 - r,
      g: 255 - g,
      b: 255 - b
    };
  }
  
  // Adjust brightness
  adjustBrightness(r, g, b, factor) {
    return {
      r: Math.min(255, Math.max(0, r + (255 * factor))),
      g: Math.min(255, Math.max(0, g + (255 * factor))),
      b: Math.min(255, Math.max(0, b + (255 * factor)))
    };
  }
  
  // Setup color extraction for current track
  setupColorExtraction() {
    // Listen for track changes to extract colors
    if (typeof window !== 'undefined' && window.audioEngine) {
      window.audioEngine.on('trackLoaded', async (track) => {
        if (track.albumArt && this.isDynamicThemeEnabled()) {
          const dynamicColors = await this.extractColorsFromImage(track.albumArt);
          if (dynamicColors) {
            this.applyTheme(this.currentTheme, dynamicColors);
          }
        }
      });
    }
  }
  
  // Check if dynamic theme is enabled
  isDynamicThemeEnabled() {
    return this.dynamicColors !== null;
  }
  
  // Toggle gradient backgrounds
  toggleGradients() {
    this.gradientEnabled = !this.gradientEnabled;
    this.applyTheme(this.currentTheme);
    return this.gradientEnabled;
  }
  
  // Toggle blur effects
  toggleBlur() {
    this.blurEnabled = !this.blurEnabled;
    this.applyTheme(this.currentTheme);
    return this.blurEnabled;
  }
  
  // Enable dynamic colors from album art
  enableDynamicColors() {
    this.dynamicColors = true;
    this.setupColorExtraction();
  }
  
  // Disable dynamic colors
  disableDynamicColors() {
    this.dynamicColors = null;
    this.applyTheme(this.currentTheme);
  }
  
  // Utility function to convert camelCase to kebab-case
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  // Event emitter functionality
  emit(event, data) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(`theme-${event}`, { detail: data }));
    }
  }
  
  // Get current theme info
  getCurrentThemeInfo() {
    return {
      name: this.currentTheme,
      theme: this.getTheme(this.currentTheme),
      gradientEnabled: this.gradientEnabled,
      blurEnabled: this.blurEnabled,
      dynamicColors: this.isDynamicThemeEnabled()
    };
  }
}

module.exports = ThemeManager;