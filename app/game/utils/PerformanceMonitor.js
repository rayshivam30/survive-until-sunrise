/**
 * PerformanceMonitor - Comprehensive performance monitoring and optimization system
 * Tracks audio processing, voice recognition, and overall game performance
 * Requirements: 9.1, 9.2, 9.3, 9.6
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableMetrics: options.enableMetrics ?? true,
      enableOptimizations: options.enableOptimizations ?? true,
      metricsInterval: options.metricsInterval || 5000, // 5 seconds
      performanceThresholds: {
        fps: options.performanceThresholds?.fps || 30,
        frameTime: options.performanceThresholds?.frameTime || 33, // ms
        audioLatency: options.performanceThresholds?.audioLatency || 100, // ms
        voiceLatency: options.performanceThresholds?.voiceLatency || 500, // ms
        memoryUsage: options.performanceThresholds?.memoryUsage || 100 * 1024 * 1024, // 100MB
        ...options.performanceThresholds
      },
      ...options
    };

    // Performance metrics
    this.metrics = {
      // Frame performance
      fps: 0,
      averageFPS: 0,
      frameTime: 0,
      averageFrameTime: 0,
      droppedFrames: 0,
      
      // Audio performance
      audioLatency: 0,
      audioDropouts: 0,
      audioLoadTime: 0,
      audioMemoryUsage: 0,
      
      // Voice performance
      voiceLatency: 0,
      voiceErrors: 0,
      voiceRecognitionTime: 0,
      voiceCommandsProcessed: 0,
      
      // Memory performance
      memoryUsage: 0,
      memoryPeak: 0,
      garbageCollections: 0,
      
      // Network performance
      networkLatency: 0,
      assetsLoaded: 0,
      assetLoadErrors: 0,
      
      // Game-specific metrics
      gameStateUpdates: 0,
      eventProcessingTime: 0,
      renderTime: 0
    };

    // Performance history for trending
    this.metricsHistory = [];
    this.maxHistoryLength = 60; // Keep 5 minutes of data at 5-second intervals

    // Performance issues tracking
    this.performanceIssues = [];
    this.optimizationsApplied = [];

    // Monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.startTime = performance.now();

    // Event listeners and callbacks
    this.performanceCallbacks = new Set();
    this.issueCallbacks = new Set();

    // Browser-specific performance APIs
    this.supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined';
    this.supportsMemoryAPI = !!(performance.memory || performance.webkitMemory);
    this.supportsNavigationTiming = !!performance.navigation;

    // Initialize performance observers
    this.initializePerformanceObservers();

    // Bind methods
    this.startMonitoring = this.startMonitoring.bind(this);
    this.stopMonitoring = this.stopMonitoring.bind(this);
    this.recordMetric = this.recordMetric.bind(this);
    this.checkPerformance = this.checkPerformance.bind(this);
  }

  /**
   * Initialize performance observers for advanced metrics
   */
  initializePerformanceObservers() {
    if (!this.supportsPerformanceObserver) {
      console.warn('PerformanceObserver not supported, using fallback metrics');
      return;
    }

    try {
      // Observe long tasks (blocking main thread)
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      // Observe resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceLoad(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationTiming(entry);
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    console.log('Starting performance monitoring...');
    this.isMonitoring = true;
    this.startTime = performance.now();

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkPerformance();
    }, this.options.metricsInterval);

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping performance monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect current performance metrics
   */
  collectMetrics() {
    const now = performance.now();

    // Collect memory metrics
    this.collectMemoryMetrics();

    // Collect timing metrics
    this.collectTimingMetrics();

    // Store metrics in history
    const snapshot = {
      timestamp: now,
      metrics: { ...this.metrics }
    };

    this.metricsHistory.push(snapshot);

    // Trim history to max length
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }

    // Notify callbacks
    this.notifyPerformanceCallbacks(snapshot);
  }

  /**
   * Collect memory-related metrics
   */
  collectMemoryMetrics() {
    if (this.supportsMemoryAPI) {
      const memory = performance.memory || performance.webkitMemory;
      
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      this.metrics.memoryPeak = Math.max(this.metrics.memoryPeak, memory.usedJSHeapSize);
      
      // Estimate garbage collections (when used memory drops significantly)
      const lastSnapshot = this.metricsHistory[this.metricsHistory.length - 1];
      if (lastSnapshot && lastSnapshot.metrics.memoryUsage > this.metrics.memoryUsage + 1024 * 1024) {
        this.metrics.garbageCollections++;
      }
    }
  }

  /**
   * Collect timing-related metrics
   */
  collectTimingMetrics() {
    // Get navigation timing if available
    if (this.supportsNavigationTiming && performance.timing) {
      const timing = performance.timing;
      this.metrics.networkLatency = timing.responseEnd - timing.requestStart;
    }

    // Calculate uptime
    const uptime = performance.now() - this.startTime;
    this.metrics.uptime = uptime;
  }

  /**
   * Record a performance metric
   * @param {string} category - Metric category (audio, voice, frame, etc.)
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordMetric(category, metric, value, metadata = {}) {
    if (!this.options.enableMetrics) {
      return;
    }

    const metricKey = `${category}_${metric}`;
    const timestamp = performance.now();

    // Update current metrics
    this.metrics[metricKey] = value;

    // Record specific category metrics
    switch (category) {
      case 'audio':
        this.recordAudioMetric(metric, value, metadata);
        break;
      case 'voice':
        this.recordVoiceMetric(metric, value, metadata);
        break;
      case 'frame':
        this.recordFrameMetric(metric, value, metadata);
        break;
      case 'game':
        this.recordGameMetric(metric, value, metadata);
        break;
    }

    // Check for performance issues
    this.checkMetricThreshold(category, metric, value);
  }

  /**
   * Record audio-specific metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordAudioMetric(metric, value, metadata) {
    switch (metric) {
      case 'latency':
        this.metrics.audioLatency = value;
        break;
      case 'dropout':
        this.metrics.audioDropouts++;
        break;
      case 'loadTime':
        this.metrics.audioLoadTime = value;
        break;
      case 'memoryUsage':
        this.metrics.audioMemoryUsage = value;
        break;
    }
  }

  /**
   * Record voice-specific metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordVoiceMetric(metric, value, metadata) {
    switch (metric) {
      case 'latency':
        this.metrics.voiceLatency = value;
        break;
      case 'error':
        this.metrics.voiceErrors++;
        break;
      case 'recognitionTime':
        this.metrics.voiceRecognitionTime = value;
        break;
      case 'commandProcessed':
        this.metrics.voiceCommandsProcessed++;
        break;
    }
  }

  /**
   * Record frame-specific metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordFrameMetric(metric, value, metadata) {
    switch (metric) {
      case 'fps':
        this.metrics.fps = value;
        break;
      case 'frameTime':
        this.metrics.frameTime = value;
        this.updateAverageFrameTime(value);
        break;
      case 'droppedFrame':
        this.metrics.droppedFrames++;
        break;
      case 'renderTime':
        this.metrics.renderTime = value;
        break;
    }
  }

  /**
   * Record game-specific metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordGameMetric(metric, value, metadata) {
    switch (metric) {
      case 'stateUpdate':
        this.metrics.gameStateUpdates++;
        break;
      case 'eventProcessingTime':
        this.metrics.eventProcessingTime = value;
        break;
    }
  }

  /**
   * Update average frame time
   * @param {number} frameTime - Current frame time
   */
  updateAverageFrameTime(frameTime) {
    // Simple moving average
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageFrameTime = this.metrics.averageFrameTime * (1 - alpha) + frameTime * alpha;
  }

  /**
   * Record long task performance entry
   * @param {PerformanceEntry} entry - Performance entry
   */
  recordLongTask(entry) {
    console.warn('Long task detected:', {
      duration: entry.duration,
      startTime: entry.startTime,
      name: entry.name
    });

    this.recordPerformanceIssue('longtask', {
      duration: entry.duration,
      startTime: entry.startTime,
      severity: entry.duration > 100 ? 'high' : 'medium'
    });
  }

  /**
   * Record resource load performance entry
   * @param {PerformanceEntry} entry - Performance entry
   */
  recordResourceLoad(entry) {
    this.metrics.assetsLoaded++;

    if (entry.name.includes('.mp3') || entry.name.includes('.ogg') || entry.name.includes('.wav')) {
      // Audio resource
      const loadTime = entry.responseEnd - entry.startTime;
      this.recordMetric('audio', 'loadTime', loadTime, { resource: entry.name });
    }

    // Check for load errors
    if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
      this.metrics.assetLoadErrors++;
      this.recordPerformanceIssue('resource_load_error', {
        resource: entry.name,
        severity: 'medium'
      });
    }
  }

  /**
   * Record navigation timing performance entry
   * @param {PerformanceEntry} entry - Performance entry
   */
  recordNavigationTiming(entry) {
    this.metrics.networkLatency = entry.responseEnd - entry.requestStart;
  }

  /**
   * Check if a metric exceeds its threshold
   * @param {string} category - Metric category
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   */
  checkMetricThreshold(category, metric, value) {
    const thresholdKey = `${category}${metric.charAt(0).toUpperCase() + metric.slice(1)}`;
    const threshold = this.options.performanceThresholds[thresholdKey];

    if (threshold && value > threshold) {
      this.recordPerformanceIssue(`${category}_${metric}_threshold`, {
        category,
        metric,
        value,
        threshold,
        severity: value > threshold * 1.5 ? 'high' : 'medium'
      });
    }
  }

  /**
   * Record a performance issue
   * @param {string} type - Issue type
   * @param {Object} details - Issue details
   */
  recordPerformanceIssue(type, details) {
    const issue = {
      type,
      timestamp: performance.now(),
      details,
      ...details
    };

    this.performanceIssues.push(issue);

    // Trim issues list to prevent memory growth
    if (this.performanceIssues.length > 100) {
      this.performanceIssues.shift();
    }

    // Notify issue callbacks
    this.notifyIssueCallbacks(issue);

    // Apply automatic optimizations if enabled
    if (this.options.enableOptimizations) {
      this.applyOptimization(issue);
    }
  }

  /**
   * Check overall performance and identify issues
   */
  checkPerformance() {
    const thresholds = this.options.performanceThresholds;

    // Check FPS
    if (this.metrics.fps < thresholds.fps) {
      this.recordPerformanceIssue('low_fps', {
        fps: this.metrics.fps,
        threshold: thresholds.fps,
        severity: this.metrics.fps < thresholds.fps * 0.5 ? 'high' : 'medium'
      });
    }

    // Check frame time
    if (this.metrics.averageFrameTime > thresholds.frameTime) {
      this.recordPerformanceIssue('high_frame_time', {
        frameTime: this.metrics.averageFrameTime,
        threshold: thresholds.frameTime,
        severity: this.metrics.averageFrameTime > thresholds.frameTime * 2 ? 'high' : 'medium'
      });
    }

    // Check memory usage
    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      this.recordPerformanceIssue('high_memory_usage', {
        memoryUsage: this.metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
        severity: this.metrics.memoryUsage > thresholds.memoryUsage * 1.5 ? 'high' : 'medium'
      });
    }

    // Check audio latency
    if (this.metrics.audioLatency > thresholds.audioLatency) {
      this.recordPerformanceIssue('high_audio_latency', {
        audioLatency: this.metrics.audioLatency,
        threshold: thresholds.audioLatency,
        severity: 'medium'
      });
    }

    // Check voice latency
    if (this.metrics.voiceLatency > thresholds.voiceLatency) {
      this.recordPerformanceIssue('high_voice_latency', {
        voiceLatency: this.metrics.voiceLatency,
        threshold: thresholds.voiceLatency,
        severity: 'medium'
      });
    }
  }

  /**
   * Apply automatic optimization based on performance issue
   * @param {Object} issue - Performance issue
   */
  applyOptimization(issue) {
    const optimization = this.getOptimizationForIssue(issue);
    
    if (optimization && !this.optimizationsApplied.includes(optimization.id)) {
      console.log(`Applying optimization: ${optimization.name}`);
      
      try {
        optimization.apply();
        this.optimizationsApplied.push(optimization.id);
        
        console.log(`Optimization applied successfully: ${optimization.name}`);
      } catch (error) {
        console.error(`Failed to apply optimization ${optimization.name}:`, error);
      }
    }
  }

  /**
   * Get optimization strategy for a performance issue
   * @param {Object} issue - Performance issue
   * @returns {Object|null} Optimization strategy
   */
  getOptimizationForIssue(issue) {
    const optimizations = {
      low_fps: {
        id: 'reduce_quality',
        name: 'Reduce Quality Settings',
        apply: () => {
          // Skip in non-browser environments
          if (typeof window === 'undefined') {
            return;
          }

          // Reduce audio quality
          if (window.gameAudioManager) {
            window.gameAudioManager.adjustVolume('effects', 0.7);
            window.gameAudioManager.adjustVolume('ambient', 0.5);
          }
          
          // Reduce update frequency for non-critical systems
          if (window.gameEngine) {
            const fearSystem = window.gameEngine.getFearSystem();
            const healthSystem = window.gameEngine.getHealthSystem();
            
            if (fearSystem && fearSystem.setUpdateFrequency) {
              fearSystem.setUpdateFrequency(0.7);
            }
            if (healthSystem && healthSystem.setUpdateFrequency) {
              healthSystem.setUpdateFrequency(0.7);
            }
          }
        }
      },
      
      high_frame_time: {
        id: 'reduce_effects',
        name: 'Reduce Visual Effects',
        apply: () => {
          // Skip in non-browser environments
          if (typeof document === 'undefined') {
            return;
          }

          // Disable non-essential visual effects
          document.body.classList.add('performance-mode');
          
          // Reduce animation frequency
          const style = document.createElement('style');
          style.textContent = `
            .performance-mode * {
              animation-duration: 0.1s !important;
              transition-duration: 0.1s !important;
            }
          `;
          document.head.appendChild(style);
        }
      },
      
      high_memory_usage: {
        id: 'cleanup_memory',
        name: 'Memory Cleanup',
        apply: () => {
          // Skip in non-browser environments
          if (typeof window === 'undefined') {
            return;
          }

          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
          
          // Clear audio buffers
          if (window.gameAudioManager && window.gameAudioManager.clearUnusedBuffers) {
            window.gameAudioManager.clearUnusedBuffers();
          }
          
          // Clear old performance history
          this.metricsHistory = this.metricsHistory.slice(-30);
          this.performanceIssues = this.performanceIssues.slice(-50);
        }
      },
      
      high_audio_latency: {
        id: 'optimize_audio',
        name: 'Optimize Audio Settings',
        apply: () => {
          if (window.gameAudioManager) {
            // Reduce audio buffer size if possible
            window.gameAudioManager.optimizeForLatency();
            
            // Disable audio effects that cause latency
            window.gameAudioManager.adjustVolume('effects', 0.5);
          }
        }
      }
    };

    return optimizations[issue.type] || null;
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
   * Register callback for performance issues
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onPerformanceIssue(callback) {
    this.issueCallbacks.add(callback);
    return () => this.issueCallbacks.delete(callback);
  }

  /**
   * Notify performance callbacks
   * @param {Object} snapshot - Performance snapshot
   */
  notifyPerformanceCallbacks(snapshot) {
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  /**
   * Notify issue callbacks
   * @param {Object} issue - Performance issue
   */
  notifyIssueCallbacks(issue) {
    this.issueCallbacks.forEach(callback => {
      try {
        callback(issue);
      } catch (error) {
        console.error('Error in issue callback:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics history
   * @returns {Array} Metrics history
   */
  getMetricsHistory() {
    return [...this.metricsHistory];
  }

  /**
   * Get performance issues
   * @returns {Array} Performance issues
   */
  getPerformanceIssues() {
    return [...this.performanceIssues];
  }

  /**
   * Get applied optimizations
   * @returns {Array} Applied optimizations
   */
  getAppliedOptimizations() {
    return [...this.optimizationsApplied];
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const recentIssues = this.performanceIssues.filter(
      issue => performance.now() - issue.timestamp < 60000 // Last minute
    );

    return {
      overall: this.calculateOverallPerformance(),
      metrics: this.getMetrics(),
      recentIssues: recentIssues.length,
      criticalIssues: recentIssues.filter(issue => issue.severity === 'high').length,
      optimizationsApplied: this.optimizationsApplied.length,
      uptime: this.metrics.uptime,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Calculate overall performance score
   * @returns {string} Performance rating
   */
  calculateOverallPerformance() {
    const thresholds = this.options.performanceThresholds;
    let score = 100;

    // Deduct points for performance issues
    if (this.metrics.fps < thresholds.fps) {
      score -= (thresholds.fps - this.metrics.fps) / thresholds.fps * 30;
    }

    if (this.metrics.averageFrameTime > thresholds.frameTime) {
      score -= (this.metrics.averageFrameTime - thresholds.frameTime) / thresholds.frameTime * 20;
    }

    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      score -= (this.metrics.memoryUsage - thresholds.memoryUsage) / thresholds.memoryUsage * 20;
    }

    if (this.metrics.audioLatency > thresholds.audioLatency) {
      score -= 10;
    }

    if (this.metrics.voiceLatency > thresholds.voiceLatency) {
      score -= 10;
    }

    // Deduct points for recent issues
    const recentIssues = this.performanceIssues.filter(
      issue => performance.now() - issue.timestamp < 30000 // Last 30 seconds
    );
    score -= recentIssues.length * 5;

    score = Math.max(0, Math.min(100, score));

    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Reset all metrics and history
   */
  reset() {
    this.metrics = {
      fps: 0,
      averageFPS: 0,
      frameTime: 0,
      averageFrameTime: 0,
      droppedFrames: 0,
      audioLatency: 0,
      audioDropouts: 0,
      audioLoadTime: 0,
      audioMemoryUsage: 0,
      voiceLatency: 0,
      voiceErrors: 0,
      voiceRecognitionTime: 0,
      voiceCommandsProcessed: 0,
      memoryUsage: 0,
      memoryPeak: 0,
      garbageCollections: 0,
      networkLatency: 0,
      assetsLoaded: 0,
      assetLoadErrors: 0,
      gameStateUpdates: 0,
      eventProcessingTime: 0,
      renderTime: 0
    };

    this.metricsHistory = [];
    this.performanceIssues = [];
    this.optimizationsApplied = [];
    this.startTime = performance.now();

    console.log('Performance monitor reset');
  }

  /**
   * Destroy the performance monitor
   */
  destroy() {
    this.stopMonitoring();
    this.performanceCallbacks.clear();
    this.issueCallbacks.clear();
    this.reset();
    
    console.log('Performance monitor destroyed');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;