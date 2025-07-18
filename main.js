const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const os = require('os');

// Initialize config store
const store = new Store({
  name: 'pulsebeats-config',
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    theme: 'dark',
    audioSettings: {
      volume: 1.0,
      equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      crossfade: 2,
      gapless: true,
      normalization: true,
      replayGain: 0,
      spatialAudio: false,
      monoMode: false,
      outputDevice: 'default'
    },
    libraryPaths: [],
    lastPlayed: null,
    userProfile: {
      name: 'Default',
      avatar: null
    },
    privacy: {
      anonymousMode: false,
      privateListening: false,
      encryptedStorage: false
    },
    sleepTimer: {
      enabled: false,
      duration: 30,
      fadeOut: true
    },
    visualization: {
      enabled: true,
      type: 'spectrum',
      sensitivity: 0.8,
      colorScheme: 'dynamic'
    },
    apiKeys: {
      gemini: ''
    },
    aiFeatures: {
      enabled: false
    },
    dbPath: null
  }
});

let mainWindow;

function createWindow() {
  // Get stored window dimensions
  const { width, height } = store.get('windowBounds');

  // Platform-specific window options
  const windowOptions = {
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until ready
  };

  // Set icon based on platform
  if (process.platform === 'win32') {
    windowOptions.icon = path.join(__dirname, 'assets/icons/icon.ico');
  } else if (process.platform === 'darwin') {
    windowOptions.icon = path.join(__dirname, 'assets/icons/icon.icns');
    windowOptions.titleBarStyle = 'hiddenInset';
  } else {
    windowOptions.icon = path.join(__dirname, 'assets/icons/icon.png');
  }

  // Platform-specific title bar handling
  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
  } else if (process.platform === 'win32') {
    windowOptions.frame = false;
    windowOptions.titleBarStyle = 'hidden';
  } else {
    // Linux - use default frame
    windowOptions.frame = true;
  }

  // Create the browser window
  mainWindow = new BrowserWindow(windowOptions);

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window on Linux/Windows
    if (process.platform !== 'darwin') {
      mainWindow.focus();
    }
  });

  // Save window size when resized
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
  });

  // Open DevTools in development mode
  if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Platform-specific menu setup
  createApplicationMenu();
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for renderer process communication
ipcMain.handle('get-library-paths', () => {
  return store.get('libraryPaths');
});

ipcMain.handle('add-library-path', (event, path) => {
  const paths = store.get('libraryPaths');
  if (!paths.includes(path)) {
    paths.push(path);
    store.set('libraryPaths', paths);
  }
  return paths;
});

ipcMain.handle('remove-library-path', (event, path) => {
  let paths = store.get('libraryPaths');
  paths = paths.filter(p => p !== path);
  store.set('libraryPaths', paths);
  return paths;
});

ipcMain.handle('get-audio-settings', () => {
  return store.get('audioSettings');
});

ipcMain.handle('update-audio-settings', (event, settings) => {
  store.set('audioSettings', settings);
  return settings;
});

ipcMain.handle('get-theme', () => {
  return store.get('theme');
});

ipcMain.handle('set-theme', (event, theme) => {
  store.set('theme', theme);
  return theme;
});

// Library scanning
const fs = require('fs').promises;
const path = require('path');
const mm = require('music-metadata');
const crypto = require('crypto');

// Supported audio formats
const SUPPORTED_FORMATS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.alac'];

ipcMain.handle('scan-library', async (event, paths) => {
  try {
    const tracks = [];
    
    // Notify start of scan
    mainWindow.webContents.send('library-scan-progress', { 
      status: 'started', 
      message: 'Starting library scan...' 
    });
    
    for (const libraryPath of paths) {
      await scanDirectory(libraryPath, tracks, mainWindow);
    }
    
    // Save tracks to store
    store.set('tracks', tracks);
    
    // Notify completion
    mainWindow.webContents.send('library-scan-progress', { 
      status: 'completed', 
      message: `Scan completed. Found ${tracks.length} tracks.` 
    });
    
    return tracks;
  } catch (error) {
    console.error('Error scanning library:', error);
    mainWindow.webContents.send('library-scan-progress', { 
      status: 'error', 
      message: `Error scanning library: ${error.message}` 
    });
    throw error;
  }
});

