# PulseBeats Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
# Development mode (with DevTools)
npm run dev

# Normal mode
npm start
```

### 3. First Time Setup
1. Launch PulseBeats
2. Navigate to Settings page
3. Add your music folders in the Library section
4. Click "Scan Library" to index your music
5. (Optional) Configure AI features with Gemini API key

## Building for Distribution

### Single Platform
```bash
npm run build        # Current platform
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

### All Platforms
```bash
npm run build:all
```

## Features Overview

### ✅ Implemented Core Features

**Playback Engine:**
- Advanced audio processing with Web Audio API
- 10-band equalizer with presets
- Crossfade and gapless playback
- Variable playback speed (0.25x - 4x)
- Smart fade-in/fade-out
- Sleep timer with fade option

**Library Management:**
- Multi-format support (MP3, FLAC, WAV, OGG, M4A, AAC, etc.)
- Smart library scanning and indexing
- Advanced search and filtering
- Artist/Album/Genre organization
- Recently played and favorites tracking

**User Interface:**
- Modern, responsive design
- Dark/Light/AMOLED themes
- Grid and list view options
- Keyboard shortcuts
- Context menus

**AI Integration:**
- Gemini API integration for recommendations
- Smart playlist generation
- Custom prompt testing interface

### 🎯 Key Components

1. **AudioEngine** (`src/core/AudioEngine.js`)
   - Handles all audio playback and processing
   - Equalizer, effects, and audio controls
   - Playlist management and playback modes

2. **LibraryManager** (`src/core/LibraryManager.js`)
   - Music library scanning and indexing
   - Metadata extraction and management
   - Search and filtering capabilities

3. **PlayerControls** (`src/components/PlayerControls.js`)
   - Advanced player UI with all controls
   - Real-time audio visualization
   - Keyboard shortcuts and interactions

4. **Library Page** (`src/pages/Library.js`)
   - Comprehensive library browser
   - Multiple view modes (tracks, artists, albums, genres)
   - Advanced sorting and filtering

## Configuration

### Audio Settings
- Configure equalizer presets
- Adjust crossfade duration
- Set audio effects (bass boost, reverb, etc.)
- Choose output devices

### Library Settings
- Add multiple music folder locations
- Configure automatic scanning
- Set metadata preferences

### AI Settings (Optional)
- Add Gemini API key for AI features
- Test API connection
- Configure recommendation preferences

## Troubleshooting

### Common Issues

**Library not scanning:**
- Check folder permissions
- Ensure music files are in supported formats
- Try manual refresh

**Audio not playing:**
- Check system audio settings
- Verify file format support
- Test with different audio files

**Performance issues:**
- Reduce equalizer processing
- Disable advanced effects
- Check system resources

### Supported Audio Formats
- **Lossless:** FLAC, ALAC, APE, WV
- **Lossy:** MP3, AAC, OGG, Opus, WMA  
- **Uncompressed:** WAV, AIFF
- **Container:** M4A, MP4

## Development

### Project Structure
```
PulseBeats/
├── main.js              # Electron main process
├── preload.js           # Preload script  
├── index.html           # Main UI
├── src/
│   ├── app.js          # Application entry
│   ├── core/           # Core engines
│   ├── components/     # UI components
│   ├── pages/          # Application pages
│   ├── styles/         # CSS stylesheets
│   └── utils/          # Utilities
└── assets/             # Resources
```

### Adding New Features
1. Core audio features → `src/core/AudioEngine.js`
2. Library features → `src/core/LibraryManager.js`
3. UI components → `src/components/`
4. New pages → `src/pages/`
5. Styling → `src/styles/`

### Testing
- Use `npm run dev` for development with DevTools
- Test on multiple platforms before release
- Verify audio format compatibility

## Next Steps

1. **Test the basic functionality:**
   - Add music folders
   - Scan library
   - Play tracks
   - Test controls

2. **Explore advanced features:**
   - Configure equalizer
   - Create playlists
   - Test AI features (with API key)

3. **Customize settings:**
   - Choose theme
   - Set audio preferences
   - Configure keyboard shortcuts

4. **Build for distribution:**
   - Test on target platforms
   - Create installers
   - Package for distribution

## Support

For issues or questions:
1. Check this setup guide
2. Review the main README.md
3. Check the console for error messages
4. Test with different audio files/formats

---

**Enjoy your new advanced music player!** 🎵