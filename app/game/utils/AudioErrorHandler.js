/**
 * Audio Error Handler for the Survive Until Sunrise game
 * Provides graceful error handling and fallback strategies for audio issues
 */
class AudioErrorHandler {
  constructor(gameEngine = null) {
    this.gameEngine = gameEngine;
    this.errorLog = [];
    this.fallbacksEnabled = {
      visualEffects: false,
      textNarration: false,
      silentMode: false
    };
  }

  /**
   * Handle various types of audio errors
   * @param {string} errorType - Type of audio error
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   */
  handleAudioError(errorType, error, context = {}) {
    const errorEntry = {
      type: errorType,
      error: error.message || error,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.errorLog.push(errorEntry);
    console.error(`Audio Error (${errorType}):`, error, context);

    switch (errorType) {
      case 'initialization':
        this.handleInitializationError(error, context);
        break;
      case 'ambient_playback':
        this.handleAmbientError(error, context);
        break;
      case 'effect_playback':
        this.handleEffectError(error, context);
        break;
      case 'voice_synthesis':
        this.handleVoiceError(error, context);
        break;
      case 'loading':
        this.handleLoadingError(error, context);
        break;
      case 'playback':
        this.handlePlaybackError(error, context);
        break;
      default:
        this.handleGenericError(error, context);
    }
  }

  /**
   * Handle audio initialization errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleInitializationError(error, context) {
    console.warn('Audio initialization failed, enabling fallback mode');
    
    // Enable silent mode as fallback
    this.fallbacksEnabled.silentMode = true;
    
    // Notify game engine if available
    if (this.gameEngine && this.gameEngine.notifyAudioIssue) {
      this.gameEngine.notifyAudioIssue('Audio system unavailable - running in silent mode');
    }

    // Show user notification
    this.showUserNotification(
      'Audio Unavailable', 
      'The game will continue without sound. Please check your audio settings.',
      'warning'
    );
  }

  /**
   * Handle ambient sound playback errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleAmbientError(error, context) {
    console.warn('Ambient audio error, continuing without ambient sound');
    
    // Continue game without ambient sound - not critical for gameplay
    if (this.gameEngine && this.gameEngine.notifyAudioIssue) {
      this.gameEngine.notifyAudioIssue('Ambient audio unavailable');
    }
  }

  /**
   * Handle sound effect playback errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleEffectError(error, context) {
    console.warn('Sound effect error, enabling visual effects fallback');
    
    // Enable visual effects as fallback for audio cues
    this.fallbacksEnabled.visualEffects = true;
    
    if (this.gameEngine && this.gameEngine.enableVisualEffects) {
      this.gameEngine.enableVisualEffects();
    }
  }

  /**
   * Handle voice synthesis errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleVoiceError(error, context) {
    console.warn('Voice synthesis error, enabling text narration fallback');
    
    // Enable text narration as fallback
    this.fallbacksEnabled.textNarration = true;
    
    if (this.gameEngine && this.gameEngine.enableTextNarration) {
      this.gameEngine.enableTextNarration();
    }
  }

  /**
   * Handle audio loading errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleLoadingError(error, context) {
    const { soundKey, category } = context;
    console.warn(`Failed to load ${category} sound: ${soundKey}`);
    
    // Try to load a fallback sound or continue without it
    if (category === 'ambient') {
      // Ambient sounds are important for atmosphere but not critical
      console.log('Continuing without ambient sound:', soundKey);
    } else if (category === 'effects') {
      // Sound effects can be replaced with visual cues
      this.fallbacksEnabled.visualEffects = true;
    }
  }

  /**
   * Handle general playback errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handlePlaybackError(error, context) {
    console.warn('Audio playback error:', error.message);
    
    // Log the error and continue - most playback errors are recoverable
    if (context.retry && context.retryCount < 3) {
      // Attempt retry for critical sounds
      setTimeout(() => {
        if (context.retryCallback) {
          context.retryCallback();
        }
      }, 1000);
    }
  }

  /**
   * Handle generic audio errors
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   */
  handleGenericError(error, context) {
    console.warn('Generic audio error:', error.message);
    
    // Log and continue - don't break the game for unknown audio errors
  }

  /**
   * Show user notification for audio issues
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('info', 'warning', 'error')
   */
  showUserNotification(title, message, type = 'info') {
    // Create a simple notification system
    const notification = document.createElement('div');
    notification.className = `audio-notification audio-notification-${type}`;
    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#4444ff'};
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: monospace;
      font-size: 12px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Enable visual effects fallback for audio cues
   */
  enableVisualEffects() {
    this.fallbacksEnabled.visualEffects = true;
    
    // Add CSS for visual effects
    if (!document.getElementById('audio-fallback-styles')) {
      const style = document.createElement('style');
      style.id = 'audio-fallback-styles';
      style.textContent = `
        .visual-audio-cue {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid #00ff00;
          border-radius: 50%;
          width: 100px;
          height: 100px;
          animation: audioVisualPulse 0.5s ease-out;
          pointer-events: none;
          z-index: 9999;
        }
        
        @keyframes audioVisualPulse {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        
        .visual-heartbeat {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 0, 0, 0.1);
          animation: heartbeatFlash 1s infinite;
          pointer-events: none;
          z-index: 9998;
        }
        
        @keyframes heartbeatFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Show visual cue for audio effect
   * @param {string} effectType - Type of effect to visualize
   * @param {Object} options - Visual effect options
   */
  showVisualCue(effectType, options = {}) {
    if (!this.fallbacksEnabled.visualEffects) return;
    
    switch (effectType) {
      case 'jump_scare':
        this.createVisualPulse('#ff0000', 200);
        break;
      case 'heartbeat':
        this.createHeartbeatEffect();
        break;
      case 'footsteps':
        this.createVisualPulse('#00ff00', 100);
        break;
      case 'door_creak':
        this.createVisualPulse('#ffff00', 150);
        break;
      default:
        this.createVisualPulse('#ffffff', 100);
    }
  }

  /**
   * Create a visual pulse effect
   * @param {string} color - Pulse color
   * @param {number} size - Pulse size
   */
  createVisualPulse(color, size) {
    const pulse = document.createElement('div');
    pulse.className = 'visual-audio-cue';
    pulse.style.borderColor = color;
    pulse.style.width = `${size}px`;
    pulse.style.height = `${size}px`;
    
    document.body.appendChild(pulse);
    
    setTimeout(() => {
      if (pulse.parentElement) {
        pulse.remove();
      }
    }, 500);
  }

  /**
   * Create heartbeat visual effect
   */
  createHeartbeatEffect() {
    if (document.querySelector('.visual-heartbeat')) return;
    
    const heartbeat = document.createElement('div');
    heartbeat.className = 'visual-heartbeat';
    document.body.appendChild(heartbeat);
    
    // Remove after 10 seconds or when heartbeat stops
    setTimeout(() => {
      if (heartbeat.parentElement) {
        heartbeat.remove();
      }
    }, 10000);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByType: {},
      fallbacksEnabled: { ...this.fallbacksEnabled },
      recentErrors: this.errorLog.slice(-5)
    };
    
    this.errorLog.forEach(entry => {
      stats.errorsByType[entry.type] = (stats.errorsByType[entry.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Check if audio system is functional
   * @returns {boolean} True if audio is working
   */
  isAudioFunctional() {
    return !this.fallbacksEnabled.silentMode;
  }

  /**
   * Reset fallback states
   */
  resetFallbacks() {
    this.fallbacksEnabled = {
      visualEffects: false,
      textNarration: false,
      silentMode: false
    };
  }
}

export default AudioErrorHandler;