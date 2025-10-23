/**
 * PerformanceIntegration - Integrates all performance optimization systems
 * Coordinates AudioPreloader, VoiceCommandDebouncer, BrowserCompatibility, and PerformanceMonitor
 * Requirements: 9.1, 9.2, 9.3, 9.6
 */

import { AudioPreloader } from './AudioPreloader.js';
import { VoiceCommandDebouncer } from './VoiceCommandDebouncer.js';
import { BrowserCompatibility, browserCompatibility } from './BrowserCompatibility.js';
import { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor.js';
import { PerformanceOptimizer } from './PerformanceOptimizer.js';

export class PerformanceIntegration {
  constructor(audioManager = null, gameEngine = null, voiceController = null) {
    this.audioManager = audioManager;
    this.gameEngine = gameEngine;
    this.voiceController = voiceController;

    // Initialize performance systems
    this.audioPreloader = null;
    this.voiceDebouncer = null;
    this.browserCompatibility = browserCompatibility;
    this.performanceMonitor = performanceMonitor;
    this.performanceOptimizer = null;

    // Integration state
    this.isInitialized = false;
    this.optimizationLevel = 'normal';
    this.compatibilityResults = null;

    // Performance callbacks
    this.performanceCallbacks = new Set();
    this.compatibilityCallbacks = new Set();

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handlePerformanceIssue = this.handlePerformanceIssue.bind(this);
    this.handleCompatibilityIssue = this.handleCompatibilityIssue.bind(this);
  }

  /**
   * Initialize all performance optimization systems
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    console.log('Initializing performance optimization systems...');

    try {
      // Step 1: Check browser compatibility
      this.compatibilityResults = this.browserCompatibility.checkCompatibility();
      console.log('Browser compatibility check completed:', this.compatibilityResults.overall);

      // Step 2: Initialize performance monitor
      this.performanceMonitor.startMonitoring();

      // Step 3: Initialize audio preloader if audio manager is available
      if (this.audioManager) {
        this.audioPreloader = new AudioPreloader(this.audioManager, {
          enablePreloading: this.compatibilityResults.overall !== 'poor',
          enableLazyLoading: true,
          preloadPriority: this.getPreloadPriority(),
          ...options.audioPreloader
        });
      }

      // Step 4: Initialize voice command debouncer
      this.voiceDebouncer = new VoiceCommandDebouncer({
        enableAdaptiveDebouncing: true,
        enablePerformanceMode: true,
        ...options.voiceDebouncer
      });

      // Step 5: Initialize performance optimizer
      this.performanceOptimizer = new PerformanceOptimizer(
        this.audioManager,
        this.gameEngine
      );

      // Step 6: Setup performance callbacks
      this.setupPerformanceCallbacks();

      this.isInitialized = true;
      console.log('Performance optimization systems initialized successfully');

      return { success: true, message: 'Performance systems initialized' };

    } catch (error) {
      console.error('Failed to initialize performance systems:', error);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  /**

   * Get preload priority based on browser compatibility
   * @returns {string} Preload priority level
   */
  getPreloadPriority() {
    if (!this.compatibilityResults) {
      return 'normal';
    }

    switch (this.compatibilityResults.overall) {
      case 'excellent':
      case 'good':
        return 'all';
      case 'fair':
        return 'important';
      case 'poor':
        return 'essential';
      default:
        return 'essential';
    }
  }

  /**
   * Setup performance monitoring and optimization callbacks
   */
  setupPerformanceCallbacks() {
    // Monitor performance issues
    this.performanceMonitor.onPerformanceIssue((issue) => {
      this.handlePerformanceIssue(issue);
    });

    // Monitor voice command performance
    if (this.voiceDebouncer) {
      this.voiceDebouncer.onDebug((event, data) => {
        if (event === 'performance_mode_enabled' || event === 'adaptive_mode_enabled') {
          this.handlePerformanceIssue({
            type: 'voice_performance',
            severity: 'medium',
            details: data
          });
        }
      });
    }

    // Monitor audio preloading performance
    if (this.audioPreloader) {
      this.audioPreloader.onError((assetKey, error) => {
        this.handleCompatibilityIssue({
          type: 'audio_load_error',
          asset: assetKey,
          error: error.message
        });
      });
    }
  }

  /**
   * Handle performance issues by applying optimizations
   * @param {Object} issue - Performance issue details
   */
  handlePerformanceIssue(issue) {
    console.log('Handling performance issue:', issue);

    // Apply automatic optimizations based on issue type
    switch (issue.type) {
      case 'low_fps':
        this.applyFPSOptimizations(issue);
        break;
      case 'high_memory_usage':
        this.applyMemoryOptimizations(issue);
        break;
      case 'high_audio_latency':
        this.applyAudioOptimizations(issue);
        break;
      case 'high_voice_latency':
        this.applyVoiceOptimizations(issue);
        break;
      case 'voice_performance':
        this.applyVoicePerformanceOptimizations(issue);
        break;
    }

    // Notify callbacks
    this.notifyPerformanceCallbacks(issue);
  }

  /**
   * Apply FPS-related optimizations
   * @param {Object} issue - FPS performance issue
   */
  applyFPSOptimizations(issue) {
    // Reduce audio quality
    if (this.audioManager) {
      this.audioManager.adjustVolume('effects', 0.7);
      this.audioManager.adjustVolume('ambient', 0.5);
    }

    // Enable performance mode in voice debouncer
    if (this.voiceDebouncer) {
      this.voiceDebouncer.enablePerformanceMode();
    }

    // Adjust game engine performance
    if (this.gameEngine && this.gameEngine.gameLoop) {
      this.gameEngine.gameLoop.setTargetFPS(30);
    }

    console.log('Applied FPS optimizations');
  }

  /**
   * Apply memory-related optimizations
   * @param {Object} issue - Memory performance issue
   */
  applyMemoryOptimizations(issue) {
    // Clear audio preloader cache
    if (this.audioPreloader) {
      this.audioPreloader.cleanupNonEssentialAssets();
    }

    // Clear performance history
    this.performanceMonitor.reset();

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    console.log('Applied memory optimizations');
  }

  /**
   * Apply audio-related optimizations
   * @param {Object} issue - Audio performance issue
   */
  applyAudioOptimizations(issue) {
    if (!this.audioManager) return;

    // Reduce audio buffer size for lower latency
    if (this.audioManager.optimizeForLatency) {
      this.audioManager.optimizeForLatency();
    }

    // Reduce audio effects volume
    this.audioManager.adjustVolume('effects', 0.5);

    console.log('Applied audio optimizations');
  }

  /**
   * Apply voice-related optimizations
   * @param {Object} issue - Voice performance issue
   */
  applyVoiceOptimizations(issue) {
    if (!this.voiceDebouncer) return;

    // Increase debounce delay
    this.voiceDebouncer.setCommandDebounceDelay(500);

    // Enable adaptive debouncing
    if (!this.voiceDebouncer.adaptiveState.adaptiveMode) {
      this.voiceDebouncer.enableAdaptiveMode();
    }

    console.log('Applied voice optimizations');
  }

  /**
   * Apply voice performance optimizations
   * @param {Object} issue - Voice performance issue
   */
  applyVoicePerformanceOptimizations(issue) {
    // Already handled by the voice debouncer itself
    console.log('Voice performance optimizations applied by debouncer');
  }

  /**
   * Handle browser compatibility issues
   * @param {Object} issue - Compatibility issue details
   */
  handleCompatibilityIssue(issue) {
    console.log('Handling compatibility issue:', issue);

    // Show compatibility warnings if enabled
    if (this.browserCompatibility.options.showWarnings) {
      this.browserCompatibility.showCompatibilityWarning(issue);
    }

    // Apply fallbacks if enabled
    if (this.browserCompatibility.options.enableFallbacks) {
      this.applyCompatibilityFallback(issue);
    }

    // Notify callbacks
    this.notifyCompatibilityCallbacks(issue);
  }

  /**
   * Apply compatibility fallback for specific issues
   * @param {Object} issue - Compatibility issue
   */
  applyCompatibilityFallback(issue) {
    switch (issue.type) {
      case 'audio_load_error':
        // Disable audio preloading for problematic assets
        if (this.audioPreloader) {
          this.audioPreloader.failedAssets.set(issue.asset, {
            attempts: 999, // Prevent retries
            lastError: issue.error
          });
        }
        break;
      case 'voice_recognition_error':
        // Fall back to text input
        this.enableTextInputFallback();
        break;
      case 'audio_context_error':
        // Fall back to HTML5 audio
        this.enableHTML5AudioFallback();
        break;
    }
  }

  /**
   * Enable text input fallback for voice commands
   */
  enableTextInputFallback() {
    // This would be implemented by the UI components
    console.log('Text input fallback should be enabled');
    
    // Notify the voice controller to show text input
    if (this.voiceController && this.voiceController.enableTextFallback) {
      this.voiceController.enableTextFallback();
    }
  }

  /**
   * Enable HTML5 audio fallback
   */
  enableHTML5AudioFallback() {
    if (this.audioManager && this.audioManager.enableHTML5Fallback) {
      this.audioManager.enableHTML5Fallback();
    }
  }

  /**
   * Process voice command with debouncing and performance optimization
   * @param {Object} command - Voice command object
   * @param {Object} context - Command context
   * @returns {Promise<boolean>} Whether command was processed
   */
  async processVoiceCommand(command, context = {}) {
    if (!this.voiceDebouncer) {
      return false;
    }

    return this.voiceDebouncer.processCommand(command, context);
  }

  /**
   * Preload audio assets based on game state
   * @param {Object} gameState - Current game state
   * @returns {Promise<void>}
   */
  async preloadAudioAssets(gameState) {
    if (!this.audioPreloader) {
      return;
    }

    // Use performance optimizer to predict assets
    if (this.performanceOptimizer) {
      await this.performanceOptimizer.lazyLoadAudioAssets(gameState);
    }
  }

  /**
   * Get comprehensive performance status
   * @returns {Object} Performance status
   */
  getPerformanceStatus() {
    return {
      isInitialized: this.isInitialized,
      compatibility: this.compatibilityResults,
      monitor: this.performanceMonitor.getPerformanceSummary(),
      audioPreloader: this.audioPreloader?.getStatus() || null,
      voiceDebouncer: this.voiceDebouncer?.getStatus() || null,
      optimizer: this.performanceOptimizer?.getOptimizationStatus() || null
    };
  }

  /**
   * Register callback for performance updates
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onPerformanceUpdate(callback) {
    this.performanceCallbacks.add(callback);
    return () => this.performanceCallbacks.delete(callback);
  }

  /**
   * Register callback for compatibility issues
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onCompatibilityIssue(callback) {
    this.compatibilityCallbacks.add(callback);
    return () => this.compatibilityCallbacks.delete(callback);
  }

  /**
   * Notify performance callbacks
   * @param {Object} issue - Performance issue
   */
  notifyPerformanceCallbacks(issue) {
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(issue);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  /**
   * Notify compatibility callbacks
   * @param {Object} issue - Compatibility issue
   */
  notifyCompatibilityCallbacks(issue) {
    this.compatibilityCallbacks.forEach(callback => {
      try {
        callback(issue);
      } catch (error) {
        console.error('Error in compatibility callback:', error);
      }
    });
  }

  /**
   * Destroy all performance systems
   */
  destroy() {
    if (this.audioPreloader) {
      this.audioPreloader.destroy();
    }

    if (this.voiceDebouncer) {
      this.voiceDebouncer.destroy();
    }

    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy();
    }

    this.performanceMonitor.destroy();

    this.performanceCallbacks.clear();
    this.compatibilityCallbacks.clear();

    this.isInitialized = false;
    console.log('Performance integration destroyed');
  }
}

// Export singleton instance
export const performanceIntegration = new PerformanceIntegration();

export default PerformanceIntegration;