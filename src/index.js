// Add these functions to the end of the index.js file

// Function to load settings
async function loadSettings() {
  try {
    // Load theme setting
    const theme = await ipcRenderer.invoke('get-theme');
    document.getElementById('theme-select').value = theme;
    
    // Load audio settings
    const audioSettings = await ipcRenderer.invoke('get-audio-settings');
    
    // Update crossfade range
    const crossfadeRange = document.getElementById('crossfade-range');
    if (crossfadeRange) {
      crossfadeRange.value = audioSettings.crossfade;
      document.getElementById('crossfade-value').textContent = audioSettings.crossfade + 's';
    }
    
    // Update gapless toggle
    const gaplessToggle = document.getElementById('gapless-toggle');
    if (gaplessToggle) {
      gaplessToggle.checked = audioSettings.gapless;
    }
    
    // Render equalizer
    renderEqualizer(audioSettings.equalizer);
    
    // Load library paths
    const libraryPaths = await ipcRenderer.invoke('get-library-paths');
    renderLibraryPaths(libraryPaths);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showErrorMessage('Failed to load settings');
  }
}

// Function to render equalizer
function renderEqualizer(equalizerValues) {
  const container = document.getElementById('equalizer-container');
  if (!container) return;
  
  const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
  let html = '';
  
  for (let i = 0; i < 10; i++) {
    html += `
      <div class="eq-band">
        <input type="range" class="eq-slider" data-band="${i}" min="-12" max="12" step="1" value="${equalizerValues[i]}" orient="vertical">
        <div class="eq-value">${equalizerValues[i]} dB</div>
        <div class="eq-freq">${bands[i] < 1000 ? bands[i] : bands[i]/1000 + 'k'} Hz</div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Function to render library paths
function renderLibraryPaths(paths) {
  const container = document.getElementById('library-paths');
  if (!container) return;
  
  if (paths.length === 0) {
    container.innerHTML = '<p>No music folders added yet.</p>';
    return;
  }
  
  let html = '<ul class="path-list">';
  
  paths.forEach(path => {
    html += `
      <li class="path-item">
        <span class="path-text">${path}</span>
        <button class="btn-text remove-path" data-path="${path}">Remove</button>
      </li>
    `;
  });
  
  html += '</ul>';
  container.innerHTML = html;
}

// Function to set up settings event listeners
function setupSettingsEventListeners() {
  // Theme selection
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      updateTheme(theme);
    });
  }
  
  // Crossfade setting
  const crossfadeRange = document.getElementById('crossfade-range');
  if (crossfadeRange) {
    crossfadeRange.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('crossfade-value').textContent = value + 's';
      updateAudioSetting('crossfade', value);
    });
  }
  
  // Gapless playback toggle
  const gaplessToggle = document.getElementById('gapless-toggle');
  if (gaplessToggle) {
    gaplessToggle.addEventListener('change', (e) => {
      const value = e.target.checked;
      updateAudioSetting('gapless', value);
    });
  }
  
  // Equalizer sliders
  document.querySelectorAll('.eq-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const band = parseInt(e.target.getAttribute('data-band'));
      const value = parseInt(e.target.value);
      
      // Update display value
      e.target.parentNode.querySelector('.eq-value').textContent = value + ' dB';
      
      // Update equalizer setting
      updateEqualizerBand(band, value);
    });
  });
  
  // Equalizer presets
  document.querySelectorAll('.eq-preset').forEach(button => {
    button.addEventListener('click', (e) => {
      const preset = e.target.getAttribute('data-preset');
      applyEqualizerPreset(preset);
    });
  });
  
  // Add library path
  const addLibraryPathBtn = document.getElementById('add-library-path');
  if (addLibraryPathBtn) {
    addLibraryPathBtn.addEventListener('click', () => {
      addLibraryPath();
    });
  }
  
  // Remove library path
  document.querySelectorAll('.remove-path').forEach(button => {
    button.addEventListener('click', (e) => {
      const path = e.target.getAttribute('data-path');
      removeLibraryPath(path);
    });
  });
}

// Function to update theme
async function updateTheme(theme) {
  try {
    await ipcRenderer.invoke('set-theme', theme);
    applyTheme(theme);
    currentTheme = theme;
  } catch (error) {
    console.error('Error updating theme:', error);
    showErrorMessage('Failed to update theme');
  }
}

// Function to update audio setting
async function updateAudioSetting(key, value) {
  try {
    const audioSettings = await ipcRenderer.invoke('get-audio-settings');
    audioSettings[key] = value;
    await ipcRenderer.invoke('update-audio-settings', audioSettings);
  } catch (error) {
    console.error('Error updating audio settings:', error);
    showErrorMessage('Failed to update audio settings');
  }
}

// Function to update equalizer band
async function updateEqualizerBand(band, value) {
  try {
    const audioSettings = await ipcRenderer.invoke('get-audio-settings');
    audioSettings.equalizer[band] = value;
    await ipcRenderer.invoke('update-audio-settings', audioSettings);
  } catch (error) {
    console.error('Error updating equalizer:', error);
    showErrorMessage('Failed to update equalizer');
  }
}

// Function to apply equalizer preset
async function applyEqualizerPreset(preset) {
  try {
    const values = getEqualizerPreset(preset);
    
    // Update sliders and values
    document.querySelectorAll('.eq-slider').forEach((slider, index) => {
      slider.value = values[index];
      slider.parentNode.querySelector('.eq-value').textContent = values[index] + ' dB';
    });
    
    // Update settings
    const audioSettings = await ipcRenderer.invoke('get-audio-settings');
    audioSettings.equalizer = values;
    await ipcRenderer.invoke('update-audio-settings', audioSettings);
  } catch (error) {
    console.error('Error applying equalizer preset:', error);
    showErrorMessage('Failed to apply equalizer preset');
  }
}

// Function to get equalizer preset values
function getEqualizerPreset(preset) {
  switch (preset) {
    case 'flat':
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    case 'bass':
      return [10, 8, 6, 4, 0, 0, 0, 0, 0, 0];
    case 'vocal':
      return [0, 0, 0, 3, 6, 6, 3, 0, 0, 0];
    case 'rock':
      return [4, 3, 0, 0, -2, 0, 2, 4, 4, 4];
    case 'electronic':
      return [6, 5, 0, -2, -4, -2, 0, 3, 5, 6];
    default:
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

// Function to add library path
async function addLibraryPath() {
  try {
    const result = await ipcRenderer.invoke('open-folder-dialog');
    
    if (!result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0];
      const paths = await ipcRenderer.invoke('add-library-path', path);
      
      // Update the library paths display
      renderLibraryPaths(paths);
      
      // Re-attach event listeners
      document.querySelectorAll('.remove-path').forEach(button => {
        button.addEventListener('click', (e) => {
          const path = e.target.getAttribute('data-path');
          removeLibraryPath(path);
        });
      });
    }
  } catch (error) {
    console.error('Error adding library path:', error);
    showErrorMessage('Failed to add library path');
  }
}

// Function to remove library path
async function removeLibraryPath(path) {
  try {
    const paths = await ipcRenderer.invoke('remove-library-path', path);
    
    // Update the library paths display
    renderLibraryPaths(paths);
    
    // Re-attach event listeners
    document.querySelectorAll('.remove-path').forEach(button => {
      button.addEventListener('click', (e) => {
        const path = e.target.getAttribute('data-path');
        removeLibraryPath(path);
      });
    });
  } catch (error) {
    console.error('Error removing library path:', error);
    showErrorMessage('Failed to remove library path');
  }
}

// Function to load playlists
async function loadPlaylists() {
  try {
    const playlists = await ipcRenderer.invoke('get-playlists') || [];
    renderPlaylists(playlists);
  } catch (error) {
    console.error('Error loading playlists:', error);
    showErrorMessage('Failed to load playlists');
  }
}

// Function to render playlists
function renderPlaylists(playlists) {
  const container = document.getElementById('playlists-container');
  if (!container) return;
  
  if (playlists.length === 0) {
    container.innerHTML = `
      <div class="empty-playlists">
        <p>You don't have any playlists yet.</p>
        <p>Create a new playlist to get started.</p>
      </div>
    `;
    return;
  }
  
  let html = '<div class="playlist-grid">';
  
  playlists.forEach(playlist => {
    html += `
      <div class="playlist-card" data-id="${playlist.id}">
        <div class="playlist-icon">🎵</div>
        <div class="playlist-name">${playlist.name}</div>
        <div class="playlist-track-count">${playlist.tracks.length} tracks</div>
        <div class="playlist-actions">
          <button class="btn-text play-playlist" data-id="${playlist.id}">Play</button>
          <button class="btn-text edit-playlist" data-id="${playlist.id}">Edit</button>
          <button class="btn-text delete-playlist" data-id="${playlist.id}">Delete</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // Add event listeners
  document.querySelectorAll('.play-playlist').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const playlistId = button.getAttribute('data-id');
      playPlaylist(playlistId);
    });
  });
  
  document.querySelectorAll('.edit-playlist').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const playlistId = button.getAttribute('data-id');
      showEditPlaylistDialog(playlistId);
    });
  });
  
  document.querySelectorAll('.delete-playlist').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const playlistId = button.getAttribute('data-id');
      confirmDeletePlaylist(playlistId);
    });
  });
  
  document.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('click', () => {
      const playlistId = card.getAttribute('data-id');
      showPlaylistDetails(playlistId);
    });
  });
}

