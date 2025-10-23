/**
 * Performance Optimizer - Advanced performance monitoring and optimization
 * 
 * Monitors game performance and automatically adjusts settings for optimal experience
 * Handles frame rate optimization, memory management, and resource allocation
 * 
 * Requirements: 9.5, 9.6
 */

export class PerformanceOptimizer {
  constructor(gameEngine, options = {}) {
    this.gameEngine = gameEngine;
    this.options = {
      targetFPS: options.targetFPS || 60,
      minFPS: options.minFPS || 30,
      maxMemoryUsage: options.maxMemoryUsage || 100, // MB
      monitoringInterval: options.monitoringInterval || 1000, // ms
      adaptiveOptimization: options.adaptiveOptimization !== false,
      ...options
    };

    // Performance metrics
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      audioLatency: 0,
      voiceLatency: 0,
      updateTime: 0,
      renderTime: 0
    };

    // Performance history for trend analysis
    this.performanceHistory = [];
    this.maxHistoryLength = 60; // Keep 1 minute of data

    // Optimization state
    this.currentOptimizationLevel = 0; // 0 = no optimization, 5 = maximum optimization
    this.optimizationLevels = this.initializeOptimizationLevels();

    // Monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.frameCounter = 0;
    this.lastFrameTime = performance.now();

    // Callbacks
    this.onPerformanceChange = options.onPerformanceChange || null;
    this.onOptimizationApplied = options.onOptimizationApplied || null;

