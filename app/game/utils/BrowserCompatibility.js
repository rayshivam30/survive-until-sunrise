/**
 * BrowserCompatibility - Handles browser feature detection and fallbacks
 * Provides graceful degradation for unsupported Web APe fallback messaging
 */

export class BrowserCompatibility {
  constructor(options = {}) {
    this.options = {
      showWarnings: options.showWarnings ?? true,
      enableFallbacks: options.enableFallbacks ?? true,
      strictMode: options.strictMode ?? false,
      ...options
    };
    
    this.compatibilityResults = null;
    this.fallbacksActivated = [];
    this.warningsShown = [];
  }

  /**
   * Perform comprehensive browser compatibility check
   * @returns {Object} Detailed compatibility results
   */
  checkCompatibility() {
    const results = {
      overall: 'unknown',
      score: 0,
      maxScore: 0,
      features: {},
      warnings: [],
      errors: [],
      recommendations: [],
      fallbacks: [],
      browserInfo: this.getBrowserInfo()
    };

    // Core Web APIs required for the game
    const coreFeatures = {
      speechRecognition: this.checkSpeechRecognition(),
      speechSynthesis: this.checkSpeechSynthesis(),
      audioContext: this.checkAudioContext(),
      mediaDevices: this.checkMediaDevices(),
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      webAudio: this.checkWebAudio(),
      https: this.checkHTTPS(),
      modernBrowser: this.checkModernBrowser()
    };

    // Enhanced features that improve experience
    const enhancedFeatures = {
      webGL: this.checkWebGL(),
      fullscreen: this.checkFullscreen(),
      vibration: this.checkVibration(),
      notifications: this.checkNotifications(),
      serviceWorker: this.checkServiceWorker(),
      webAssembly: this.checkWebAssembly()
    };

    // Combine all features
    results.features = { ...coreFeatures, ...enhancedFeatures };

    // Calculate compatibility score
    const coreWeight = 10;
    const enhancedWeight = 2;
    
    Object.entries(coreFeatures).forEach(([feature, supported]) => {
      results.maxScore += coreWeight;
      if (supported.supported) {
        results.score += coreWeight;
      } else {
        results.errors.push({
          feature,
          message: supported.message || `${feature} not supported`,
          severity: 'high',
          fallback: supported.fallback
        });
      }
    });

    Object.entries(enhancedFeatures).forEach(([feature, supported]) => {
      results.maxScore += enhancedWeight;
      if (supported.supported) {
        results.score += enhancedWeight;
      } else {
        results.warnings.push({
          feature,
          message: supported.message || `${feature} not available`,
          severity: 'low',
          fallback: supported.fallback
        });
      }
    });

    // Determine overall compatibility
    const compatibilityPercentage = (results.score / results.maxScore) * 100;
    
    if (compatibilityPercentage >= 90) {
      results.overall = 'excellent';
    } else if (compatibilityPercentage >= 75) {
      results.overall = 'good';
    } else if (compatibilityPercentage >= 60) {
      results.overall = 'fair';
    } else if (compatibilityPercentage >= 40) {
      results.overall = 'poor';
    } else {
      results.overall = 'incompatible';
    }

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);
    
    // Generate fallback strategies
    results.fallbacks = this.generateFallbacks(results);

