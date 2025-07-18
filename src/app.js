// Main application script
const { ipcRenderer } = require('electron');

// Import page components
const SettingsPage = require('./pages/Settings');
const AiTestPage = require('./pages/AiTest');
const LibraryPage = require('./pages/Library');

// Import advanced components
const ThemeManager = require('./components/ThemeManager');
const MiniPlayer = require('./components/MiniPlayer');
const GestureManager = require('./components/GestureManager');
const PlayerControls = require('./components/PlayerControls');
const AudioEngine = require('./core/AudioEngine');
const LibraryManager = require('./core/LibraryManager');
const AIRecommendationEngine = require('./core/AIRecommendationEngine');

// Global variables
let currentPage = null;
let currentTheme = 'dark';

// Core system components
let audioEngine = null;
let libraryManager = null;
let themeManagern();
  
  // Set up theme toggle
  setupThemeToggle();
  
  // Load initial page (home by default)
  navigateTo(window.location.hash.substring(1) || 'home');
});

// Set up navigation
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('href').substring(1);
      navigateTo(page);
    });
  });
}

// Navigate to a page
function navigateTo(page) {
  // Update URL hash
  window.location.hash = page;
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + page) {
      link.classList.add('active');
    }
  });
  
  // Get content container
  const contentContainer = document.getElementById('page-content');
  
  // Clear current page if exists
  if (currentPage) {
    currentPage = null;
  }
  
  // Load requested page
  switch (page) {
    case 'home':
      loadHomePage(contentContainer);
      break;
    case 'library':
      loadLibraryPage(contentContainer);
      break;
    case 'playlists':
      loadPlaylistsPage(contentContainer);
      break;
    case 'settings':
      loadSettingsPage(contentContainer);
      break;
    case 'ai-test':
      loadAiTestPage(contentContainer);
      break;
    default:
      loadHomePage(contentContainer);
  }
}

// Load home page
function loadHomePage(container) {
  container.innerHTML = `
    <div class="welcome-screen">
      <h2>Welcome to PulseBeats</h2>
      <p>Let's set up your music library to get started.</p>
      <button class="btn" id="btn-add-library">Add Music Folder</button>
    </div>
  `;
  
  // Add event listener for add library button
  document.getElementById('btn-add-library').addEventListener('click', () => {
    navigateTo('settings');
  });
}

// Load library page
function loadLibraryPage(container) {
  // Create library page instance
  currentPage = new LibraryPage(container);
}

// Load playlists page
function loadPlaylistsPage(container) {
  container.innerHTML = `
    <h2>Playlists</h2>
    <p>Playlists page content will go here.</p>
  `;
}

// Load settings page
function loadSettingsPage(container) {
  // Create settings page instance
  currentPage = new SettingsPage(container);
}

// Load AI test page
function loadAiTestPage(container) {
  // Create AI test page instance
  currentPage = new AiTestPage(container);
}

// Set up theme toggle
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      updateTheme(newTheme);
    });
  }
}

// Update theme
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

// Apply theme to document
function applyTheme(theme) {
  document.body.className = theme + '-theme';
  
  // Update theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

// Show error message
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