    console.log('PerformanceOptimizer initialized', this.options);
  }

  /**
   * Initialize optimization levels with specific settings
   */
  initializeOptimizationLevels() {
    return {
      0: {
        name: 'Maximum Quality',
        audioQuality: 1.0,
        effectsFrequency: 1.0,
        updateFrequency: 1.0,
        visualEffects: true,
        audioMixing: true,
        voiceProcessing: true
      },
      1: {
        name: 'High Quality',
        audioQuality: 0.9,
        effectsFrequency: 0.9,
        updateFrequency: 1.0,
        visualEffects: true,
        audioMixing: true,
        voiceProcessing: true
      },
      2: {
        name: 'Balanced',
        audioQuality: 0.8,
        effectsFrequency: 0.8,
        updateFrequency: 0.9,
        visualEffects: true,
        audioMixing: true,
        voiceProcessing: true
      },
      3: {
        name: 'Performance',
        audioQuality: 0.7,
        effectsFrequency: 0.6,
        updateFrequency: 0.8,
        visualEffects: false,
        audioMixing: true,
        voiceProcessing: true
      },
      4: {
        name: 'Low Performance',
        audioQuality: 0.5,
        effectsFrequency: 0.4,
        updateFrequency: 0.7,
        visualEffects: false,
        audioMixing: false,
        voiceProcessing: true
      },
      5: {
        name: 'Minimum',
        audioQuality: 0.3,
        effectsFrequency: 0.2,
        updateFrequency: 0.5,
        visualEffects: false,
        audioMixing: false,
        voiceProcessing: false
      }
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.frameCounter = 0;

    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.analyzePerformance();
      
      if (this.options.adaptiveOptimization) {
        this.applyAdaptiveOptimization();
      }
    }, this.options.monitoringInterval);

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    // Calculate FPS
    this.frameCounter++;
    if (deltaTime >= 1000) { // Update every second
      this.metrics.fps = Math.round((this.frameCounter * 1000) / deltaTime);
      this.metrics.frameTime = deltaTime / this.frameCounter;
      this.frameCounter = 0;
      this.lastFrameTime = now;
    }

    // Memory usage (if available)
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }

    // Game-specific metrics
    if (this.gameEngine) {
      const gameStats = this.gameEngine.getPerformanceStats();
      if (gameStats) {
        this.metrics.updateTime = gameStats.gameLoop?.averageUpdateTime || 0;
        this.metrics.audioLatency = gameStats.systems?.audioLatency || 0;
        this.metrics.voiceLatency = gameStats.systems?.voiceLatency || 0;
      }
    }

    // Add to history
    this.performanceHistory.push({
      timestamp: now,
      ...this.metrics
    });

    // Trim history
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Analyze performance trends and issues
   */
  analyzePerformance() {
    const issues = [];
    const recommendations = [];

    // FPS analysis
    if (this.metrics.fps < this.options.minFPS) {
      issues.push({
        type: 'low_fps',
        severity: 'high',
        value: this.metrics.fps,
        threshold: this.options.minFPS
      });
      recommendations.push('Reduce visual effects and audio quality');
    } else if (this.metrics.fps < this.options.targetFPS * 0.8) {
      issues.push({
        type: 'suboptimal_fps',
        severity: 'medium',
        value: this.metrics.fps,
        threshold: this.options.targetFPS
      });
      recommendations.push('Consider reducing some effects');
    }

    // Memory analysis
    if (this.metrics.memoryUsage > this.options.maxMemoryUsage) {
      issues.push({
        type: 'high_memory',
        severity: 'high',
        value: this.metrics.memoryUsage,
        threshold: this.options.maxMemoryUsage
      });
      recommendations.push('Reduce audio caching and effect frequency');
    }

    // Frame time consistency
    if (this.performanceHistory.length >= 10) {
      const recentFrameTimes = this.performanceHistory.slice(-10).map(h => h.frameTime);
      const variance = this.calculateVariance(recentFrameTimes);
      
      if (variance > 50) { // High frame time variance
        issues.push({
          type: 'frame_time_variance',
          severity: 'medium',
          value: variance,
          threshold: 50
        });
        recommendations.push('Optimize update frequency and reduce background processing');
      }
    }

    // Update performance state
    this.currentPerformanceIssues = issues;
    this.currentRecommendations = recommendations;

    // Notify callback
    if (this.onPerformanceChange && issues.length > 0) {
      this.onPerformanceChange({
        metrics: this.metrics,
        issues: issues,
        recommendations: recommendations
      });
    }
  }

  /**
   * Apply adaptive optimization based on performance analysis
   */
  applyAdaptiveOptimization() {
    if (!this.currentPerformanceIssues || this.currentPerformanceIssues.length === 0) {
      // Performance is good, consider reducing optimization level
      if (this.currentOptimizationLevel > 0 && this.metrics.fps > this.options.targetFPS * 0.9) {
        this.setOptimizationLevel(Math.max(0, this.currentOptimizationLevel - 1));
      }
      return;
    }

    // Determine required optimization level
    let requiredLevel = this.currentOptimizationLevel;
    
    for (const issue of this.currentPerformanceIssues) {
      switch (issue.type) {
        case 'low_fps':
          if (issue.severity === 'high') {
            requiredLevel = Math.max(requiredLevel, 4);
          } else {
            requiredLevel = Math.max(requiredLevel, 2);
          }
          break;
        case 'high_memory':
          requiredLevel = Math.max(requiredLevel, 3);
          break;
        case 'frame_time_variance':
          requiredLevel = Math.max(requiredLevel, 2);
          break;
      }
    }

    // Apply optimization if needed
    if (requiredLevel > this.currentOptimizationLevel) {
      this.setOptimizationLevel(requiredLevel);
    }
  }

  /**
   * Set optimization level and apply settings
   */
  setOptimizationLevel(level) {
    level = Math.max(0, Math.min(5, level));
    
    if (level === this.currentOptimizationLevel) return;

    const previousLevel = this.currentOptimizationLevel;
    this.currentOptimizationLevel = level;
    
    const settings = this.optimizationLevels[level];
    
    console.log(`Applying optimization level ${level}: ${settings.name}`);
    
    // Apply audio optimizations
    if (this.gameEngine.audioManager) {
      this.applyAudioOptimizations(settings);
    }

    // Apply game loop optimizations
    if (this.gameEngine.gameLoop) {
      this.applyGameLoopOptimizations(settings);
    }

    // Apply system optimizations
    this.applySystemOptimizations(settings);

    // Notify callback
    if (this.onOptimizationApplied) {
      this.onOptimizationApplied({
        previousLevel,
        currentLevel: level,
        settings,
        reason: this.currentPerformanceIssues
      });
    }
  }

  /**
   * Apply audio-specific optimizations
   */
  applyAudioOptimizations(settings) {
    const audioManager = this.gameEngine.audioManager;
    
    // Adjust audio quality
    audioManager.adjustVolume('effects', 
      audioManager.getVolume('effects') * settings.audioQuality);
    
    // Reduce effects frequency
    if (this.gameEngine.eventSystem) {
      this.gameEngine.eventSystem.setEventFrequency(settings.effectsFrequency);
    }

    // Disable audio mixing if needed
    if (!settings.audioMixing && audioManager.disableMixing) {
      audioManager.disableMixing();
    }
  }

  /**
   * Apply game loop optimizations
   */
  applyGameLoopOptimizations(settings) {
    const gameLoop = this.gameEngine.gameLoop;
    
    // Adjust update frequency
    if (gameLoop.setUpdateFrequency) {
      gameLoop.setUpdateFrequency(settings.updateFrequency);
    }

    // Adjust target FPS if performance is poor
    if (settings.updateFrequency < 0.8) {
      gameLoop.setTargetFPS(Math.max(30, this.options.targetFPS * settings.updateFrequency));
    }
  }

  /**
   * Apply system-wide optimizations
   */
  applySystemOptimizations(settings) {
    // Disable visual effects if needed
    if (!settings.visualEffects) {
      document.body.classList.add('reduced-effects');
    } else {
      document.body.classList.remove('reduced-effects');
    }

    // Reduce voice processing if needed
    if (!settings.voiceProcessing && this.gameEngine.voiceNarrator) {
      this.gameEngine.voiceNarrator.setProcessingLevel('minimal');
    }

    // Apply CSS optimizations
    this.applyCSSOptimizations(settings);
  }

  /**
   * Apply CSS-based performance optimizations
   */
  applyCSSOptimizations(settings) {
    const style = document.createElement('style');
    style.id = 'performance-optimizations';
    
    // Remove existing optimization styles
    const existing = document.getElementById('performance-optimizations');
    if (existing) {
      existing.remove();
    }

    let css = '';

    if (!settings.visualEffects) {
      css += `
        .game-hud * {
          animation: none !important;
          transition: none !important;
        }
        .status-bar-fill::after {
          display: none;
        }
      `;
    }

    if (settings.updateFrequency < 0.8) {
      css += `
        .game-hud {
          will-change: auto;
        }
      `;
    }

    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Calculate variance for array of numbers
   */
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Get current performance report
   */
  getPerformanceReport() {
    return {
      metrics: { ...this.metrics },
      optimizationLevel: this.currentOptimizationLevel,
      optimizationSettings: this.optimizationLevels[this.currentOptimizationLevel],
      issues: this.currentPerformanceIssues || [],
      recommendations: this.currentRecommendations || [],
      history: this.performanceHistory.slice(-10) // Last 10 entries
    };
  }

  /**
   * Force optimization level (manual override)
   */
  forceOptimizationLevel(level) {
    this.options.adaptiveOptimization = false;
    this.setOptimizationLevel(level);
  }

  /**
   * Reset to adaptive optimization
   */
  enableAdaptiveOptimization() {
    this.options.adaptiveOptimization = true;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fps < this.options.targetFPS * 0.8) {
      recommendations.push({
        type: 'fps',
        message: 'Consider reducing visual effects for better frame rate',
        action: () => this.setOptimizationLevel(Math.min(5, this.currentOptimizationLevel + 1))
      });
    }

    if (this.metrics.memoryUsage > this.options.maxMemoryUsage * 0.8) {
      recommendations.push({
        type: 'memory',
        message: 'High memory usage detected, consider reducing audio caching',
        action: () => this.gameEngine.audioManager?.clearCache?.()
      });
    }

    return recommendations;
  }

  /**
   * Cleanup and destroy optimizer
   */
  destroy() {
    this.stopMonitoring();
    
    // Remove CSS optimizations
    const existing = document.getElementById('performance-optimizations');
    if (existing) {
      existing.remove();
    }

    // Reset optimization level
    this.setOptimizationLevel(0);
    
    console.log('PerformanceOptimizer destroyed');
  }
}

export default PerformanceOptimizer;