async function scanDirectory(dirPath, tracks, window) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanDirectory(fullPath, tracks, window);
      } else if (entry.isFile()) {
        // Check if file is a supported audio format
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          try {
            // Update progress
            window.webContents.send('library-scan-progress', { 
              status: 'scanning', 
              message: `Scanning: ${entry.name}` 
            });
            
            // Parse metadata
            const metadata = await mm.parseFile(fullPath);
            
            // Generate unique ID for track
            const id = crypto.createHash('md5').update(fullPath).digest('hex');
            
            // Extract relevant metadata
            const track = {
              id,
              path: fullPath,
              title: metadata.common.title || path.parse(entry.name).name,
              artist: metadata.common.artist || 'Unknown Artist',
              album: metadata.common.album || 'Unknown Album',
              genre: metadata.common.genre ? metadata.common.genre[0] : null,
              year: metadata.common.year,
              track: metadata.common.track,
              duration: metadata.format.duration,
              bitrate: metadata.format.bitrate,
              sampleRate: metadata.format.sampleRate,
              format: metadata.format.container,
              fileSize: (await fs.stat(fullPath)).size,
              dateAdded: new Date().toISOString()
            };
            
            // Add to tracks array
            tracks.push(track);
          } catch (err) {
            console.error(`Error processing file ${fullPath}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    throw error;
  }
}

// Playlist management
ipcMain.handle('get-playlists', () => {
  return store.get('playlists') || [];
});

ipcMain.handle('create-playlist', (event, { name, tracks }) => {
  const playlists = store.get('playlists') || [];
  const id = crypto.randomUUID();
  
  const newPlaylist = {
    id,
    name,
    tracks: tracks || [],
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString()
  };
  
  playlists.push(newPlaylist);
  store.set('playlists', playlists);
  
  return newPlaylist;
});

ipcMain.handle('update-playlist', (event, { id, updates }) => {
  const playlists = store.get('playlists') || [];
  const index = playlists.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error('Playlist not found');
  }
  
  playlists[index] = {
    ...playlists[index],
    ...updates,
    dateModified: new Date().toISOString()
  };
  
  store.set('playlists', playlists);
  return playlists[index];
});

ipcMain.handle('delete-playlist', (event, id) => {
  let playlists = store.get('playlists') || [];
  playlists = playlists.filter(p => p.id !== id);
  store.set('playlists', playlists);
  return true;
});

ipcMain.handle('add-track-to-playlist', (event, { playlistId, trackId }) => {
  const playlists = store.get('playlists') || [];
  const index = playlists.findIndex(p => p.id === playlistId);
  
  if (index === -1) {
    throw new Error('Playlist not found');
  }
  
  if (!playlists[index].tracks.includes(trackId)) {
    playlists[index].tracks.push(trackId);
    playlists[index].dateModified = new Date().toISOString();
    store.set('playlists', playlists);
  }
  
  return playlists[index];
});

ipcMain.handle('remove-track-from-playlist', (event, { playlistId, trackId }) => {
  const playlists = store.get('playlists') || [];
  const index = playlists.findIndex(p => p.id === playlistId);
  
  if (index === -1) {
    throw new Error('Playlist not found');
  }
  
  playlists[index].tracks = playlists[index].tracks.filter(id => id !== trackId);
  playlists[index].dateModified = new Date().toISOString();
  store.set('playlists', playlists);
  
  return playlists[index];
});

// File dialog for selecting music folders
const { dialog } = require('electron');

ipcMain.handle('open-folder-dialog', async () => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
});

// File operations for lyrics and other features
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, { filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
});

// Sleep timer
let sleepTimerTimeout = null;
let fadeInterval = null;

ipcMain.handle('set-sleep-timer', (event, { duration, fadeOut }) => {
  // Clear existing timer if any
  if (sleepTimerTimeout) {
    clearTimeout(sleepTimerTimeout);
    sleepTimerTimeout = null;
  }
  
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  
  // Save settings
  store.set('sleepTimer', { enabled: true, duration, fadeOut });
  
  // Set new timer
  sleepTimerTimeout = setTimeout(() => {
    if (fadeOut) {
      // Start fade out
      let volume = store.get('audioSettings').volume;
      const fadeStep = volume / 10; // Fade over 10 steps
      
      fadeInterval = setInterval(() => {
        volume -= fadeStep;
        
        if (volume <= 0) {
          // Stop playback
          mainWindow.webContents.send('sleep-timer-triggered');
          clearInterval(fadeInterval);
          fadeInterval = null;
          
          // Reset sleep timer
          store.set('sleepTimer.enabled', false);
        } else {
          // Update volume
          mainWindow.webContents.send('update-volume', volume);
        }
      }, 1000); // Fade over 10 seconds
    } else {
      // Stop playback immediately
      mainWindow.webContents.send('sleep-timer-triggered');
      
      // Reset sleep timer
      store.set('sleepTimer.enabled', false);
    }
    
    sleepTimerTimeout = null;
  }, duration * 60 * 1000); // Convert minutes to milliseconds
  
  return { enabled: true, duration, fadeOut };
});

ipcMain.handle('cancel-sleep-timer', () => {
  if (sleepTimerTimeout) {
    clearTimeout(sleepTimerTimeout);
    sleepTimerTimeout = null;
  }
  
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  
  store.set('sleepTimer.enabled', false);
  
  return { enabled: false };
});

ipcMain.handle('get-sleep-timer', () => {
  return store.get('sleepTimer');
});

// User profiles
ipcMain.handle('get-user-profile', () => {
  return store.get('userProfile');
});

ipcMain.handle('update-user-profile', (event, profile) => {
  store.set('userProfile', profile);
  return profile;
});

// Privacy settings
ipcMain.handle('get-privacy-settings', () => {
  return store.get('privacy');
});

ipcMain.handle('update-privacy-settings', (event, settings) => {
  store.set('privacy', settings);
  return settings;
});

// Visualization settings
ipcMain.handle('get-visualization-settings', () => {
  return store.get('visualization');
});

ipcMain.handle('update-visualization-settings', (event, settings) => {
  store.set('visualization', settings);
  return settings;
});

// Track statistics
ipcMain.handle('update-track-stats', (event, { trackId, stats }) => {
  const tracks = store.get('tracks') || [];
  const index = tracks.findIndex(t => t.id === trackId);
  
  if (index !== -1) {
    tracks[index] = {
      ...tracks[index],
      ...stats,
      lastPlayed: new Date().toISOString()
    };
    
    store.set('tracks', tracks);
    return tracks[index];
  }
  
  throw new Error('Track not found');
});

// Recently played
ipcMain.handle('get-recently-played', () => {
  return store.get('recentlyPlayed') || [];
});

ipcMain.handle('add-to-recently-played', (event, trackId) => {
  let recentlyPlayed = store.get('recentlyPlayed') || [];
  
  // Remove if already exists
  recentlyPlayed = recentlyPlayed.filter(id => id !== trackId);
  
  // Add to beginning
  recentlyPlayed.unshift(trackId);
  
  // Limit to 100 items
  if (recentlyPlayed.length > 100) {
    recentlyPlayed = recentlyPlayed.slice(0, 100);
  }
  
  store.set('recentlyPlayed', recentlyPlayed);
  return recentlyPlayed;
});

// Favorites
ipcMain.handle('get-favorites', () => {
  return store.get('favorites') || [];
});

ipcMain.handle('add-to-favorites', (event, trackId) => {
  let favorites = store.get('favorites') || [];
  
  if (!favorites.includes(trackId)) {
    favorites.push(trackId);
    store.set('favorites', favorites);
  }
  
  return favorites;
});

ipcMain.handle('remove-from-favorites', (event, trackId) => {
  let favorites = store.get('favorites') || [];
  favorites = favorites.filter(id => id !== trackId);
  store.set('favorites', favorites);
  
  return favorites;
});

// Smart playlists
ipcMain.handle('create-smart-playlist', (event, { name, rules }) => {
  const smartPlaylists = store.get('smartPlaylists') || [];
  const id = crypto.randomUUID();
  
  const newPlaylist = {
    id,
    name,
    rules,
    isSmartPlaylist: true,
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString()
  };
  
  smartPlaylists.push(newPlaylist);
  store.set('smartPlaylists', smartPlaylists);
  
  return newPlaylist;
});

ipcMain.handle('get-smart-playlists', () => {
  return store.get('smartPlaylists') || [];
});

ipcMain.handle('update-smart-playlist', (event, { id, updates }) => {
  const smartPlaylists = store.get('smartPlaylists') || [];
  const index = smartPlaylists.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error('Smart playlist not found');
  }
  
  smartPlaylists[index] = {
    ...smartPlaylists[index],
    ...updates,
    dateModified: new Date().toISOString()
  };
  
  store.set('smartPlaylists', smartPlaylists);
  return smartPlaylists[index];
});

ipcMain.handle('delete-smart-playlist', (event, id) => {
  let smartPlaylists = store.get('smartPlaylists') || [];
  smartPlaylists = smartPlaylists.filter(p => p.id !== id);
  store.set('smartPlaylists', smartPlaylists);
  
  return true;
});

ipcMain.handle('get-smart-playlist-tracks', (event, { id, rules }) => {
  const tracks = store.get('tracks') || [];
  
  // Filter tracks based on rules
  return tracks.filter(track => {
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
});

// Lyrics
ipcMain.handle('get-lyrics', (event, trackId) => {
  const lyrics = store.get(`lyrics.${trackId}`);
  return lyrics || null;
});

ipcMain.handle('save-lyrics', (event, { trackId, lyrics }) => {
  store.set(`lyrics.${trackId}`, lyrics);
  return lyrics;
});

// Equalizer presets
ipcMain.handle('get-equalizer-presets', () => {
  return store.get('equalizerPresets') || [];
});

ipcMain.handle('save-equalizer-preset', (event, { name, values }) => {
  const presets = store.get('equalizerPresets') || [];
  const id = crypto.randomUUID();
  
  const preset = {
    id,
    name,
    values,
    dateCreated: new Date().toISOString()
  };
  
  presets.push(preset);
  store.set('equalizerPresets', presets);
  
  return preset;
});

ipcMain.handle('delete-equalizer-preset', (event, id) => {
  let presets = store.get('equalizerPresets') || [];
  presets = presets.filter(preset => preset.id !== id);
  store.set('equalizerPresets', presets);
  
  return presets;
});

// Export playlists
ipcMain.handle('export-playlist', async (event, { playlistId, format }) => {
  try {
    const playlists = store.get('playlists') || [];
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    
    const tracks = store.get('tracks') || [];
    const playlistTracks = playlist.tracks
      .map(trackId => tracks.find(t => t.id === trackId))
      .filter(Boolean);
    
    // Create export directory if it doesn't exist
    const exportDir = path.join(app.getPath('music'), 'PulseBeats', 'Exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    const fileName = `${playlist.name.replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}`;
    let filePath;
    
    if (format === 'm3u') {
      filePath = path.join(exportDir, `${fileName}.m3u`);
      
      // Create M3U content
      let content = '#EXTM3U\n';
      
      playlistTracks.forEach(track => {
        content += `#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}\n`;
        content += track.path + '\n';
      });
      
      await fs.writeFile(filePath, content, 'utf8');
    } else if (format === 'json') {
      filePath = path.join(exportDir, `${fileName}.json`);
      
      // Create JSON content
      const content = JSON.stringify({
        name: playlist.name,
        tracks: playlistTracks.map(track => ({
          title: track.title,
          artist: track.artist,
          album: track.album,
          path: track.path,
          duration: track.duration
        }))
      }, null, 2);
      
      await fs.writeFile(filePath, content, 'utf8');
    } else {
      throw new Error('Unsupported export format');
    }
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting playlist:', error);
    throw error;
  }
});

