// Advanced Gesture Management System
class GestureManager {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.gestures = new Map();
    this.isEnabled = true;
    this.touchStartTime = 0;
    this.activeGestures = new Set();
    
    // Touch tracking
    this.touches = new Map();
    this.lastTap = 0;
    this.tapCount = 0;
    
    // Gesture thresholds
    this.thresholds = {
      swipeDistance: 50,
      swipeVelocity: 0.3,
      pinchScale: 0.1,
      longPressTime: 500,
      doubleTapTime: 300,
      panDistance: 10
    };
    
    // Gesture configurations
    this.gestureConfig = {
      swipeLeft: { enabled: true, action: 'nextTrack' },
      swipeRight: { enabled: true, action: 'previousTrack' },
      swipeUp: { enabled: true, action: 'volumeUp' },
      swipeDown: { enabled: true, action: 'volumeDown' },
      pinchIn: { enabled: true, action: 'showMiniPlayer' },
      pinchOut: { enabled: true, action: 'showFullscreen' },
      doubleTap: { enabled: true, action: 'togglePlayPause' },
      longPress: { enabled: true, action: 'showContextMenu' },
      twoFingerTap: { enabled: true, action: 'toggleShuffle' },
      threeFingerTap: { enabled: true, action: 'toggleRepeat' },
      rotate: { enabled: true, action: 'seek' }
    };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadGestureSettings();
  }
  
  setupEventListeners() {
    // Touch events
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    
    // Mouse events for desktop gesture simulation
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Wheel events for scroll gestures
    document.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    // Keyboard events for gesture combinations
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  // Touch event handlers
  handleTouchStart(e) {
    if (!this.isEnabled) return;
    
    const touches = Array.from(e.touches);
    touches.forEach(touch => {
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        element: e.target
      });
    });
    
    // Detect multi-touch gestures
    if (touches.length === 2) {
      this.startPinchGesture(touches);
    } else if (touches.length === 3) {
      this.detectThreeFingerGesture(touches);
    }
    
    // Start long press detection
    if (touches.length === 1) {
      this.startLongPressDetection(touches[0]);
    }
  }
  
  handleTouchMove(e) {
    if (!this.isEnabled) return;
    
    const touches = Array.from(e.touches);
    touches.forEach(touch => {
      const storedTouch = this.touches.get(touch.identifier);
      if (storedTouch) {
        storedTouch.currentX = touch.clientX;
        storedTouch.currentY = touch.clientY;
      }
    });
    
    // Update pinch gesture
    if (touches.length === 2) {
      this.updatePinchGesture(touches);
    }
    
    // Prevent default for certain gestures
    if (this.shouldPreventDefault(e)) {
      e.preventDefault();
    }
  }
  
  handleTouchEnd(e) {
    if (!this.isEnabled) return;
    
    const changedTouches = Array.from(e.changedTouches);
    changedTouches.forEach(touch => {
      const storedTouch = this.touches.get(touch.identifier);
      if (storedTouch) {
        this.processGesture(storedTouch);
        this.touches.delete(touch.identifier);
      }
    });
    
    // Clear long press timer
    this.clearLongPressTimer();
    
    // Handle tap gestures
    if (e.touches.length === 0) {
      this.handleTapGesture(e);
    }
  }
  
  handleTouchCancel(e) {
    this.touches.clear();
    this.clearLongPressTimer();
  }
  
  // Gesture processing
  processGesture(touch) {
    const deltaX = touch.currentX - touch.startX;
    const deltaY = touch.currentY - touch.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - touch.startTime;
    const velocity = distance / duration;
    
    // Detect swipe gestures
    if (distance > this.thresholds.swipeDistance && velocity > this.thresholds.swipeVelocity) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      this.detectSwipeDirection(angle, distance, velocity);
    }
  }
  
  detectSwipeDirection(angle, distance, velocity) {
    let direction;
    
    if (angle >= -45 && angle <= 45) {
      direction = 'right';
    } else if (angle >= 45 && angle <= 135) {
      direction = 'down';
    } else if (angle >= -135 && angle <= -45) {
      direction = 'up';
    } else {
      direction = 'left';
    }
    
    this.executeGesture(`swipe${direction.charAt(0).toUpperCase() + direction.slice(1)}`, {
      direction,
      distance,
      velocity
    });
  }
  
  // Pinch gesture handling
  startPinchGesture(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    this.pinchData = {
      initialDistance: this.getDistance(touch1, touch2),
      initialScale: 1,
      center: this.getCenter(touch1, touch2)
    };
  }
  
  updatePinchGesture(touches) {
    if (!this.pinchData) return;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    const currentDistance = this.getDistance(touch1, touch2);
    const scale = currentDistance / this.pinchData.initialDistance;
    
    if (Math.abs(scale - this.pinchData.initialScale) > this.thresholds.pinchScale) {
      const gestureType = scale > this.pinchData.initialScale ? 'pinchOut' : 'pinchIn';
      this.executeGesture(gestureType, {
        scale,
        center: this.getCenter(touch1, touch2)
      });
      this.pinchData.initialScale = scale;
    }
  }
  
  // Tap gesture handling
  handleTapGesture(e) {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTap;
    
    if (timeSinceLastTap < this.thresholds.doubleTapTime) {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }
    
    this.lastTap = now;
    
    // Detect double tap
    if (this.tapCount === 2) {
      this.executeGesture('doubleTap', {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      });
      this.tapCount = 0;
    }
  }
  
  // Long press detection
  startLongPressDetection(touch) {
    this.clearLongPressTimer();
    
    this.longPressTimer = setTimeout(() => {
      this.executeGesture('longPress', {
        x: touch.clientX,
        y: touch.clientY,
        element: touch.target
      });
    }, this.thresholds.longPressTime);
  }
  
  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
  
  // Three finger gesture detection
  detectThreeFingerGesture(touches) {
    // Simple three-finger tap detection
    setTimeout(() => {
      if (this.touches.size === 3) {
        this.executeGesture('threeFingerTap', {
          touches: touches.map(t => ({ x: t.clientX, y: t.clientY }))
        });
      }
    }, 100);
  }
  
  // Mouse event handlers (for desktop)
  handleMouseDown(e) {
    if (e.button === 0) { // Left click
      this.mouseData = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        isDown: true
      };
    }
  }
  
  handleMouseMove(e) {
    if (!this.mouseData || !this.mouseData.isDown) return;
    
    const deltaX = e.clientX - this.mouseData.startX;
    const deltaY = e.clientY - this.mouseData.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Detect mouse drag gestures
    if (distance > this.thresholds.panDistance) {
      this.executeGesture('pan', {
        deltaX,
        deltaY,
        distance
      });
    }
  }
  
  handleMouseUp(e) {
    if (this.mouseData) {
      this.mouseData.isDown = false;
      this.mouseData = null;
    }
  }
  
  // Wheel gesture handling
  handleWheel(e) {
    if (!this.isEnabled) return;
    
    const delta = e.deltaY;
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom gesture
      e.preventDefault();
      this.executeGesture('zoom', {
        delta: -delta,
        x: e.clientX,
        y: e.clientY
      });
    } else if (isHorizontal) {
      // Horizontal scroll
      this.executeGesture('horizontalScroll', {
        delta: e.deltaX
      });
    } else {
      // Vertical scroll
      this.executeGesture('verticalScroll', {
        delta: e.deltaY
      });
    }
  }
  
  // Keyboard gesture combinations
  handleKeyDown(e) {
    this.modifierKeys = {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey
    };
  }
  
  handleKeyUp(e) {
    this.modifierKeys = {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey
    };
  }
  
  // Gesture execution
  executeGesture(gestureType, data = {}) {
    const config = this.gestureConfig[gestureType];
    if (!config || !config.enabled) return;
    
    // Add haptic feedback if available
    this.triggerHapticFeedback(gestureType);
    
    // Execute the configured action
    this.executeAction(config.action, data);
    
    // Emit gesture event
    this.emitGestureEvent(gestureType, data);
    
    // Add visual feedback
    this.addVisualFeedback(gestureType, data);
  }
  
  executeAction(action, data) {
    switch (action) {
      case 'nextTrack':
        this.audioEngine.nextTrack();
        break;
      case 'previousTrack':
        this.audioEngine.previousTrack();
        break;
      case 'togglePlayPause':
        this.audioEngine.togglePlayPause();
        break;
      case 'volumeUp':
        this.adjustVolume(0.1);
        break;
      case 'volumeDown':
        this.adjustVolume(-0.1);
        break;
      case 'toggleShuffle':
        this.audioEngine.toggleShuffle();
        break;
      case 'toggleRepeat':
        this.audioEngine.cycleRepeatMode();
        break;
      case 'showMiniPlayer':
        this.showMiniPlayer();
        break;
      case 'showFullscreen':
        this.toggleFullscreen();
        break;
      case 'showContextMenu':
        this.showContextMenu(data);
        break;
      case 'seek':
        this.handleSeekGesture(data);
        break;
      default:
        console.log(`Unknown gesture action: ${action}`);
    }
  }
  
  // Action implementations
  adjustVolume(delta) {
    const currentVolume = this.audioEngine.getVolume();
    const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
    this.audioEngine.setVolume(newVolume);
  }
  
  showMiniPlayer() {
    // Emit event to show mini player
    document.dispatchEvent(new CustomEvent('showMiniPlayer'));
  }
  
  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
  
  showContextMenu(data) {
    // Create and show context menu at gesture location
    const contextMenu = document.createElement('div');
    contextMenu.className = 'gesture-context-menu';
    contextMenu.style.left = data.x + 'px';
    contextMenu.style.top = data.y + 'px';
    
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="play">Play</div>
      <div class="context-menu-item" data-action="add-to-playlist">Add to Playlist</div>
      <div class="context-menu-item" data-action="show-info">Show Info</div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Remove after delay or on click
    setTimeout(() => {
      if (contextMenu.parentNode) {
        contextMenu.parentNode.removeChild(contextMenu);
      }
    }, 3000);
  }
  
  handleSeekGesture(data) {
    if (data.deltaX) {
      const seekAmount = (data.deltaX / window.innerWidth) * this.audioEngine.getDuration();
      const currentTime = this.audioEngine.getCurrentTime();
      const newTime = Math.max(0, Math.min(this.audioEngine.getDuration(), currentTime + seekAmount));
      this.audioEngine.seek(newTime);
    }
  }
  
  // Haptic feedback
  triggerHapticFeedback(gestureType) {
    if ('vibrate' in navigator) {
      const patterns = {
        swipeLeft: [50],
        swipeRight: [50],
        swipeUp: [30, 30, 30],
        swipeDown: [30, 30, 30],
        doubleTap: [25, 25, 25],
        longPress: [100],
        pinchIn: [40, 20, 40],
        pinchOut: [20, 40, 20]
      };
      
      const pattern = patterns[gestureType] || [25];
      navigator.vibrate(pattern);
    }
  }
  
  // Visual feedback
  addVisualFeedback(gestureType, data) {
    const feedback = document.createElement('div');
    feedback.className = 'gesture-feedback';
    feedback.textContent = this.getGestureFeedbackText(gestureType);
    
    // Position feedback
    if (data.x && data.y) {
      feedback.style.left = data.x + 'px';
      feedback.style.top = data.y + 'px';
    } else {
      feedback.style.left = '50%';
      feedback.style.top = '50%';
      feedback.style.transform = 'translate(-50%, -50%)';
    }
    
    document.body.appendChild(feedback);
    
    // Animate and remove
    setTimeout(() => {
      feedback.classList.add('fade-out');
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 1000);
  }
  
  getGestureFeedbackText(gestureType) {
    const feedbackTexts = {
      swipeLeft: '⏭️ Next',
      swipeRight: '⏮️ Previous',
      swipeUp: '🔊 Volume Up',
      swipeDown: '🔉 Volume Down',
      doubleTap: '⏯️ Play/Pause',
      longPress: '📋 Menu',
      pinchIn: '📱 Mini Player',
      pinchOut: '🔍 Fullscreen',
      toggleShuffle: '🔀 Shuffle',
      toggleRepeat: '🔁 Repeat'
    };
    
    return feedbackTexts[gestureType] || gestureType;
  }
  
  // Utility functions
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }
  
  shouldPreventDefault(e) {
    // Prevent default for certain gesture areas or conditions
    const gestureAreas = document.querySelectorAll('.gesture-area');
    return Array.from(gestureAreas).some(area => area.contains(e.target));
  }
  
  // Configuration
  configureGesture(gestureType, config) {
    if (this.gestureConfig[gestureType]) {
      this.gestureConfig[gestureType] = { ...this.gestureConfig[gestureType], ...config };
      this.saveGestureSettings();
    }
  }
  
  enableGesture(gestureType) {
    if (this.gestureConfig[gestureType]) {
      this.gestureConfig[gestureType].enabled = true;
      this.saveGestureSettings();
    }
  }
  
  disableGesture(gestureType) {
    if (this.gestureConfig[gestureType]) {
      this.gestureConfig[gestureType].enabled = false;
      this.saveGestureSettings();
    }
  }
  
  // Settings persistence
  async saveGestureSettings() {
    try {
      if (window.api) {
        await window.api.invoke('save-gesture-settings', {
          config: this.gestureConfig,
          thresholds: this.thresholds,
          enabled: this.isEnabled
        });
      }
    } catch (error) {
      console.error('Error saving gesture settings:', error);
    }
  }
  
  async loadGestureSettings() {
    try {
      if (window.api) {
        const settings = await window.api.invoke('get-gesture-settings');
        if (settings) {
          this.gestureConfig = { ...this.gestureConfig, ...settings.config };
          this.thresholds = { ...this.thresholds, ...settings.thresholds };
          this.isEnabled = settings.enabled !== false;
        }
      }
    } catch (error) {
      console.error('Error loading gesture settings:', error);
    }
  }
  
  // Event emission
  emitGestureEvent(gestureType, data) {
    const event = new CustomEvent('gesture', {
      detail: {
        type: gestureType,
        data,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }
  
  // Enable/disable gestures
  enable() {
    this.isEnabled = true;
    this.saveGestureSettings();
  }
  
  disable() {
    this.isEnabled = false;
    this.saveGestureSettings();
  }
  
  // Cleanup
  destroy() {
    this.clearLongPressTimer();
    this.touches.clear();
    
    // Remove event listeners
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchcancel', this.handleTouchCancel);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}

module.exports = GestureManager;