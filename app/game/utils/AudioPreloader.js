/**
 * AudioPreloader - Advanced audio preloading and lazy loading system
 * Optimizes audio loading for better performance and user experience
 * Requirements: 9.1, 9.2, 9.3
 */

import { performanceMonitor } from './PerformanceMonitor.js';

export class AudioPreloader {
  constructor(audioManager, options = {}) {
    this.audioManager = audioManager;
    this.options = {
      enablePreloading: options.enablePreloading ?? true,
      enableLazyLoading: options.enableLazyLoading ?? true,
      preloadPriority: options.preloadPriority || 'essential', // 'essential', 'important', 'all'
      maxConcurrentLoads: options.maxConcurrentLoads || 3,
      loadTimeout: options.loadTimeout || 10000, // 10 seconds
      retryAttempts: options.retryAttempts || 2,
      retryDelay: options.retryDelay || 1000,
      cacheSize: options.cacheSize || 50 * 1024 * 1024, // 50MB
      ...options
    };

    // Loading state
    this.loadingQueue = [];
    this.loadingInProgress = new Map();
    this.loadedAssets = new Map();
    this.failedAssets = new Map();
    this.preloadedAssets = new Set();

    // Performance tracking
    this.loadingStats = {
      totalRequests: 0,
      successfulLoads: 0,
      failedLoads: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bytesLoaded: 0,
      bytesFromCache: 0
    };

    // Priority definitions
    this.priorityLevels = {
      essential: 1,    // Critical for gameplay (UI sounds, basic ambient)
      important: 2,    // Important for experience (most sound effects)
      optional: 3,     // Nice to have (additional ambient, rare effects)
      background: 4    // Can be loaded later (music, extended audio)
    };

    // Asset priority mapping
    this.assetPriorities = {
      // Essential sounds
      'jump_scare': 'essential',
      'heartbeat': 'essential',
      'breathing_heavy': 'essential',
      'flashlight_click': 'essential',
      
      // Important sounds
      'footsteps': 'important',
      'door_creak': 'important',
      'whisper': 'important',
      'glass_break': 'important',
      
      // Optional sounds
      'forest_night': 'optional',
      'house_creaks': 'optional',
      'basement_drip': 'optional',
      'wind_howling': 'optional'
    };

    // Network condition detection
    this.networkInfo = this.getNetworkInfo();
    this.adaptiveLoading = this.shouldUseAdaptiveLoading();

    // Event listeners
    this.loadCallbacks = new Map();
    this.progressCallbacks = new Set();
    this.errorCallbacks = new Set();

    // Initialize
    this.initializePreloader();

    // Bind methods
    this.preloadAssets = this.preloadAssets.bind(this);
    this.loadAsset = this.loadAsset.bind(this);
    this.handleLoadComplete = this.handleLoadComplete.bind(this);
    this.handleLoadError = this.handleLoadError.bind(this);
  }