// API Keys
ipcMain.handle('get-api-keys', () => {
  return store.get('apiKeys') || {};
});

ipcMain.handle('update-api-keys', (event, apiKeys) => {
  store.set('apiKeys', apiKeys);
  return apiKeys;
});

// AI Features
ipcMain.handle('get-ai-features', () => {
  return store.get('aiFeatures') || { enabled: false };
});

ipcMain.handle('update-ai-features', (event, settings) => {
  store.set('aiFeatures', settings);
  return settings;
});

// Import AI utilities
const aiUtils = require('./src/utils/aiUtils');

// AI Recommendations
ipcMain.handle('get-ai-recommendations', async (event, { type, seed }) => {
  try {
    // Check if AI features are enabled
    const aiFeatures = store.get('aiFeatures');
    if (!aiFeatures || !aiFeatures.enabled) {
      throw new Error('AI features are not enabled');
    }
    
    // Check if API key is available
    const apiKeys = store.get('apiKeys');
    if (!apiKeys || !apiKeys.gemini) {
      throw new Error('Gemini API key is not configured');
    }
    
    // This is a placeholder for actual API implementation
    // In a real implementation, you would make API calls to Gemini here
    
    // For now, return mock data
    if (type === 'tracks') {
      return {
        success: true,
        message: 'Generated track recommendations',
        recommendations: [
          { title: 'AI Recommended Track 1', artist: 'Artist 1' },
          { title: 'AI Recommended Track 2', artist: 'Artist 2' },
          { title: 'AI Recommended Track 3', artist: 'Artist 3' }
        ]
      };
    } else if (type === 'artists') {
      return {
        success: true,
        message: 'Generated artist recommendations',
        recommendations: ['Artist 1', 'Artist 2', 'Artist 3']
      };
    } else if (type === 'playlist') {
      return {
        success: true,
        message: 'Generated playlist',
        playlist: {
          name: 'AI Generated Playlist',
          tracks: [
            { title: 'AI Playlist Track 1', artist: 'Artist 1' },
            { title: 'AI Playlist Track 2', artist: 'Artist 2' },
            { title: 'AI Playlist Track 3', artist: 'Artist 3' }
          ]
        }
      };
    } else {
      throw new Error('Unsupported recommendation type');
    }
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    throw error;
  }
});

