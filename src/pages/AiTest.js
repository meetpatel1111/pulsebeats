// AI Test page component
const { ipcRenderer } = require('electron');

class AiTestPage {
  constructor(container) {
    this.container = container;
    this.apiKey = '';
    this.testResult = null;
    this.isLoading = false;
    
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      // Load API key
      const apiKeys = await ipcRenderer.invoke('get-api-keys');
      this.apiKey = apiKeys?.gemini || '';
      
      // Render the test page
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error loading API settings:', error);
      this.container.innerHTML = `<div class="error">Error loading API settings: ${error.message}</div>`;
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div id="ai-test-page" class="page">
        <h2>Gemini API Test</h2>
        
        <div class="settings-section">
          <div class="setting-item">
            <h3>Test API Connection</h3>
            <p>Use this page to test your Gemini API key and see the response from the API.</p>
            
            <div class="api-key-setting">
              <label for="test-gemini-api-key">Gemini API Key</label>
              <input type="password" id="test-gemini-api-key" placeholder="Enter your Gemini API key" value="${this.apiKey}">
              <button class="btn-text" id="show-hide-test-key">Show</button>
            </div>
            
            <div class="test-controls">
              <button class="btn" id="test-api-button">Test API Connection</button>
              <div class="loading-indicator ${this.isLoading ? 'visible' : 'hidden'}">Testing...</div>
            </div>
            
            ${this.renderTestResult()}
            
            <div class="test-prompt-section">
              <h4>Custom Prompt</h4>
              <textarea id="test-prompt" rows="4" placeholder="Enter a custom prompt to test with the API"></textarea>
              <button class="btn" id="send-prompt-button">Send Prompt</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderTestResult() {
    if (!this.testResult) {
      return '<div class="test-result empty">No test results yet. Click "Test API Connection" to test your API key.</div>';
    }
    
    const { success, message, response } = this.testResult;
    
    if (!success) {
      return `<div class="test-result error">
        <h4>Test Failed</h4>
        <p>${message}</p>
      </div>`;
    }
    
    let responseHtml = '';
    if (response) {
      try {
        // Format the response for display
        responseHtml = `<pre class="response-data">${JSON.stringify(response, null, 2)}</pre>`;
      } catch (error) {
        responseHtml = `<p>Error formatting response: ${error.message}</p>`;
      }
    }
    
    return `<div class="test-result success">
      <h4>Test Successful</h4>
      <p>${message}</p>
      ${responseHtml}
    </div>`;
  }
  
  setupEventListeners() {
    // Show/hide API key
    const showHideButton = document.getElementById('show-hide-test-key');
    if (showHideButton) {
      showHideButton.addEventListener('click', () => {
        const input = document.getElementById('test-gemini-api-key');
        if (input.type === 'password') {
          input.type = 'text';
          showHideButton.textContent = 'Hide';
        } else {
          input.type = 'password';
          showHideButton.textContent = 'Show';
        }
      });
    }
    
    // Test API button
    const testButton = document.getElementById('test-api-button');
    if (testButton) {
      testButton.addEventListener('click', () => {
        this.testApiConnection();
      });
    }
    
    // Send custom prompt button
    const sendPromptButton = document.getElementById('send-prompt-button');
    if (sendPromptButton) {
      sendPromptButton.addEventListener('click', () => {
        const promptText = document.getElementById('test-prompt').value;
        if (promptText.trim()) {
          this.sendCustomPrompt(promptText);
        }
      });
    }
  }
  
  async testApiConnection() {
    try {
      this.isLoading = true;
      this.render();
      
      const apiKey = document.getElementById('test-gemini-api-key').value;
      
      // Test the API connection
      const result = await ipcRenderer.invoke('test-gemini-api', apiKey);
      
      this.testResult = result;
      this.isLoading = false;
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error testing API connection:', error);
      this.testResult = {
        success: false,
        message: `Error: ${error.message}`
      };
      this.isLoading = false;
      this.render();
      this.setupEventListeners();
    }
  }
  
  async sendCustomPrompt(prompt) {
    try {
      this.isLoading = true;
      this.render();
      
      const apiKey = document.getElementById('test-gemini-api-key').value;
      
      // Create a custom test with the provided prompt
      const result = await ipcRenderer.invoke('custom-gemini-prompt', { apiKey, prompt });
      
      this.testResult = result;
      this.isLoading = false;
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error sending custom prompt:', error);
      this.testResult = {
        success: false,
        message: `Error: ${error.message}`
      };
      this.isLoading = false;
      this.render();
      this.setupEventListeners();
    }
  }
}

module.exports = AiTestPage;