    this.compatibilityResults = results;
    return results;
  }

  /**
   * Check Speech Recognition API support
   * @returns {Object} Support status and details
   */
  checkSpeechRecognition() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'Speech Recognition not available in non-browser environment'
      };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return {
        supported: false,
        message: 'Speech Recognition API not supported',
        fallback: 'Text input will be available as alternative',
        recommendation: 'Use Chrome, Firefox, or Safari for voice commands'
      };
    }

    // Test if we can create an instance
    try {
      const recognition = new SpeechRecognition();
      recognition.abort(); // Clean up immediately
      
      return {
        supported: true,
        message: 'Speech Recognition API available',
        vendor: SpeechRecognition === window.SpeechRecognition ? 'standard' : 'webkit'
      };
    } catch (error) {
      return {
        supported: false,
        message: 'Speech Recognition API creation failed',
        error: error.message,
        fallback: 'Text input will be available'
      };
    }
  }

  /**
   * Check Speech Synthesis API support
   * @returns {Object} Support status and details
   */
  checkSpeechSynthesis() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'Speech Synthesis not available in non-browser environment'
      };
    }

    if (!window.speechSynthesis) {
      return {
        supported: false,
        message: 'Speech Synthesis API not supported',
        fallback: 'Text display will be used for narration'
      };
    }

    // Check if voices are available
    const voices = speechSynthesis.getVoices();
    
    return {
      supported: true,
      message: 'Speech Synthesis API available',
      voiceCount: voices.length,
      hasEnglishVoices: voices.some(voice => voice.lang.startsWith('en')),
      details: {
        voicesLoaded: voices.length > 0,
        defaultVoice: speechSynthesis.getVoices()[0]?.name || 'Unknown'
      }
    };
  }

  /**
   * Check Audio Context support
   * @returns {Object} Support status and details
   */
  checkAudioContext() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'Web Audio API not available in non-browser environment'
      };
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    if (!AudioContext) {
      return {
        supported: false,
        message: 'Web Audio API not supported',
        fallback: 'Basic HTML5 audio will be used'
      };
    }

    try {
      const context = new AudioContext();
      const supported = {
        supported: true,
        message: 'Web Audio API available',
        sampleRate: context.sampleRate,
        state: context.state,
        vendor: AudioContext === window.AudioContext ? 'standard' : 'webkit'
      };
      
      // Clean up
      if (context.close) {
        context.close();
      }
      
      return supported;
    } catch (error) {
      return {
        supported: false,
        message: 'Web Audio API creation failed',
        error: error.message,
        fallback: 'HTML5 audio fallback available'
      };
    }
  }

  /**
   * Check Media Devices API support
   * @returns {Object} Support status and details
   */
  checkMediaDevices() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        supported: false,
        message: 'Media Devices API not available in non-browser environment'
      };
    }

    if (!navigator.mediaDevices) {
      return {
        supported: false,
        message: 'Media Devices API not supported',
        fallback: 'Voice commands may not work reliably'
      };
    }

    if (!navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: 'getUserMedia not supported',
        fallback: 'Microphone access not available'
      };
    }

    return {
      supported: true,
      message: 'Media Devices API available',
      enumerateDevices: !!navigator.mediaDevices.enumerateDevices,
      getSupportedConstraints: !!navigator.mediaDevices.getSupportedConstraints
    };
  }

  /**
   * Check Local Storage support
   * @returns {Object} Support status and details
   */
  checkLocalStorage() {
    // Skip in non-browser environments
    if (typeof localStorage === 'undefined') {
      return {
        supported: false,
        message: 'localStorage not available in non-browser environment'
      };
    }

    try {
      const testKey = 'compatibility-test';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('localStorage read/write failed');
      }

      return {
        supported: true,
        message: 'localStorage available',
        quota: this.estimateStorageQuota()
      };
    } catch (error) {
      return {
        supported: false,
        message: 'localStorage not available',
        error: error.message,
        fallback: 'Game progress cannot be saved'
      };
    }
  }

  /**
   * Check Session Storage support
   * @returns {Object} Support status and details
   */
  checkSessionStorage() {
    // Skip in non-browser environments
    if (typeof sessionStorage === 'undefined') {
      return {
        supported: false,
        message: 'sessionStorage not available in non-browser environment'
      };
    }

    try {
      const testKey = 'session-test';
      const testValue = 'test';
      
      sessionStorage.setItem(testKey, testValue);
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      return {
        supported: retrieved === testValue,
        message: retrieved === testValue ? 'sessionStorage available' : 'sessionStorage failed'
      };
    } catch (error) {
      return {
        supported: false,
        message: 'sessionStorage not available',
        error: error.message
      };
    }
  }

  /**
   * Check Web Audio API features
   * @returns {Object} Support status and details
   */
  checkWebAudio() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'Web Audio API not available in non-browser environment'
      };
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    if (!AudioContext) {
      return {
        supported: false,
        message: 'Web Audio not supported'
      };
    }

    try {
      const context = new AudioContext();
      const features = {
        supported: true,
        message: 'Web Audio API available',
        analyser: !!context.createAnalyser,
        oscillator: !!context.createOscillator,
        gain: !!context.createGain,
        biquadFilter: !!context.createBiquadFilter,
        convolver: !!context.createConvolver,
        delay: !!context.createDelay,
        dynamicsCompressor: !!context.createDynamicsCompressor
      };
      
      if (context.close) {
        context.close();
      }
      
      return features;
    } catch (error) {
      return {
        supported: false,
        message: 'Web Audio API failed',
        error: error.message
      };
    }
  }

  /**
   * Check HTTPS requirement
   * @returns {Object} Support status and details
   */
  checkHTTPS() {
    // Skip in non-browser environments
    if (typeof window === 'undefined' || !window.location) {
      return {
        supported: false,
        message: 'HTTPS check not available in non-browser environment',
        protocol: 'unknown',
        hostname: 'unknown'
      };
    }

    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    const secure = isHTTPS || isLocalhost;
    
    return {
      supported: secure,
      message: secure ? 'Secure context available' : 'HTTPS required for microphone access',
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      fallback: !secure ? 'Some features may not work without HTTPS' : null
    };
  }

  /**
   * Check if browser is modern enough
   * @returns {Object} Support status and details
   */
  checkModernBrowser() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        supported: false,
        message: 'Browser check not available in non-browser environment',
        browser: 'unknown',
        version: 0
      };
    }

    const userAgent = navigator.userAgent;
    const browserInfo = this.getBrowserInfo();
    
    // Define minimum versions for reliable operation
    const minimumVersions = {
      chrome: 60,
      firefox: 55,
      safari: 14,
      edge: 79
    };

    const isModern = browserInfo.version >= (minimumVersions[browserInfo.name] || 999);
    
    return {
      supported: isModern,
      message: isModern ? 'Modern browser detected' : 'Browser may be outdated',
      browser: browserInfo.name,
      version: browserInfo.version,
      minimum: minimumVersions[browserInfo.name] || 'Unknown',
      recommendation: !isModern ? 'Please update your browser for best experience' : null
    };
  }

  /**
   * Check WebGL support
   * @returns {Object} Support status and details
   */
  checkWebGL() {
    try {
      // Skip WebGL check in test environments
      if (typeof jest !== 'undefined' || process.env.NODE_ENV === 'test') {
        return {
          supported: false,
          message: 'WebGL check skipped in test environment'
        };
      }

      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return {
          supported: false,
          message: 'WebGL not supported'
        };
      }

      return {
        supported: true,
        message: 'WebGL available',
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER)
      };
    } catch (error) {
      return {
        supported: false,
        message: 'WebGL check failed',
        error: error.message
      };
    }
  }

  /**
   * Check Fullscreen API support
   * @returns {Object} Support status and details
   */
  checkFullscreen() {
    // Skip in non-browser environments
    if (typeof document === 'undefined') {
      return {
        supported: false,
        message: 'Fullscreen API not available in non-browser environment'
      };
    }

    const element = document.documentElement;
    const supported = !!(
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen
    );

    return {
      supported,
      message: supported ? 'Fullscreen API available' : 'Fullscreen not supported',
      vendor: this.getFullscreenVendor()
    };
  }

  /**
   * Check Vibration API support
   * @returns {Object} Support status and details
   */
  checkVibration() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        supported: false,
        message: 'Vibration API not available in non-browser environment'
      };
    }

    const supported = !!navigator.vibrate;
    
    return {
      supported,
      message: supported ? 'Vibration API available' : 'Vibration not supported'
    };
  }

  /**
   * Check Notifications API support
   * @returns {Object} Support status and details
   */
  checkNotifications() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'Notifications API not available in non-browser environment'
      };
    }

    const supported = !!window.Notification;
    
    return {
      supported,
      message: supported ? 'Notifications API available' : 'Notifications not supported',
      permission: supported ? Notification.permission : 'not-supported'
    };
  }

  /**
   * Check Service Worker support
   * @returns {Object} Support status and details
   */
  checkServiceWorker() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        supported: false,
        message: 'Service Worker not available in non-browser environment'
      };
    }

    const supported = !!navigator.serviceWorker;
    
    return {
      supported,
      message: supported ? 'Service Worker available' : 'Service Worker not supported'
    };
  }

  /**
   * Check WebAssembly support
   * @returns {Object} Support status and details
   */
  checkWebAssembly() {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return {
        supported: false,
        message: 'WebAssembly not available in non-browser environment'
      };
    }

    const supported = !!window.WebAssembly;
    
    return {
      supported,
      message: supported ? 'WebAssembly available' : 'WebAssembly not supported'
    };
  }

  /**
   * Get detailed browser information
   * @returns {Object} Browser details
   */
  getBrowserInfo() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        name: 'unknown',
        version: 0,
        userAgent: 'non-browser-environment',
        platform: 'unknown',
        language: 'unknown',
        cookieEnabled: false,
        onLine: false,
        hardwareConcurrency: 1
      };
    }

    const userAgent = navigator.userAgent;
    let browserName = 'unknown';
    let browserVersion = 0;

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Firefox')) {
      browserName = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Edg')) {
      browserName = 'edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 1
    };
  }

  /**
   * Estimate localStorage quota
   * @returns {string} Estimated quota
   */
  estimateStorageQuota() {
    try {
      // Try to estimate by attempting to store data
      let estimate = 'unknown';
      const testData = 'x'.repeat(1024); // 1KB
      let size = 0;
      
      // This is a rough estimation method
      try {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`quota-test-${i}`, testData);
          size += testData.length;
        }
      } catch (e) {
        // Clean up test data
        for (let i = 0; i < 1000; i++) {
          localStorage.removeItem(`quota-test-${i}`);
        }
        
        if (size > 0) {
          estimate = `~${Math.round(size / 1024)}KB available`;
        }
      }
      
      return estimate;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get fullscreen vendor prefix
   * @returns {string} Vendor prefix
   */
  getFullscreenVendor() {
    const element = document.documentElement;
    
    if (element.requestFullscreen) return 'standard';
    if (element.webkitRequestFullscreen) return 'webkit';
    if (element.mozRequestFullScreen) return 'moz';
    if (element.msRequestFullscreen) return 'ms';
    
    return 'none';
  }

  /**
   * Generate recommendations based on compatibility results
   * @param {Object} results - Compatibility results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    // Browser recommendations
    if (results.overall === 'poor' || results.overall === 'incompatible') {
      recommendations.push({
        type: 'browser',
        priority: 'high',
        message: 'Consider using a modern browser like Chrome, Firefox, or Safari for the best experience'
      });
    }

    // HTTPS recommendations
    if (!results.features.https.supported) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'HTTPS is required for microphone access. Voice commands may not work.'
      });
    }

    // Audio recommendations
    if (!results.features.audioContext.supported) {
      recommendations.push({
        type: 'audio',
        priority: 'medium',
        message: 'Web Audio API not supported. Audio quality may be reduced.'
      });
    }

    // Storage recommendations
    if (!results.features.localStorage.supported) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        message: 'Local storage not available. Game progress cannot be saved.'
      });
    }

    // Voice recommendations
    if (!results.features.speechRecognition.supported) {
      recommendations.push({
        type: 'voice',
        priority: 'high',
        message: 'Voice recognition not supported. Text input will be available as fallback.'
      });
    }

    return recommendations;
  }

  /**
   * Generate fallback strategies
   * @param {Object} results - Compatibility results
   * @returns {Array} Array of fallback strategies
   */
  generateFallbacks(results) {
    const fallbacks = [];

    // Voice fallbacks
    if (!results.features.speechRecognition.supported) {
      fallbacks.push({
        feature: 'voice-input',
        strategy: 'text-input',
        description: 'Text input field for commands',
        priority: 'high'
      });
    }

    // Audio fallbacks
    if (!results.features.speechSynthesis.supported) {
      fallbacks.push({
        feature: 'voice-narration',
        strategy: 'text-display',
        description: 'Text display for game narration',
        priority: 'medium'
      });
    }

    if (!results.features.audioContext.supported) {
      fallbacks.push({
        feature: 'audio-effects',
        strategy: 'visual-effects',
        description: 'Visual cues instead of audio effects',
        priority: 'low'
      });
    }

    // Storage fallbacks
    if (!results.features.localStorage.supported) {
      fallbacks.push({
        feature: 'game-saves',
        strategy: 'session-only',
        description: 'Game state only persists during session',
        priority: 'medium'
      });
    }

    return fallbacks;
  }

  /**
   * Show compatibility warning to user
   * @param {Object} issue - Compatibility issue
   */
  showCompatibilityWarning(issue) {
    if (!this.options.showWarnings) return;
    if (this.warningsShown.includes(issue.feature)) return;

    const warning = document.createElement('div');
    warning.className = `compatibility-warning compatibility-${issue.severity}`;
    warning.innerHTML = `
      <div class="warning-header">
        <span class="warning-icon">⚠️</span>
        <span class="warning-title">Compatibility Issue</span>
        <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="warning-content">
        <p><strong>${issue.feature}:</strong> ${issue.message}</p>
        ${issue.fallback ? `<p><em>Fallback:</em> ${issue.fallback}</p>` : ''}
        ${issue.recommendation ? `<p><em>Recommendation:</em> ${issue.recommendation}</p>` : ''}
      </div>
    `;

    // Add styles
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: ${issue.severity === 'high' ? '#ff6b6b' : '#ffa726'};
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    document.body.appendChild(warning);
    this.warningsShown.push(issue.feature);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }

  /**
   * Activate fallback for a specific feature
   * @param {string} feature - Feature to activate fallback for
   * @param {Function} callback - Callback to execute fallback
   */
  activateFallback(feature, callback) {
    if (!this.options.enableFallbacks) return;
    if (this.fallbacksActivated.includes(feature)) return;

    console.log(`Activating fallback for: ${feature}`);
    
    if (callback && typeof callback === 'function') {
      callback();
    }
    
    this.fallbacksActivated.push(feature);
  }

  /**
   * Get compatibility summary for display
   * @returns {Object} Summary of compatibility status
   */
  getCompatibilitySummary() {
    if (!this.compatibilityResults) {
      this.checkCompatibility();
    }

    const results = this.compatibilityResults;
    
    return {
      overall: results.overall,
      score: `${Math.round((results.score / results.maxScore) * 100)}%`,
      criticalIssues: results.errors.filter(e => e.severity === 'high').length,
      warnings: results.warnings.length,
      canPlay: results.overall !== 'incompatible',
      recommendedBrowser: results.browserInfo.name !== 'chrome' && results.overall !== 'excellent',
      needsHTTPS: !results.features.https.supported
    };
  }

  /**
   * Check for performance-related browser features
   * @returns {Object} Performance feature support
   */
  checkPerformanceFeatures() {
    return {
      performanceObserver: !!window.PerformanceObserver,
      performanceTiming: !!performance.timing,
      performanceMemory: !!(performance.memory || performance.webkitMemory),
      requestAnimationFrame: !!window.requestAnimationFrame,
      intersectionObserver: !!window.IntersectionObserver,
      resizeObserver: !!window.ResizeObserver
    };
  }
}

// Export singleton instance for easy use
export const browserCompatibility = new BrowserCompatibility();

// Export class for custom instances
export default BrowserCompatibility;