// Test Gemini API connection
ipcMain.handle('test-gemini-api', async (event, apiKey) => {
  try {
    // If no API key is provided, use the one from the store
    if (!apiKey) {
      const apiKeys = store.get('apiKeys');
      apiKey = apiKeys?.gemini;
    }
    
    // Test the API connection
    const result = await aiUtils.testGeminiAPI(apiKey);
    return result;
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    return {
      success: false,
      message: `Error testing API: ${error.message}`
    };
  }
});

// Send custom prompt to Gemini API
ipcMain.handle('custom-gemini-prompt', async (event, { apiKey, prompt }) => {
  try {
    // If no API key is provided, use the one from the store
    if (!apiKey) {
      const apiKeys = store.get('apiKeys');
      apiKey = apiKeys?.gemini;
    }
    
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is not provided'
      };
    }
    
    // Send the custom prompt to the API
    const response = await aiUtils.queryGeminiAPI(apiKey, prompt);
    
    return {
      success: true,
      message: 'Custom prompt sent successfully',
      response
    };
  } catch (error) {
    console.error('Error sending custom prompt to Gemini API:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
});

// Create application menu
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Music Folder',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Music Folder'
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              const path = result.filePaths[0];
              const paths = store.get('libraryPaths');
              if (!paths.includes(path)) {
                paths.push(path);
                store.set('libraryPaths', paths);
                mainWindow.webContents.send('library-paths-updated', paths);
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Import Playlist',
          click: () => {
            // TODO: Implement playlist import
          }
        },
        {
          label: 'Export Playlist',
          click: () => {
            // TODO: Implement playlist export
          }
        },
        { type: 'separator' },
        {
          label: process.platform === 'darwin' ? 'Close Window' : 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+Q',
          click: () => {
            if (process.platform === 'darwin') {
              mainWindow.close();
            } else {
              app.quit();
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow.webContents.send('playback-toggle');
          }
        },
        {
          label: 'Next Track',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            mainWindow.webContents.send('playback-next');
          }
        },
        {
          label: 'Previous Track',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            mainWindow.webContents.send('playback-previous');
          }
        },
        { type: 'separator' },
        {
          label: 'Shuffle',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('playback-shuffle');
          }
        },
        {
          label: 'Repeat',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('playback-repeat');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PulseBeats',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PulseBeats',
              message: 'PulseBeats Music Player',
              detail: `Version: 0.1.0\nPlatform: ${process.platform}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`
            });
          }
        },
        {
          label: 'Open User Data Folder',
          click: () => {
            shell.openPath(app.getPath('userData'));
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[5].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Platform-specific handlers
ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
    userDataPath: app.getPath('userData'),
    musicPath: app.getPath('music'),
    documentsPath: app.getPath('documents')
  };
});