  /**
   * Initialize the preloader
   */
  initializePreloader() {
    // Listen for network changes (skip in non-browser environments)
    if (typeof navigator !== 'undefined' && navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.networkInfo = this.getNetworkInfo();
        this.adaptLoadingStrategy();
      });
    }

    // Listen for memory pressure events
    if (performance.memory) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 30000); // Check every 30 seconds
    }

    // Start preloading if enabled
    if (this.options.enablePreloading) {
      this.startPreloading();
    }
  }

  /**
   * Get network information for adaptive loading
   * @returns {Object} Network information
   */
  getNetworkInfo() {
    // Skip in non-browser environments
    if (typeof navigator === 'undefined') {
      return {
        effectiveType: 'unknown',
        downlink: 10, // Assume decent connection
        rtt: 100,
        saveData: false
      };
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
      return {
        effectiveType: 'unknown',
        downlink: 10, // Assume decent connection
        rtt: 100,
        saveData: false
      };
    }

    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false
    };
  }

  /**
   * Determine if adaptive loading should be used
   * @returns {boolean} Whether to use adaptive loading
   */
  shouldUseAdaptiveLoading() {
    return !!(navigator.connection && (
      this.networkInfo.saveData ||
      this.networkInfo.effectiveType === 'slow-2g' ||
      this.networkInfo.effectiveType === '2g' ||
      this.networkInfo.downlink < 1
    ));
  }

  /**
   * Start preloading essential assets
   */
  async startPreloading() {
    console.log('Starting audio preloading...');
    
    const startTime = performance.now();
    
    try {
      // Get assets to preload based on priority
      const assetsToPreload = this.getAssetsToPreload();
      
      console.log(`Preloading ${assetsToPreload.length} audio assets...`);
      
      // Preload assets in priority order
      await this.preloadAssets(assetsToPreload);
      
      const loadTime = performance.now() - startTime;
      console.log(`Audio preloading completed in ${Math.round(loadTime)}ms`);
      
      // Record performance metrics
      performanceMonitor.recordMetric('audio', 'preloadTime', loadTime);
      
    } catch (error) {
      console.error('Audio preloading failed:', error);
      performanceMonitor.recordMetric('audio', 'preloadError', 1);
    }
  }

  /**
   * Get list of assets to preload based on priority and network conditions
   * @returns {Array} Assets to preload
   */
  getAssetsToPreload() {
    const allAssets = [
      ...Object.keys(this.audioManager.audioAssets.ambient || {}),
      ...Object.keys(this.audioManager.audioAssets.effects || {})
    ];

    // Filter by priority level
    const priorityFilter = this.getPriorityFilter();
    const assetsToPreload = allAssets.filter(asset => {
      const priority = this.assetPriorities[asset] || 'optional';
      return this.priorityLevels[priority] <= this.priorityLevels[priorityFilter];
    });

    // Sort by priority
    assetsToPreload.sort((a, b) => {
      const priorityA = this.assetPriorities[a] || 'optional';
      const priorityB = this.assetPriorities[b] || 'optional';
      return this.priorityLevels[priorityA] - this.priorityLevels[priorityB];
    });

    return assetsToPreload;
  }

  /**
   * Get priority filter based on network conditions and settings
   * @returns {string} Priority filter level
   */
  getPriorityFilter() {
    if (this.networkInfo.saveData) {
      return 'essential';
    }

    if (this.adaptiveLoading) {
      if (this.networkInfo.effectiveType === 'slow-2g' || this.networkInfo.effectiveType === '2g') {
        return 'essential';
      } else if (this.networkInfo.effectiveType === '3g') {
        return 'important';
      }
    }

    return this.options.preloadPriority;
  }

  /**
   * Preload multiple assets with concurrency control
   * @param {Array} assetKeys - Asset keys to preload
   * @returns {Promise} Preloading promise
   */
  async preloadAssets(assetKeys) {
    const loadPromises = [];
    let concurrentLoads = 0;

    for (const assetKey of assetKeys) {
      // Wait if we've reached max concurrent loads
      while (concurrentLoads >= this.options.maxConcurrentLoads) {
        await new Promise(resolve => setTimeout(resolve, 100));
        concurrentLoads = this.loadingInProgress.size;
      }

      // Start loading the asset
      const loadPromise = this.loadAsset(assetKey)
        .then(() => {
          concurrentLoads--;
        })
        .catch(error => {
          concurrentLoads--;
          console.warn(`Failed to preload asset: ${assetKey}`, error);
        });

      loadPromises.push(loadPromise);
      concurrentLoads++;
    }

    // Wait for all loads to complete
    await Promise.allSettled(loadPromises);
  }

  /**
   * Load a single asset with retry logic
   * @param {string} assetKey - Asset key to load
   * @param {Object} options - Loading options
   * @returns {Promise} Loading promise
   */
  async loadAsset(assetKey, options = {}) {
    const {
      priority = this.assetPriorities[assetKey] || 'optional',
      timeout = this.options.loadTimeout,
      retryAttempts = this.options.retryAttempts
    } = options;

    // Check if already loaded or loading
    if (this.loadedAssets.has(assetKey)) {
      this.loadingStats.cacheHits++;
      return this.loadedAssets.get(assetKey);
    }

    if (this.loadingInProgress.has(assetKey)) {
      return this.loadingInProgress.get(assetKey);
    }

    // Check if previously failed and should retry
    if (this.failedAssets.has(assetKey)) {
      const failureInfo = this.failedAssets.get(assetKey);
      if (failureInfo.attempts >= retryAttempts) {
        throw new Error(`Asset ${assetKey} failed to load after ${retryAttempts} attempts`);
      }
    }

    const startTime = performance.now();
    this.loadingStats.totalRequests++;
    this.loadingStats.cacheMisses++;

    // Create loading promise
    const loadingPromise = this.performAssetLoad(assetKey, timeout, retryAttempts);
    this.loadingInProgress.set(assetKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      // Record successful load
      const loadTime = performance.now() - startTime;
      this.loadingStats.successfulLoads++;
      this.loadingStats.totalLoadTime += loadTime;
      this.loadingStats.averageLoadTime = this.loadingStats.totalLoadTime / this.loadingStats.successfulLoads;
      
      // Store in cache
      this.loadedAssets.set(assetKey, result);
      this.preloadedAssets.add(assetKey);
      
      // Clean up
      this.loadingInProgress.delete(assetKey);
      this.failedAssets.delete(assetKey);
      
      // Notify callbacks
      this.notifyLoadComplete(assetKey, result, loadTime);
      
      // Record performance metrics
      performanceMonitor.recordMetric('audio', 'loadTime', loadTime, { asset: assetKey });
      
      return result;
      
    } catch (error) {
      // Record failed load
      this.loadingStats.failedLoads++;
      
      // Update failure info
      const failureInfo = this.failedAssets.get(assetKey) || { attempts: 0 };
      failureInfo.attempts++;
      failureInfo.lastError = error;
      failureInfo.lastAttempt = Date.now();
      this.failedAssets.set(assetKey, failureInfo);
      
      // Clean up
      this.loadingInProgress.delete(assetKey);
      
      // Notify callbacks
      this.notifyLoadError(assetKey, error);
      
      // Record performance metrics
      performanceMonitor.recordMetric('audio', 'loadError', 1, { asset: assetKey });
      
      throw error;
    }
  }

  /**
   * Perform the actual asset loading
   * @param {string} assetKey - Asset key to load
   * @param {number} timeout - Load timeout
   * @param {number} retryAttempts - Number of retry attempts
   * @returns {Promise} Loading promise
   */
  async performAssetLoad(assetKey, timeout, retryAttempts) {
    let lastError;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Add delay for retry attempts
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * attempt));
        }
        
        // Determine asset category and config
        const { category, config } = this.getAssetInfo(assetKey);
        
        if (!config) {
          throw new Error(`Asset configuration not found: ${assetKey}`);
        }
        
        // Load the asset with timeout
        const result = await Promise.race([
          this.loadAudioAsset(assetKey, category, config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Load timeout')), timeout)
          )
        ]);
        
        return result;
        
      } catch (error) {
        lastError = error;
        console.warn(`Asset load attempt ${attempt + 1} failed for ${assetKey}:`, error);
        
        // Don't retry on certain errors
        if (error.message.includes('not found') || error.message.includes('404')) {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get asset information (category and config)
   * @param {string} assetKey - Asset key
   * @returns {Object} Asset information
   */
  getAssetInfo(assetKey) {
    const ambientConfig = this.audioManager.audioAssets.ambient?.[assetKey];
    if (ambientConfig) {
      return { category: 'ambient', config: ambientConfig };
    }
    
    const effectConfig = this.audioManager.audioAssets.effects?.[assetKey];
    if (effectConfig) {
      return { category: 'effects', config: effectConfig };
    }
    
    return { category: null, config: null };
  }

  /**
   * Load audio asset using the audio manager
   * @param {string} assetKey - Asset key
   * @param {string} category - Asset category
   * @param {Object} config - Asset configuration
   * @returns {Promise} Loading promise
   */
  async loadAudioAsset(assetKey, category, config) {
    // Use the audio manager's loading mechanism
    return this.audioManager.loadSound(category, assetKey, config);
  }

  /**
   * Lazy load an asset when needed
   * @param {string} assetKey - Asset key to lazy load
   * @returns {Promise} Loading promise
   */
  async lazyLoad(assetKey) {
    if (!this.options.enableLazyLoading) {
      throw new Error('Lazy loading is disabled');
    }
    
    console.log(`Lazy loading asset: ${assetKey}`);
    
    // Check if already preloaded
    if (this.preloadedAssets.has(assetKey)) {
      return this.loadedAssets.get(assetKey);
    }
    
    // Load with higher priority for immediate use
    return this.loadAsset(assetKey, { priority: 'essential' });
  }

  /**
   * Check memory pressure and clean up if needed
   */
  checkMemoryPressure() {
    if (!performance.memory) {
      return;
    }
    
    const memory = performance.memory;
    const memoryUsage = memory.usedJSHeapSize;
    const memoryLimit = memory.jsHeapSizeLimit;
    const memoryPressure = memoryUsage / memoryLimit;
    
    // If memory usage is high, clean up non-essential assets
    if (memoryPressure > 0.8) {
      console.warn('High memory pressure detected, cleaning up audio assets');
      this.cleanupNonEssentialAssets();
    }
  }

  /**
   * Clean up non-essential assets to free memory
   */
  cleanupNonEssentialAssets() {
    let cleanedCount = 0;
    
    for (const [assetKey, asset] of this.loadedAssets) {
      const priority = this.assetPriorities[assetKey] || 'optional';
      
      // Only clean up optional and background assets
      if (priority === 'optional' || priority === 'background') {
        try {
          // Unload the asset if possible
          if (asset && typeof asset.unload === 'function') {
            asset.unload();
          }
          
          this.loadedAssets.delete(assetKey);
          this.preloadedAssets.delete(assetKey);
          cleanedCount++;
          
        } catch (error) {
          console.warn(`Failed to cleanup asset ${assetKey}:`, error);
        }
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} non-essential audio assets`);
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Adapt loading strategy based on network conditions
   */
  adaptLoadingStrategy() {
    const newNetworkInfo = this.getNetworkInfo();
    const wasAdaptive = this.adaptiveLoading;
    
    this.networkInfo = newNetworkInfo;
    this.adaptiveLoading = this.shouldUseAdaptiveLoading();
    
    if (this.adaptiveLoading && !wasAdaptive) {
      console.log('Switching to adaptive loading due to network conditions');
      
      // Pause non-essential loading
      this.pauseNonEssentialLoading();
      
    } else if (!this.adaptiveLoading && wasAdaptive) {
      console.log('Network conditions improved, resuming normal loading');
      
      // Resume normal loading
      this.resumeNormalLoading();
    }
  }

  /**
   * Pause non-essential loading
   */
  pauseNonEssentialLoading() {
    // Cancel non-essential loads in progress
    for (const [assetKey, promise] of this.loadingInProgress) {
      const priority = this.assetPriorities[assetKey] || 'optional';
      
      if (priority !== 'essential') {
        // We can't actually cancel the promise, but we can mark it as cancelled
        promise.cancelled = true;
      }
    }
  }

  /**
   * Resume normal loading
   */
  resumeNormalLoading() {
    // Resume preloading if it was paused
    if (this.options.enablePreloading) {
      const assetsToPreload = this.getAssetsToPreload();
      const unloadedAssets = assetsToPreload.filter(asset => !this.loadedAssets.has(asset));
      
      if (unloadedAssets.length > 0) {
        this.preloadAssets(unloadedAssets);
      }
    }
  }

  /**
   * Register callback for load completion
   * @param {string} assetKey - Asset key to listen for
   * @param {Function} callback - Callback function
   */
  onLoadComplete(assetKey, callback) {
    if (!this.loadCallbacks.has(assetKey)) {
      this.loadCallbacks.set(assetKey, new Set());
    }
    
    this.loadCallbacks.get(assetKey).add(callback);
    
    // Return unregister function
    return () => {
      const callbacks = this.loadCallbacks.get(assetKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.loadCallbacks.delete(assetKey);
        }
      }
    };
  }

  /**
   * Register callback for loading progress
   * @param {Function} callback - Callback function
   */
  onProgress(callback) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Register callback for loading errors
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Notify load completion callbacks
   * @param {string} assetKey - Asset key
   * @param {*} result - Load result
   * @param {number} loadTime - Load time
   */
  notifyLoadComplete(assetKey, result, loadTime) {
    const callbacks = this.loadCallbacks.get(assetKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(assetKey, result, loadTime);
        } catch (error) {
          console.error('Error in load complete callback:', error);
        }
      });
    }
    
    // Notify progress callbacks
    this.notifyProgress();
  }

  /**
   * Notify loading error callbacks
   * @param {string} assetKey - Asset key
   * @param {Error} error - Error object
   */
  notifyLoadError(assetKey, error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(assetKey, error);
      } catch (callbackError) {
        console.error('Error in load error callback:', callbackError);
      }
    });
  }

  /**
   * Notify progress callbacks
   */
  notifyProgress() {
    const progress = this.getLoadingProgress();
    
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Get loading progress information
   * @returns {Object} Progress information
   */
  getLoadingProgress() {
    const totalAssets = Object.keys(this.assetPriorities).length;
    const loadedAssets = this.loadedAssets.size;
    const loadingAssets = this.loadingInProgress.size;
    const failedAssets = this.failedAssets.size;
    
    return {
      total: totalAssets,
      loaded: loadedAssets,
      loading: loadingAssets,
      failed: failedAssets,
      percentage: totalAssets > 0 ? (loadedAssets / totalAssets) * 100 : 0,
      isComplete: loadingAssets === 0 && loadedAssets + failedAssets >= totalAssets
    };
  }

  /**
   * Get loading statistics
   * @returns {Object} Loading statistics
   */
  getLoadingStats() {
    return { ...this.loadingStats };
  }

  /**
   * Get preloader status
   * @returns {Object} Preloader status
   */
  getStatus() {
    return {
      isPreloading: this.loadingInProgress.size > 0,
      adaptiveLoading: this.adaptiveLoading,
      networkInfo: this.networkInfo,
      progress: this.getLoadingProgress(),
      stats: this.getLoadingStats(),
      loadedAssets: Array.from(this.loadedAssets.keys()),
      failedAssets: Array.from(this.failedAssets.keys()),
      preloadedAssets: Array.from(this.preloadedAssets)
    };
  }

  /**
   * Clear all cached assets
   */
  clearCache() {
    console.log('Clearing audio preloader cache...');
    
    // Unload all cached assets
    for (const [assetKey, asset] of this.loadedAssets) {
      try {
        if (asset && typeof asset.unload === 'function') {
          asset.unload();
        }
      } catch (error) {
        console.warn(`Failed to unload asset ${assetKey}:`, error);
      }
    }
    
    this.loadedAssets.clear();
    this.preloadedAssets.clear();
    this.failedAssets.clear();
    
    // Reset stats
    this.loadingStats = {
      totalRequests: 0,
      successfulLoads: 0,
      failedLoads: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bytesLoaded: 0,
      bytesFromCache: 0
    };
    
    console.log('Audio preloader cache cleared');
  }

  /**
   * Destroy the preloader
   */
  destroy() {
    console.log('Destroying audio preloader...');
    
    // Clear cache
    this.clearCache();
    
    // Clear callbacks
    this.loadCallbacks.clear();
    this.progressCallbacks.clear();
    this.errorCallbacks.clear();
    
    // Clear loading queue
    this.loadingQueue = [];
    this.loadingInProgress.clear();
    
    console.log('Audio preloader destroyed');
  }
}

export default AudioPreloader;