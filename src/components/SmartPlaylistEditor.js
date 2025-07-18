// Smart Playlist Editor component - Create and edit smart playlists
const { ipcRenderer } = require('electron');

class SmartPlaylistEditor {
  constructor(container) {
    this.container = container;
    this.playlist = null;
    this.rules = [];
    this.isEditing = false;
    this.onSave = null;
    this.onCancel = null;
  }
  
  initialize() {
    try {
      // Create editor element
      this.element = document.createElement('div');
      this.element.className = 'smart-playlist-editor';
      
      // Add to container
      this.container.appendChild(this.element);
      
      return true;
    } catch (error) {
      console.error('Error initializing smart playlist editor:', error);
      return false;
    }
  }
  
  open(playlist = null, onSave = null, onCancel = null) {
    this.playlist = playlist;
    this.isEditing = !!playlist;
    this.onSave = onSave;
    this.onCancel = onCancel;
    
    // Set initial rules
    this.rules = playlist ? [...playlist.rules] : [this.createDefaultRule()];
    
    // Render editor
    this.render();
    
    // Show editor
    this.element.style.display = 'block';
  }
  
  render() {
    const title = this.isEditing ? 'Edit Smart Playlist' : 'Create Smart Playlist';
    const nameValue = this.playlist ? this.playlist.name : '';
    
    this.element.innerHTML = `
      <div class="editor-header">
        <h2>${title}</h2>
        <button class="btn-text editor-close">×</button>
      </div>
      
      <div class="editor-content">
        <div class="form-group">
          <label for="playlist-name">Playlist Name</label>
          <input type="text" id="playlist-name" value="${nameValue}" placeholder="Enter playlist name">
        </div>
        
        <div class="form-group">
          <label>Rules</label>
          <div class="rules-container"></div>
          <button class="btn-text add-rule">+ Add Rule</button>
        </div>
        
        <div class="match-container">
          <label>
            <input type="radio" name="match-type" value="all" checked> 
            Match all of the following rules
          </label>
          <label>
            <input type="radio" name="match-type" value="any"> 
            Match any of the following rules
          </label>
        </div>
        
        <div class="preview-container">
          <button class="btn preview-btn">Preview Results</button>
          <div class="preview-results"></div>
        </div>
      </div>
      
      <div class="editor-actions">
        <button class="btn-text cancel-btn">Cancel</button>
        <button class="btn save-btn">Save</button>
      </div>
    `;
    
    // Render rules
    this.renderRules();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  renderRules() {
    const rulesContainer = this.element.querySelector('.rules-container');
    rulesContainer.innerHTML = '';
    
    this.rules.forEach((rule, index) => {
      const ruleElement = document.createElement('div');
      ruleElement.className = 'rule-item';
      ruleElement.dataset.index = index;
      
      ruleElement.innerHTML = `
        <select class="rule-field">
          <option value="title" ${rule.field === 'title' ? 'selected' : ''}>Title</option>
          <option value="artist" ${rule.field === 'artist' ? 'selected' : ''}>Artist</option>
          <option value="album" ${rule.field === 'album' ? 'selected' : ''}>Album</option>
          <option value="genre" ${rule.field === 'genre' ? 'selected' : ''}>Genre</option>
          <option value="year" ${rule.field === 'year' ? 'selected' : ''}>Year</option>
          <option value="duration" ${rule.field === 'duration' ? 'selected' : ''}>Duration</option>
          <option value="playCount" ${rule.field === 'playCount' ? 'selected' : ''}>Play Count</option>
        </select>
        
        <select class="rule-operator">
          <option value="equals" ${rule.operator === 'equals' ? 'selected' : ''}>equals</option>
          <option value="contains" ${rule.operator === 'contains' ? 'selected' : ''}>contains</option>
          <option value="startsWith" ${rule.operator === 'startsWith' ? 'selected' : ''}>starts with</option>
          <option value="endsWith" ${rule.operator === 'endsWith' ? 'selected' : ''}>ends with</option>
          <option value="greaterThan" ${rule.operator === 'greaterThan' ? 'selected' : ''}>greater than</option>
          <option value="lessThan" ${rule.operator === 'lessThan' ? 'selected' : ''}>less than</option>
        </select>
        
        <input type="text" class="rule-value" value="${rule.value}">
        
        <button class="btn-text remove-rule">×</button>
      `;
      
      rulesContainer.appendChild(ruleElement);
    });
  }
  
  setupEventListeners() {
    // Close button
    const closeButton = this.element.querySelector('.editor-close');
    closeButton.addEventListener('click', () => this.close());
    
    // Cancel button
    const cancelButton = this.element.querySelector('.cancel-btn');
    cancelButton.addEventListener('click', () => this.close());
    
    // Save button
    const saveButton = this.element.querySelector('.save-btn');
    saveButton.addEventListener('click', () => this.save());
    
    // Add rule button
    const addRuleButton = this.element.querySelector('.add-rule');
    addRuleButton.addEventListener('click', () => this.addRule());
    
    // Remove rule buttons
    const removeRuleButtons = this.element.querySelectorAll('.remove-rule');
    removeRuleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const ruleElement = e.target.closest('.rule-item');
        const index = parseInt(ruleElement.dataset.index);
        this.removeRule(index);
      });
    });
    
    // Preview button
    const previewButton = this.element.querySelector('.preview-btn');
    previewButton.addEventListener('click', () => this.previewResults());
    
    // Rule field changes
    const ruleFields = this.element.querySelectorAll('.rule-field');
    ruleFields.forEach(field => {
      field.addEventListener('change', (e) => {
        const ruleElement = e.target.closest('.rule-item');
        const index = parseInt(ruleElement.dataset.index);
        this.rules[index].field = e.target.value;
      });
    });
    
    // Rule operator changes
    const ruleOperators = this.element.querySelectorAll('.rule-operator');
    ruleOperators.forEach(operator => {
      operator.addEventListener('change', (e) => {
        const ruleElement = e.target.closest('.rule-item');
        const index = parseInt(ruleElement.dataset.index);
        this.rules[index].operator = e.target.value;
      });
    });
    
    // Rule value changes
    const ruleValues = this.element.querySelectorAll('.rule-value');
    ruleValues.forEach(value => {
      value.addEventListener('input', (e) => {
        const ruleElement = e.target.closest('.rule-item');
        const index = parseInt(ruleElement.dataset.index);
        this.rules[index].value = e.target.value;
      });
    });
  }
  
  createDefaultRule() {
    return {
      field: 'title',
      operator: 'contains',
      value: ''
    };
  }
  
  addRule() {
    this.rules.push(this.createDefaultRule());
    this.renderRules();
    this.setupEventListeners();
  }
  
  removeRule(index) {
    if (this.rules.length > 1) {
      this.rules.splice(index, 1);
      this.renderRules();
      this.setupEventListeners();
    }
  }
  
  async previewResults() {
    try {
      const resultsContainer = this.element.querySelector('.preview-results');
      resultsContainer.innerHTML = '<div class="loading">Loading preview...</div>';
      
      // Get tracks matching rules
      const tracks = await ipcRenderer.invoke('get-smart-playlist-tracks', { 
        rules: this.rules 
      });
      
      // Render results
      if (tracks.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-results">No tracks match these rules</div>';
      } else {
        resultsContainer.innerHTML = `
          <div class="preview-header">
            <span>${tracks.length} tracks match these rules</span>
          </div>
          <div class="preview-tracks"></div>
        `;
        
        const tracksContainer = resultsContainer.querySelector('.preview-tracks');
        
        // Show up to 10 tracks
        const previewTracks = tracks.slice(0, 10);
        
        previewTracks.forEach(track => {
          const trackElement = document.createElement('div');
          trackElement.className = 'preview-track';
          trackElement.innerHTML = `
            <div class="preview-track-title">${track.title}</div>
            <div class="preview-track-artist">${track.artist}</div>
          `;
          
          tracksContainer.appendChild(trackElement);
        });
        
        // Show message if there are more tracks
        if (tracks.length > 10) {
          const moreElement = document.createElement('div');
          moreElement.className = 'preview-more';
          moreElement.textContent = `...and ${tracks.length - 10} more`;
          
          tracksContainer.appendChild(moreElement);
        }
      }
    } catch (error) {
      console.error('Error previewing results:', error);
      
      const resultsContainer = this.element.querySelector('.preview-results');
      resultsContainer.innerHTML = '<div class="error">Error previewing results</div>';
    }
  }
  
  async save() {
    try {
      const nameInput = this.element.querySelector('#playlist-name');
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('Please enter a playlist name');
        nameInput.focus();
        return;
      }
      
      if (this.rules.length === 0) {
        alert('Please add at least one rule');
        return;
      }
      
      // Check if all rules have values
      const emptyRules = this.rules.filter(rule => !rule.value);
      if (emptyRules.length > 0) {
        alert('Please enter values for all rules');
        return;
      }
      
      // Get match type
      const matchType = this.element.querySelector('input[name="match-type"]:checked').value;
      
      // Create or update playlist
      let playlist;
      
      if (this.isEditing) {
        playlist = await ipcRenderer.invoke('update-smart-playlist', {
          id: this.playlist.id,
          updates: {
            name,
            rules: this.rules,
            matchType
          }
        });
      } else {
        playlist = await ipcRenderer.invoke('create-smart-playlist', {
          name,
          rules: this.rules,
          matchType
        });
      }
      
      // Close editor
      this.close();
      
      // Call onSave callback
      if (this.onSave) {
        this.onSave(playlist);
      }
    } catch (error) {
      console.error('Error saving smart playlist:', error);
      alert('Error saving smart playlist');
    }
  }
  
  close() {
    // Hide editor
    this.element.style.display = 'none';
    
    // Call onCancel callback
    if (this.onCancel) {
      this.onCancel();
    }
  }
  
  cleanup() {
    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }
  }
}

module.exports = SmartPlaylistEditor;