// Function to show create playlist dialog
function showCreatePlaylistDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'dialog-overlay';
  dialog.innerHTML = `
    <div class="dialog">
      <h3>Create New Playlist</h3>
      <div class="dialog-content">
        <div class="form-group">
          <label for="playlist-name">Playlist Name</label>
          <input type="text" id="playlist-name" placeholder="Enter playlist name">
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn-text" id="cancel-create">Cancel</button>
        <button class="btn" id="confirm-create">Create</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Focus input
  document.getElementById('playlist-name').focus();
  
  // Add event listeners
  document.getElementById('cancel-create').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  document.getElementById('confirm-create').addEventListener('click', async () => {
    const name = document.getElementById('playlist-name').value.trim();
    
    if (name) {
      try {
        await createPlaylist(name);
        document.body.removeChild(dialog);
      } catch (error) {
        console.error('Error creating playlist:', error);
        showErrorMessage('Failed to create playlist');
      }
    }
  });
}

// Function to create playlist
async function createPlaylist(name) {
  try {
    await ipcRenderer.invoke('create-playlist', { name, tracks: [] });
    loadPlaylists();
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
}

// Function to show edit playlist dialog
function showEditPlaylistDialog(playlistId) {
  // Implementation will be added later
  console.log('Edit playlist:', playlistId);
}

// Function to confirm delete playlist
function confirmDeletePlaylist(playlistId) {
  const dialog = document.createElement('div');
  dialog.className = 'dialog-overlay';
  dialog.innerHTML = `
    <div class="dialog">
      <h3>Delete Playlist</h3>
      <div class="dialog-content">
        <p>Are you sure you want to delete this playlist?</p>
        <p>This action cannot be undone.</p>
      </div>
      <div class="dialog-actions">
        <button class="btn-text" id="cancel-delete">Cancel</button>
        <button class="btn btn-danger" id="confirm-delete">Delete</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Add event listeners
  document.getElementById('cancel-delete').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    try {
      await deletePlaylist(playlistId);
      document.body.removeChild(dialog);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      showErrorMessage('Failed to delete playlist');
    }
  });
}

