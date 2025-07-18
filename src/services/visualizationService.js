// Visualization Service - Handles audio visualization
const EventEmitter = require('events');

class VisualizationService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.isActive = false;
    this.audioContext = null;
    this.analyser = null;
    this.audioSource = null;
    this.dataArray = null;
    this.animationFrameId = null;
    this.canvas = null;
    this.canvasContext = null;
    this.settings = {
      type: 'spectrum', // 'spectrum', 'waveform', 'particles', 'circular'
      sensitivity: 0.8,
      colorScheme: 'dynamic', // 'dynamic', 'monochrome', 'rainbow', 'custom'
      customColors: ['#1db954', '#1ed760', '#52d78c'],
      smoothing: 0.8,
      barWidth: 2,
      barSpacing: 1,
      circleRadius: 100,
      particleCount: 100,
      backgroundColor: 'transparent'
    };
  }
  
  initialize(audioElement, canvas) {
    if (!audioElement || !canvas) {
      throw new Error('Audio element and canvas are required');
    }
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = this.settings.smoothing;
      
      // Create audio source
      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      // Set up data array
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Set up canvas
      this.canvas = canvas;
      this.canvasContext = canvas.getContext('2d');
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('Error initializing visualization service:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  start() {
    if (!this.isInitialized) {
      throw new Error('Visualization service not initialized');
    }
    
    this.isActive = true;
    this.draw();
    this.emit('started');
  }
  
  stop() {
    this.isActive = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.emit('stopped');
  }
  
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = this.settings.smoothing;
    }
    
    this.emit('settings-updated', this.settings);
    return this.settings;
  }
  
  draw() {
    if (!this.isActive) return;
    
    // Get canvas dimensions
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    this.canvasContext.clearRect(0, 0, width, height);
    
    // Set background
    if (this.settings.backgroundColor !== 'transparent') {
      this.canvasContext.fillStyle = this.settings.backgroundColor;
      this.canvasContext.fillRect(0, 0, width, height);
    }
    
    // Get audio data
    if (this.settings.type === 'waveform') {
      this.analyser.getByteTimeDomainData(this.dataArray);
    } else {
      this.analyser.getByteFrequencyData(this.dataArray);
    }
    
    // Draw visualization based on type
    switch (this.settings.type) {
      case 'spectrum':
        this.drawSpectrum(width, height);
        break;
      case 'waveform':
        this.drawWaveform(width, height);
        break;
      case 'particles':
        this.drawParticles(width, height);
        break;
      case 'circular':
        this.drawCircular(width, height);
        break;
      default:
        this.drawSpectrum(width, height);
    }
    
    // Request next frame
    this.animationFrameId = requestAnimationFrame(() => this.draw());
  }
  
  drawSpectrum(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const barWidth = this.settings.barWidth;
    const barSpacing = this.settings.barSpacing;
    const totalBarWidth = barWidth + barSpacing;
    const barCount = Math.min(Math.floor(width / totalBarWidth), bufferLength);
    const sensitivity = this.settings.sensitivity;
    
    // Calculate bar positions
    for (let i = 0; i < barCount; i++) {
      // Get frequency value (0-255)
      const value = this.dataArray[i] * sensitivity;
      
      // Calculate bar height
      const barHeight = (value / 255) * height;
      
      // Calculate bar position
      const x = i * totalBarWidth;
      const y = height - barHeight;
      
      // Set bar color
      this.canvasContext.fillStyle = this.getColor(i, barCount, value);
      
      // Draw bar
      this.canvasContext.fillRect(x, y, barWidth, barHeight);
    }
  }
  
  drawWaveform(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const sliceWidth = width / bufferLength;
    const sensitivity = this.settings.sensitivity;
    
    this.canvasContext.lineWidth = 2;
    this.canvasContext.strokeStyle = this.getColor(0, 1, 255);
    this.canvasContext.beginPath();
    
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = this.dataArray[i] / 128.0 * sensitivity;
      const y = v * height / 2;
      
      if (i === 0) {
        this.canvasContext.moveTo(x, y);
      } else {
        this.canvasContext.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    this.canvasContext.lineTo(width, height / 2);
    this.canvasContext.stroke();
  }
  
  drawParticles(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const particleCount = this.settings.particleCount;
    const sensitivity = this.settings.sensitivity;
    
    // Create particles if they don't exist
    if (!this.particles) {
      this.particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 5 + 1,
          speed: Math.random() * 3 + 1,
          angle: Math.random() * Math.PI * 2,
          freqIndex: Math.floor(Math.random() * bufferLength)
        });
      }
    }
    
    // Update and draw particles
    for (let i = 0; i < particleCount; i++) {
      const particle = this.particles[i];
      
      // Get frequency value for this particle
      const value = this.dataArray[particle.freqIndex] * sensitivity;
      
      // Update particle position based on audio data
      particle.size = (value / 255) * 10 + 1;
      particle.speed = (value / 255) * 5 + 1;
      
      // Move particle
      particle.x += Math.cos(particle.angle) * particle.speed;
      particle.y += Math.sin(particle.angle) * particle.speed;
      
      // Wrap around edges
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
      
      // Draw particle
      this.canvasContext.beginPath();
      this.canvasContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.canvasContext.fillStyle = this.getColor(i, particleCount, value);
      this.canvasContext.fill();
    }
  }
  
  drawCircular(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = this.settings.circleRadius;
    const sensitivity = this.settings.sensitivity;
    const barCount = 180;
    const angleStep = (Math.PI * 2) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      // Get frequency value
      const index = Math.floor(i * bufferLength / barCount);
      const value = this.dataArray[index] * sensitivity;
      
      // Calculate bar height
      const barHeight = (value / 255) * radius * 0.5;
      
      // Calculate angle
      const angle = i * angleStep;
      
      // Calculate start and end points
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      // Draw line
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(x1, y1);
      this.canvasContext.lineTo(x2, y2);
      this.canvasContext.strokeStyle = this.getColor(i, barCount, value);
      this.canvasContext.lineWidth = 2;
      this.canvasContext.stroke();
    }
  }
  
  getColor(index, total, value) {
    switch (this.settings.colorScheme) {
      case 'dynamic':
        // Use album art colors if available
        if (this.albumColors && this.albumColors.length > 0) {
          const colorIndex = Math.floor((index / total) * this.albumColors.length);
          return this.albumColors[colorIndex];
        }
        // Fall back to default gradient
        return `hsl(${(index / total) * 360}, 100%, ${50 + (value / 255) * 30}%)`;
        
      case 'monochrome':
        return `hsl(180, 2%, ${50 + (value / 255) * 40}%)`;
        
      case 'rainbow':
        return `hsl(${(index / total) * 360}, 80%, 60%)`;
        
      case 'custom':
        if (this.settings.customColors && this.settings.customColors.length > 0) {
          const colorIndex = Math.floor((index / total) * this.settings.customColors.length);
          return this.settings.customColors[colorIndex];
        }
        return `hsl(${(index / total) * 360}, 100%, 50%)`;
        
      default:
        return `hsl(${(index / total) * 360}, 100%, 50%)`;
    }
  }
  
  setAlbumColors(colors) {
    this.albumColors = colors;
  }
  
  resize() {
    if (!this.canvas) return;
    
    // Get the container dimensions
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    // Set canvas dimensions to match container
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  cleanup() {
    this.stop();
    
    if (this.audioSource && this.audioContext) {
      this.audioSource.disconnect();
    }
    
    this.isInitialized = false;
  }
}

// Export singleton instance
const visualizationService = new VisualizationService();
module.exports = visualizationService;