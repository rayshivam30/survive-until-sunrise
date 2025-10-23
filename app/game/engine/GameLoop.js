/**
 * GameLoop - Advanced game loop with delta time updates and event processing
 * Provides high-performance game loop with frame rate management and system coordination
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

export class GameLoop {
  constructor(gameEngine, options = {}) {
    this.gameEngine = gameEngine;
    this.options = {
      targetFPS: options.targetFPS || 60,
      maxDeltaTime: options.maxDeltaTime || 100, // Maximum delta time in ms
      enableFrameSkipping: options.enableFrameSkipping ?? true,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? true,
      logPerformance: options.logPerformance ?? false,
      ...options
    };

    // Loop state
    this.isRunning = false;
    this.isPaused = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.accumulator = 0;
    this.frameCount = 0;
    this.startTime = 0;

    // Performance monitoring
    this.performanceStats = {
      fps: 0,
      averageFPS: 0,
      frameTime: 0,
      averageFrameTime: 0,
      updateTime: 0,
      renderTime: 0,
      totalFrames: 0,
      droppedFrames: 0,
      lastSecondFrames: 0,
      lastSecondTime: 0
    };

    // Frame timing
    this.frameTimeHistory = [];
    this.maxFrameHistory = 60; // Keep last 60 frames for averaging
    this.targetFrameTime = 1000 / this.options.targetFPS;

    // Event processing
    this.eventQueue = [];
    this.eventProcessors = new Map();
    this.maxEventsPerFrame = 10;

    // System update callbacks
    this.updateCallbacks = new Set();
    this.renderCallbacks = new Set();
    this.preUpdateCallbacks = new Set();
    this.postUpdateCallbacks = new Set();

    // Performance monitoring timer
    this.performanceTimer = null;

    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) {
      console.warn('GameLoop already running');
      return;
    }

    console.log('Starting game loop...');
    
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;
    this.performanceStats.totalFrames = 0;
    this.performanceStats.droppedFrames = 0;

    // Start performance monitoring
    if (this.options.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    // Start the loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
    
    console.log('Game loop started');
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping game loop...');
    
    this.isRunning = false;
    this.isPaused = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop performance monitoring
    this.stopPerformanceMonitoring();

    console.log('Game loop stopped');
  }

  /**
   * Pause the game loop
   */
  pause() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    console.log('Pausing game loop...');
    this.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  resume() {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    console.log('Resuming game loop...');
    this.isPaused = false;
    this.lastFrameTime = performance.now(); // Reset timing to prevent large delta
  }

  /**
   * Main game loop function
   * @param {number} currentTime - Current timestamp from requestAnimationFrame
   */
  gameLoop(currentTime) {
    if (!this.isRunning) {
      return;
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    // Skip frame if paused
    if (this.isPaused) {
      return;
    }

    // Calculate delta time
    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Clamp delta time to prevent spiral of death
    if (this.deltaTime > this.options.maxDeltaTime) {
      this.deltaTime = this.options.maxDeltaTime;
      this.performanceStats.droppedFrames++;
    }

    // Update performance stats
    this.updatePerformanceStats(currentTime);

    // Skip frame if delta time is too small (running too fast)
    if (this.deltaTime < 1) {
      return;
    }

    const frameStartTime = performance.now();

    try {
      // Pre-update callbacks
      this.executeCallbacks(this.preUpdateCallbacks, this.deltaTime);

      // Process events
      this.processEvents();

      // Update game systems
      const updateStartTime = performance.now();
      this.updateGame(this.deltaTime);
      this.performanceStats.updateTime = performance.now() - updateStartTime;

      // Render callbacks
      const renderStartTime = performance.now();
      this.executeCallbacks(this.renderCallbacks, this.deltaTime);
      this.performanceStats.renderTime = performance.now() - renderStartTime;

      // Post-update callbacks
      this.executeCallbacks(this.postUpdateCallbacks, this.deltaTime);

    } catch (error) {
      console.error('Game loop error:', error);
      
      // Try to recover by continuing the loop
      if (this.gameEngine && this.gameEngine.handleError) {
        this.gameEngine.handleError('game-loop', error);
      }
    }

    // Update frame timing
    const frameEndTime = performance.now();
    this.performanceStats.frameTime = frameEndTime - frameStartTime;
    this.updateFrameTimeHistory(this.performanceStats.frameTime);

    this.frameCount++;
    this.performanceStats.totalFrames++;
  }

  /**
   * Update the game engine and all systems
   * @param {number} deltaTime - Time elapsed since last frame
   */
  updateGame(deltaTime) {
    if (!this.gameEngine) {
      return;
    }

    // Update game engine
    this.gameEngine.update(deltaTime);

    // Execute update callbacks
    this.executeCallbacks(this.updateCallbacks, deltaTime);
  }

  /**
   * Process queued events
   */
  processEvents() {
    let eventsProcessed = 0;
    
    while (this.eventQueue.length > 0 && eventsProcessed < this.maxEventsPerFrame) {
      const event = this.eventQueue.shift();
      
      try {
        this.processEvent(event);
        eventsProcessed++;
      } catch (error) {
        console.error('Event processing error:', error, event);
      }
    }

    // Warn if event queue is backing up
    if (this.eventQueue.length > 50) {
      console.warn(`Event queue backing up: ${this.eventQueue.length} events pending`);
    }
  }

  /**
   * Process a single event
   * @param {Object} event - Event to process
   */
  processEvent(event) {
    const processor = this.eventProcessors.get(event.type);
    
    if (processor) {
      processor(event);
    } else if (this.gameEngine && this.gameEngine.triggerEvent) {
      // Default to game engine event processing
      this.gameEngine.triggerEvent(event);
    } else {
      console.warn('No processor found for event type:', event.type);
    }
  }

  /**
   * Execute a set of callbacks
   * @param {Set} callbacks - Set of callback functions
   * @param {number} deltaTime - Delta time to pass to callbacks
   */
  executeCallbacks(callbacks, deltaTime) {
    callbacks.forEach(callback => {
      try {
        callback(deltaTime, this.performanceStats);
      } catch (error) {
        console.error('Callback execution error:', error);
      }
    });
  }

  /**
   * Update performance statistics
   * @param {number} currentTime - Current timestamp
   */
  updatePerformanceStats(currentTime) {
    // Update FPS calculation
    this.performanceStats.lastSecondFrames++;
    
    if (currentTime - this.performanceStats.lastSecondTime >= 1000) {
      this.performanceStats.fps = this.performanceStats.lastSecondFrames;
      this.performanceStats.lastSecondFrames = 0;
      this.performanceStats.lastSecondTime = currentTime;
    }

    // Calculate average FPS
    const elapsedTime = (currentTime - this.startTime) / 1000;
    if (elapsedTime > 0) {
      this.performanceStats.averageFPS = this.performanceStats.totalFrames / elapsedTime;
    }

    // Log performance if enabled
    if (this.options.logPerformance && this.frameCount % 300 === 0) { // Every 5 seconds at 60fps
      this.logPerformanceStats();
    }
  }

  /**
   * Update frame time history for averaging
   * @param {number} frameTime - Current frame time
   */
  updateFrameTimeHistory(frameTime) {
    this.frameTimeHistory.push(frameTime);
    
    if (this.frameTimeHistory.length > this.maxFrameHistory) {
      this.frameTimeHistory.shift();
    }

    // Calculate average frame time
    if (this.frameTimeHistory.length > 0) {
      const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
      this.performanceStats.averageFrameTime = sum / this.frameTimeHistory.length;
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    this.performanceTimer = setInterval(() => {
      this.checkPerformance();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring() {
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = null;
    }
  }

  /**
   * Check performance and adjust settings if needed
   */
  checkPerformance() {
    const stats = this.performanceStats;
    
    // Detect performance issues
    if (stats.fps < 30 && stats.averageFrameTime > 33) {
      console.warn('Performance issue detected:', {
        fps: stats.fps,
        averageFrameTime: stats.averageFrameTime,
        droppedFrames: stats.droppedFrames
      });

      // Notify game engine of performance issues
      if (this.gameEngine && this.gameEngine.handlePerformanceIssue) {
        this.gameEngine.handlePerformanceIssue({
          fps: stats.fps,
          frameTime: stats.averageFrameTime,
          suggestion: 'reduce_quality'
        });
      }
    }

    // Detect if running too fast (might indicate timing issues)
    if (stats.fps > this.options.targetFPS * 1.5) {
      console.warn('Running faster than expected:', stats.fps, 'fps');
    }
  }

  /**
   * Log performance statistics
   */
  logPerformanceStats() {
    const stats = this.performanceStats;
    console.log('Performance Stats:', {
      fps: Math.round(stats.fps),
      averageFPS: Math.round(stats.averageFPS),
      frameTime: Math.round(stats.frameTime * 100) / 100,
      averageFrameTime: Math.round(stats.averageFrameTime * 100) / 100,
      updateTime: Math.round(stats.updateTime * 100) / 100,
      renderTime: Math.round(stats.renderTime * 100) / 100,
      totalFrames: stats.totalFrames,
      droppedFrames: stats.droppedFrames,
      eventQueueSize: this.eventQueue.length
    });
  }

  /**
   * Add event to processing queue
   * @param {Object} event - Event to queue
   */
  queueEvent(event) {
    if (!event || !event.type) {
      console.warn('Invalid event queued:', event);
      return;
    }

    this.eventQueue.push({
      ...event,
      timestamp: performance.now()
    });
  }

  /**
   * Register event processor
   * @param {string} eventType - Type of event to process
   * @param {Function} processor - Processor function
   */
  registerEventProcessor(eventType, processor) {
    this.eventProcessors.set(eventType, processor);
  }

  /**
   * Unregister event processor
   * @param {string} eventType - Type of event to unregister
   */
  unregisterEventProcessor(eventType) {
    this.eventProcessors.delete(eventType);
  }

  /**
   * Register update callback
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Register render callback
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onRender(callback) {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  /**
   * Register pre-update callback
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onPreUpdate(callback) {
    this.preUpdateCallbacks.add(callback);
    return () => this.preUpdateCallbacks.delete(callback);
  }

  /**
   * Register post-update callback
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onPostUpdate(callback) {
    this.postUpdateCallbacks.add(callback);
    return () => this.postUpdateCallbacks.delete(callback);
  }

  /**
   * Get current performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  /**
   * Get loop status
   * @returns {Object} Loop status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      frameCount: this.frameCount,
      deltaTime: this.deltaTime,
      eventQueueSize: this.eventQueue.length,
      performance: this.getPerformanceStats()
    };
  }

  /**
   * Set target FPS
   * @param {number} fps - Target frames per second
   */
  setTargetFPS(fps) {
    this.options.targetFPS = Math.max(1, Math.min(120, fps));
    this.targetFrameTime = 1000 / this.options.targetFPS;
    console.log(`Target FPS set to: ${this.options.targetFPS}`);
  }

  /**
   * Enable or disable frame skipping
   * @param {boolean} enabled - Whether to enable frame skipping
   */
  setFrameSkipping(enabled) {
    this.options.enableFrameSkipping = enabled;
    console.log(`Frame skipping ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear event queue
   */
  clearEventQueue() {
    const clearedCount = this.eventQueue.length;
    this.eventQueue = [];
    console.log(`Cleared ${clearedCount} events from queue`);
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats() {
    this.performanceStats = {
      fps: 0,
      averageFPS: 0,
      frameTime: 0,
      averageFrameTime: 0,
      updateTime: 0,
      renderTime: 0,
      totalFrames: 0,
      droppedFrames: 0,
      lastSecondFrames: 0,
      lastSecondTime: performance.now()
    };
    
    this.frameTimeHistory = [];
    this.frameCount = 0;
    this.startTime = performance.now();
    
    console.log('Performance stats reset');
  }

  /**
   * Cleanup and destroy the game loop
   */
  destroy() {
    console.log('Destroying GameLoop...');
    
    this.stop();
    
    // Clear all callbacks
    this.updateCallbacks.clear();
    this.renderCallbacks.clear();
    this.preUpdateCallbacks.clear();
    this.postUpdateCallbacks.clear();
    
    // Clear event processors
    this.eventProcessors.clear();
    this.eventQueue = [];
    
    // Clear references
    this.gameEngine = null;
    
    console.log('GameLoop destroyed');
  }
}

export default GameLoop;