// Function to delete playlist
async function deletePlaylist(playlistId) {
  try {
    await ipcRenderer.invoke('delete-playlist', playlistId);
    loadPlaylists();
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
}

// Function to play playlist
async function playPlaylist(playlistId) {
  try {
    const playlists = await ipcRenderer.invoke('get-playlists') || [];
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist || playlist.tracks.length === 0) {
      showErrorMessage('Playlist is empty');
      return;
    }
    
    // Get all tracks
    const allTracks = await ipcRenderer.invoke('scan-library', await ipcRenderer.invoke('get-library-paths'));
    
    // Filter tracks in playlist
    const playlistTracks = playlist.tracks.map(trackId => {
      return allTracks.find(t => t.id === trackId);
    }).filter(track => track !== undefined);
    
    if (playlistTracks.length === 0) {
      showErrorMessage('No valid tracks in playlist');
      return;
    }
    
    // Set as current playlist and play first track
    this.playlist = playlistTracks;
    playTrack(playlistTracks[0]);
  } catch (error) {
    console.error('Error playing playlist:', error);
    showErrorMessage('Failed to play playlist');
  }
}

// Function to show playlist details
function showPlaylistDetails(playlistId) {
  // Implementation will be added later
  console.log('Show playlist details:', playlistId);
}

