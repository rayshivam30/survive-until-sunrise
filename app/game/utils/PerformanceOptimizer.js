/**
 * PerformanceOptimizer - Handles performance monitoring and optimization
 * Implements audio preloading, lazy loading, and performance adjustments
 */

export class PerformanceOptimizer {
  constructor(audioManager = null, gameEngine = null) {
    this.audioManager = audioManager;
    this.gameEngine = gameEngine;
    
    // Performance monitoring
    this.performanceMetrics = {
      fps: 60,
      frameTime: 16.67,
      audioLatency: 0,
      voiceLatency: 0,
      memoryUsage: 0,
      lastUpdate: performance.now()
    };
    
    // Optimization settings
    this.optimizationLevel = 'normal'; // 'minimal', 'normal', 'high'
    this.adaptiveOptimization = true;
    
    // Preloading management
    this.preloadQueue = new Set();
    this.preloadedAssets = new Set();
    this.lazyLoadThreshold = 2000; // 2 seconds ahead
    
    // Command debouncing
    this.commandDebounce = {
      lastCommand: null,
      lastCommandTime: 0,
      debounceDelay: 300 // 300ms
    };
    
    // Performance thresholds
    this.thresholds = {
      fps: {
        critical: 20,
        warning: 30,
        good: 45
      },
      frameTime: {
        critical: 50,
        warning: 33,
        good: 20
      },
      memory: {
        critical: 100 * 1024 * 1024, // 100MB
        warning: 50 * 1024 * 1024,   // 50MB
        good: 25 * 1024 * 1024       // 25MB
      }
    };
    
    // Optimization strategies
    this.strategies = new Map();
    this.setupOptimizationStrategies();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Setup optimization strategies for different performance levels
   */
  setupOptimizationStrategies() {
    this.strategies.set('minimal', {
      audioQuality: 0.3,
      effectsVolume: 0.2,
      ambientVolume: 0.2,
      eventFrequency: 0.5,
      updateFrequency: 0.5,
      preloadLimit: 3,
      enableFrameSkipping: true
    });
    
    this.strategies.set('normal', {
      audioQuality: 0.7,
      effectsVolume: 0.7,
      ambientVolume: 0.8,
      eventFrequency: 1.0,
      updateFrequency: 1.0,
      preloadLimit: 8,
      enableFrameSkipping: false
    });
    
    this.strategies.set('high', {
      audioQuality: 1.0,
      effectsVolume: 1.0,
      ambientVolume: 1.0,
      eventFrequency: 1.2,
      updateFrequency: 1.0,
      preloadLimit: 15,
      enableFrameSkipping: false
    });
  }

  /**
   * Start performance monitoring loop
   */
  startPerformanceMonitoring() {
    const monitor = () => {
      this.updatePerformanceMetrics();
      
      if (this.adaptiveOptimization) {
        this.evaluateAndOptimize();
      }
      
      // Schedule next monitoring cycle
      setTimeout(monitor, 1000); // Check every second
    };
    
    monitor();
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const now = performance.now();
    const deltaTime = now - this.performanceMetrics.lastUpdate;
    
    // Calculate FPS
    this.performanceMetrics.fps = 1000 / deltaTime;
    this.performanceMetrics.frameTime = deltaTime;
    this.performanceMetrics.lastUpdate = now;
    
    // Memory usage (if available)
    if (performance.memory) {
      this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
    
    // Audio latency (if audio manager available)
    if (this.audioManager && this.audioManager.getLatency) {
      this.performanceMetrics.audioLatency = this.audioManager.getLatency();
    }
  }

  /**
   * Evaluate performance and apply optimizations if needed
   */
  evaluateAndOptimize() {
    const metrics = this.performanceMetrics;
    let newOptimizationLevel = this.optimizationLevel;
    
    // Determine optimization level based on performance
    if (metrics.fps < this.thresholds.fps.critical || 
        metrics.frameTime > this.thresholds.frameTime.critical ||
        metrics.memoryUsage > this.thresholds.memory.critical) {
      newOptimizationLevel = 'minimal';
    } else if (metrics.fps < this.thresholds.fps.warning || 
               metrics.frameTime > this.thresholds.frameTime.warning ||
               metrics.memoryUsage > this.thresholds.memory.warning) {
      newOptimizationLevel = 'normal';
    } else if (metrics.fps > this.thresholds.fps.good && 
               metrics.frameTime < this.thresholds.frameTime.good &&
               metrics.memoryUsage < this.thresholds.memory.good) {
      newOptimizationLevel = 'high';
    }
    
    // Apply optimization if level changed
    if (newOptimizationLevel !== this.optimizationLevel) {
      this.applyOptimizationLevel(newOptimizationLevel);
    }
  }

  /**
   * Apply specific optimization level
   * @param {string} level - Optimization level ('minimal', 'normal', 'high')
   */
  applyOptimizationLevel(level) {
    const strategy = this.strategies.get(level);
    if (!strategy) return;
    
    console.log(`Applying optimization level: ${level}`);
    
    // Apply audio optimizations
    if (this.audioManager) {
      this.audioManager.adjustVolume('effects', strategy.effectsVolume);
      this.audioManager.adjustVolume('ambient', strategy.ambientVolume);
      
      if (this.audioManager.setQuality) {
        this.audioManager.setQuality(strategy.audioQuality);
      }
    }
    
    // Apply game engine optimizations
    if (this.gameEngine) {
      const eventSystem = this.gameEngine.getEventSystem();
      if (eventSystem && eventSystem.setEventFrequency) {
        eventSystem.setEventFrequency(strategy.eventFrequency);
      }
      
      const fearSystem = this.gameEngine.getFearSystem();
      if (fearSystem && fearSystem.setUpdateFrequency) {
        fearSystem.setUpdateFrequency(strategy.updateFrequency);
      }
      
      const healthSystem = this.gameEngine.getHealthSystem();
      if (healthSystem && healthSystem.setUpdateFrequency) {
        healthSystem.setUpdateFrequency(strategy.updateFrequency);
      }
      
      // Apply game loop optimizations
      if (this.gameEngine.gameLoop) {
        if (strategy.enableFrameSkipping) {
          this.gameEngine.gameLoop.setFrameSkipping(true);
        }
        
        // Adjust target FPS for minimal mode
        if (level === 'minimal') {
          this.gameEngine.gameLoop.setTargetFPS(30);
        } else {
          this.gameEngine.gameLoop.setTargetFPS(60);
        }
      }
    }
    
    this.optimizationLevel = level;
  }

  /**
   * Preload audio assets based on game state and upcoming events
   * @param {Array} soundKeys - Array of sound keys to preload
   * @returns {Promise<void>}
   */
  async preloadAudioAssets(soundKeys = []) {
    if (!this.audioManager) return;
    
    const strategy = this.strategies.get(this.optimizationLevel);
    const preloadLimit = strategy.preloadLimit;
    
    // Filter out already preloaded assets
    const toPreload = soundKeys
      .filter(key => !this.preloadedAssets.has(key))
      .slice(0, preloadLimit);
    
    if (toPreload.length === 0) return;
    
    console.log(`Preloading ${toPreload.length} audio assets:`, toPreload);
    
    try {
      await this.audioManager.preloadSounds(toPreload);
      
      // Mark as preloaded
      toPreload.forEach(key => this.preloadedAssets.add(key));
      
    } catch (error) {
      console.warn('Error preloading audio assets:', error);
    }
  }

  /**
   * Lazy load audio assets based on upcoming game events
   * @param {Object} gameState - Current game state
   */
  async lazyLoadAudioAssets(gameState) {
    if (!this.audioManager || !gameState) return;
    
    const upcomingAssets = this.predictUpcomingAssets(gameState);
    
    if (upcomingAssets.length > 0) {
      await this.preloadAudioAssets(upcomingAssets);
    }
  }

  /**
   * Predict which audio assets will be needed soon
   * @param {Object} gameState - Current game state
   * @returns {Array} - Array of predicted asset keys
   */
  predictUpcomingAssets(gameState) {
    const assets = [];
    
    // Predict based on fear level
    if (gameState.fearLevel > 70) {
      assets.push('jump_scare', 'heartbeat', 'breathing_heavy');
    } else if (gameState.fearLevel > 40) {
      assets.push('whisper', 'footsteps', 'door_creak');
    }
    
    // Predict based on time of night
    const currentHour = parseInt(gameState.currentTime?.split(':')[0] || '0');
    switch (currentHour) {
      case 0:
        assets.push('clock_chime', 'wind_howl');
        break;
      case 1:
      case 2:
        assets.push('whisper', 'footsteps');
        break;
      case 3:
        assets.push('supernatural', 'ghost_moan');
        break;
      case 4:
      case 5:
        assets.push('bird_distant', 'wind_calm');
        break;
    }
    
    // Predict based on health level
    if (gameState.health < 30) {
      assets.push('heartbeat', 'breathing_labored');
    }
    
    return [...new Set(assets)]; // Remove duplicates
  }

  /**
   * Debounce voice commands to prevent rapid-fire processing
   * @param {string} command - Voice command
   * @returns {boolean} - Whether command should be processed
   */
  debounceVoiceCommand(command) {
    const now = performance.now();
    const timeSinceLastCommand = now - this.commandDebounce.lastCommandTime;
    
    // Allow command if enough time has passed or it's different from last command
    if (timeSinceLastCommand >= this.commandDebounce.debounceDelay || 
        command !== this.commandDebounce.lastCommand) {
      
      this.commandDebounce.lastCommand = command;
      this.commandDebounce.lastCommandTime = now;
      return true;
    }
    
    return false;
  }

  /**
   * Get current performance metrics
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get optimization status
   * @returns {Object} - Optimization status
   */
  getOptimizationStatus() {
    return {
      level: this.optimizationLevel,
      adaptiveOptimization: this.adaptiveOptimization,
      preloadedAssets: this.preloadedAssets.size,
      metrics: this.getPerformanceMetrics(),
      thresholds: this.thresholds
    };
  }

  /**
   * Force specific optimization level
   * @param {string} level - Optimization level
   */
  setOptimizationLevel(level) {
    if (this.strategies.has(level)) {
      this.applyOptimizationLevel(level);
    }
  }

  /**
   * Enable or disable adaptive optimization
   * @param {boolean} enabled - Whether to enable adaptive optimization
   */
  setAdaptiveOptimization(enabled) {
    this.adaptiveOptimization = enabled;
  }

  /**
   * Set command debounce delay
   * @param {number} delay - Debounce delay in milliseconds
   */
  setCommandDebounceDelay(delay) {
    this.commandDebounce.debounceDelay = Math.max(100, delay);
  }

  /**
   * Clear preloaded assets to free memory
   */
  clearPreloadedAssets() {
    this.preloadedAssets.clear();
    console.log('Cleared preloaded assets cache');
  }

  /**
   * Get memory usage estimate
   * @returns {Object} - Memory usage information
   */
  getMemoryUsage() {
    const usage = {
      preloadedAssets: this.preloadedAssets.size,
      estimatedAudioMemory: this.preloadedAssets.size * 1024 * 1024, // Rough estimate
      jsHeapSize: 0,
      jsHeapSizeLimit: 0
    };
    
    if (performance.memory) {
      usage.jsHeapSize = performance.memory.usedJSHeapSize;
      usage.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
    }
    
    return usage;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearPreloadedAssets();
    this.preloadQueue.clear();
    console.log('PerformanceOptimizer destroyed');
  }
}

export default PerformanceOptimizer;