// Media keys support (Windows/Linux)
if (process.platform !== 'darwin') {
  app.on('ready', () => {
    // Register global shortcuts for media keys
    const { globalShortcut } = require('electron');
    
    // Media play/pause
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow) {
        mainWindow.webContents.send('playback-toggle');
      }
    });
    
    // Media next track
    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow) {
        mainWindow.webContents.send('playback-next');
      }
    });
    
    // Media previous track
    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow) {
        mainWindow.webContents.send('playback-previous');
      }
    });
  });
}

// System tray (optional)
let tray = null;

function createTray() {
  const { Tray } = require('electron');
  
  // Use appropriate icon for platform
  let trayIcon;
  if (process.platform === 'win32') {
    trayIcon = path.join(__dirname, 'assets/icons/tray-icon.ico');
  } else if (process.platform === 'darwin') {
    trayIcon = path.join(__dirname, 'assets/icons/tray-iconTemplate.png');
  } else {
    trayIcon = path.join(__dirname, 'assets/icons/tray-icon.png');
  }
  
  try {
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show PulseBeats',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Play/Pause',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('playback-toggle');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('PulseBeats Music Player');
    tray.setContextMenu(contextMenu);
    
    // Show/hide window on tray click
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (error) {
    console.log('Could not create system tray:', error.message);
  }
}

// Auto-updater placeholder
ipcMain.handle('check-for-updates', async () => {
  // TODO: Implement auto-updater
  return {
    hasUpdate: false,
    version: '0.1.0'
  };
});

// Handle app updates, system integration, etc.