// Function to show artist details
function showArtistDetails(artistName) {
  // Filter tracks by artist
  const artistTracks = playlist.filter(track => track.artist === artistName);
  
  // Create modal or page to display artist details
  const content = document.getElementById('page-content');
  
  content.innerHTML = `
    <div id="artist-details-page" class="page active">
      <div class="page-header">
        <button class="btn-text back-btn">← Back</button>
        <h2>${artistName}</h2>
      </div>
      
      <div class="artist-info">
        <div class="artist-image large">👤</div>
        <div class="artist-stats">
          <div class="stat-item">
            <span class="stat-value">${artistTracks.length}</span>
            <span class="stat-label">Tracks</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${new Set(artistTracks.map(t => t.album)).size}</span>
            <span class="stat-label">Albums</span>
          </div>
        </div>
      </div>
      
      <div class="section-header">
        <h3>Tracks</h3>
        <button class="btn" id="play-all-artist">Play All</button>
      </div>
      
      <div class="artist-tracks">
        <!-- Tracks will be rendered here -->
      </div>
    </div>
  `;
  
  // Render tracks
  renderTracks(artistTracks, document.querySelector('.artist-tracks'));
  
  // Add event listeners
  document.querySelector('.back-btn').addEventListener('click', () => {
    navigateTo('library');
  });
  
  document.getElementById('play-all-artist').addEventListener('click', () => {
    if (artistTracks.length > 0) {
      playlist = artistTracks;
      playTrack(artistTracks[0]);
    }
  });
}

// Function to show album details
function showAlbumDetails(albumTitle, artistName) {
  // Filter tracks by album and artist
  const albumTracks = playlist.filter(track => 
    track.album === albumTitle && track.artist === artistName
  );
  
  // Create modal or page to display album details
  const content = document.getElementById('page-content');
  
  content.innerHTML = `
    <div id="album-details-page" class="page active">
      <div class="page-header">
        <button class="btn-text back-btn">← Back</button>
        <h2>${albumTitle}</h2>
      </div>
      
      <div class="album-info">
        <div class="album-image large">💿</div>
        <div class="album-details">
          <div class="album-title-large">${albumTitle}</div>
          <div class="album-artist-large">${artistName}</div>
          <div class="album-stats">
            <span>${albumTracks.length} tracks</span>
          </div>
          <button class="btn" id="play-album">Play Album</button>
        </div>
      </div>
      
      <div class="album-tracks">
        <!-- Tracks will be rendered here -->
      </div>
    </div>
  `;
  
  // Render tracks
  renderTracks(albumTracks, document.querySelector('.album-tracks'));
  
  // Add event listeners
  document.querySelector('.back-btn').addEventListener('click', () => {
    navigateTo('library');
  });
  
  document.getElementById('play-album').addEventListener('click', () => {
    if (albumTracks.length > 0) {
      playlist = albumTracks;
      playTrack(albumTracks[0]);
    }
  });
}

// Function to show genre details
function showGenreDetails(genreName) {
  // Filter tracks by genre
  const genreTracks = playlist.filter(track => track.genre === genreName);
  
  // Create modal or page to display genre details
  const content = document.getElementById('page-content');
  
  content.innerHTML = `
    <div id="genre-details-page" class="page active">
      <div class="page-header">
        <button class="btn-text back-btn">← Back</button>
        <h2>${genreName}</h2>
      </div>
      
      <div class="genre-info">
        <div class="genre-stats">
          <div class="stat-item">
            <span class="stat-value">${genreTracks.length}</span>
            <span class="stat-label">Tracks</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${new Set(genreTracks.map(t => t.artist)).size}</span>
            <span class="stat-label">Artists</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${new Set(genreTracks.map(t => t.album)).size}</span>
            <span class="stat-label">Albums</span>
          </div>
        </div>
        <button class="btn" id="play-genre">Play All</button>
      </div>
      
      <div class="genre-tracks">
        <!-- Tracks will be rendered here -->
      </div>
    </div>
  `;
  
  // Render tracks
  renderTracks(genreTracks, document.querySelector('.genre-tracks'));
  
  // Add event listeners
  document.querySelector('.back-btn').addEventListener('click', () => {
    navigateTo('library');
  });
  
  document.getElementById('play-genre').addEventListener('click', () => {
    if (genreTracks.length > 0) {
      playlist = genreTracks;
      playTrack(genreTracks[0]);
    }
  });
}

// Function to show error message
function showErrorMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 3000);
}

// Function to update scan progress
function updateScanProgress(data) {
  const loadingElement = document.querySelector('.loading');
  
  if (loadingElement) {
    if (data.status === 'scanning') {
      loadingElement.textContent = `Scanning: ${data.message}`;
    } else if (data.status === 'completed') {
      loadingElement.textContent = data.message;
    } else if (data.status === 'error') {
      loadingElement.textContent = `Error: ${data.message}`;
      loadingElement.classList.add('error');
    }
  }
}