/**
 * VoiceCommandDebouncer - Advanced voice command debouncing and rate limiting
 * Prevents rapid-fire commands and improves voice recognition accuracy
 * Requirements: 9.2, 9.3
 */

import { performanceMonitor } from './PerformanceMonitor.js';

export class VoiceCommandDebouncer {
  constructor(options = {}) {
    this.options = {
      // Debouncing settings
      debounceDelay: options.debounceDelay || 1000, // 1 second default
      minCommandInterval: options.minCommandInterval || 500, // Minimum time between commands
      maxCommandsPerSecond: options.maxCommandsPerSecond || 3,
      maxCommandsPerMinute: options.maxCommandsPerMinute || 30,
      
      // Adaptive debouncing
      enableAdaptiveDebouncing: options.enableAdaptiveDebouncing ?? true,
      adaptiveThresholds: {
        lowAccuracy: 0.6,    // Below this accuracy, increase debouncing
        highError: 0.3,      // Above this error rate, increase debouncing
        fastSpeech: 200      // Commands faster than this (ms) trigger adaptive mode
      },
      
      // Command filtering
      enableCommandFiltering: options.enableCommandFiltering ?? true,
      duplicateCommandWindow: options.duplicateCommandWindow || 2000, // 2 seconds
      similarityThreshold: options.similarityThreshold || 0.8,
      
      // Performance optimization
      enablePerformanceMode: options.enablePerformanceMode ?? true,
      performanceModeThreshold: 30, // FPS threshold to enable performance mode
      
      ...options
    };

    // Debouncing state
    this.lastCommandTime = 0;
    this.lastCommand = null;
    this.commandQueue = [];
    this.pendingCommand = null;
    this.debounceTimer = null;

    // Rate limiting
    this.commandHistory = [];
    this.commandCounts = {
      lastSecond: 0,
      lastMinute: 0,
      lastSecondTime: 0,
      lastMinuteTime: 0
    };

    // Adaptive debouncing
    this.adaptiveState = {
      currentDelay: this.options.debounceDelay,
      accuracyHistory: [],
      errorHistory: [],
      speedHistory: [],
      adaptiveMode: false
    };

    // Command filtering
    this.recentCommands = [];
    this.duplicateCommands = new Map();

    // Performance monitoring
    this.performanceMode = false;
    this.performanceStats = {
      commandsProcessed: 0,
      commandsDebounced: 0,
      commandsFiltered: 0,
      commandsRateLimited: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };

    // Callbacks
    this.commandCallbacks = new Set();
    this.debugCallbacks = new Set();

    // Bind methods
    this.processCommand = this.processCommand.bind(this);
    this.executeCommand = this.executeCommand.bind(this);
    this.updateAdaptiveDebouncing = this.updateAdaptiveDebouncing.bind(this);
    this.checkPerformanceMode = this.checkPerformanceMode.bind(this);
  }

  /**
   * Process a voice command with debouncing and filtering
   * @param {Object} command - Command object with text, confidence, etc.
   * @param {Object} context - Additional context (game state, etc.)
   * @returns {Promise<boolean>} Whether command was processed
   */
  async processCommand(command, context = {}) {
    const startTime = performance.now();
    const now = Date.now();

    try {
      // Record command for performance monitoring
      performanceMonitor.recordMetric('voice', 'commandReceived', 1);

      // Update command counts for rate limiting
      this.updateCommandCounts(now);

      // Check rate limits
      if (this.isRateLimited()) {
        this.performanceStats.commandsRateLimited++;
        this.notifyDebug('command_rate_limited', { command, reason: 'rate_limit' });
        return false;
      }

      // Check minimum interval
      const timeSinceLastCommand = now - this.lastCommandTime;
      if (timeSinceLastCommand < this.options.minCommandInterval) {
        this.performanceStats.commandsDebounced++;
        this.notifyDebug('command_debounced', { 
          command, 
          reason: 'min_interval',
          timeSinceLastCommand 
        });
        return false;
      }

      // Filter duplicate/similar commands
      if (this.options.enableCommandFiltering && this.isDuplicateCommand(command)) {
        this.performanceStats.commandsFiltered++;
        this.notifyDebug('command_filtered', { command, reason: 'duplicate' });
        return false;
      }

      // Apply debouncing
      const shouldDebounce = this.shouldDebounceCommand(command, context);
      if (shouldDebounce) {
        return this.debounceCommand(command, context);
      }

      // Execute command immediately
      const result = await this.executeCommand(command, context);
      
      // Update adaptive debouncing based on result
      if (this.options.enableAdaptiveDebouncing) {
        this.updateAdaptiveDebouncing(command, result, timeSinceLastCommand);
      }

      // Record performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceStats(processingTime);
      performanceMonitor.recordMetric('voice', 'commandProcessingTime', processingTime);

      return result;

    } catch (error) {
      console.error('Error processing voice command:', error);
      performanceMonitor.recordMetric('voice', 'commandError', 1);
      return false;
    }
  }

  /**
   * Update command counts for rate limiting
   * @param {number} now - Current timestamp
   */
  updateCommandCounts(now) {
    // Reset counters if time windows have passed
    if (now - this.commandCounts.lastSecondTime >= 1000) {
      this.commandCounts.lastSecond = 0;
      this.commandCounts.lastSecondTime = now;
    }

    if (now - this.commandCounts.lastMinuteTime >= 60000) {
      this.commandCounts.lastMinute = 0;
      this.commandCounts.lastMinuteTime = now;
    }

    // Increment counters
    this.commandCounts.lastSecond++;
    this.commandCounts.lastMinute++;
  }

  /**
   * Check if command should be rate limited
   * @returns {boolean} Whether command is rate limited
   */
  isRateLimited() {
    return (
      this.commandCounts.lastSecond > this.options.maxCommandsPerSecond ||
      this.commandCounts.lastMinute > this.options.maxCommandsPerMinute
    );
  }

  /**
   * Check if command is a duplicate of recent commands
   * @param {Object} command - Command to check
   * @returns {boolean} Whether command is duplicate
   */
  isDuplicateCommand(command) {
    const now = Date.now();
    const commandText = command.text?.toLowerCase().trim();

    if (!commandText) {
      return false;
    }

    // Clean up old commands
    this.recentCommands = this.recentCommands.filter(
      recent => now - recent.timestamp < this.options.duplicateCommandWindow
    );

    // Check for exact duplicates
    const exactDuplicate = this.recentCommands.some(recent => 
      recent.text === commandText
    );

    if (exactDuplicate) {
      return true;
    }

    // Check for similar commands using similarity threshold
    const similarCommand = this.recentCommands.some(recent => {
      const similarity = this.calculateSimilarity(commandText, recent.text);
      return similarity >= this.options.similarityThreshold;
    });

    if (similarCommand) {
      return true;
    }

    // Add command to recent commands
    this.recentCommands.push({
      text: commandText,
      timestamp: now,
      confidence: command.confidence
    });

    return false;
  }

  /**
   * Calculate similarity between two command strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Determine if command should be debounced
   * @param {Object} command - Command object
   * @param {Object} context - Command context
   * @returns {boolean} Whether to debounce
   */
  shouldDebounceCommand(command, context) {
    // Always debounce if there's a pending command
    if (this.pendingCommand) {
      return true;
    }

    // Check if performance mode requires debouncing
    if (this.performanceMode) {
      return true;
    }

    // Check adaptive debouncing conditions
    if (this.adaptiveState.adaptiveMode) {
      return true;
    }

    // Check command confidence - low confidence commands get debounced
    if (command.confidence && command.confidence < 0.7) {
      return true;
    }

    // Check if command is complex (might need more processing time)
    const commandText = command.text?.toLowerCase() || '';
    const isComplexCommand = commandText.includes(' and ') || 
                           commandText.includes(' then ') ||
                           commandText.split(' ').length > 3;

    if (isComplexCommand) {
      return true;
    }

    return false;
  }

  /**
   * Debounce a command (delay execution)
   * @param {Object} command - Command to debounce
   * @param {Object} context - Command context
   * @returns {Promise<boolean>} Debouncing promise
   */
  debounceCommand(command, context) {
    return new Promise((resolve) => {
      // Cancel existing debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Store pending command
      this.pendingCommand = { command, context, resolve };

      // Set debounce timer
      const delay = this.getCurrentDebounceDelay();
      this.debounceTimer = setTimeout(async () => {
        const result = await this.executePendingCommand();
        resolve(result);
      }, delay);

      this.performanceStats.commandsDebounced++;
      this.notifyDebug('command_debounced', { 
        command, 
        delay,
        reason: 'debounce_timer'
      });
    });
  }

  /**
   * Get current debounce delay (may be adaptive)
   * @returns {number} Debounce delay in milliseconds
   */
  getCurrentDebounceDelay() {
    if (this.options.enableAdaptiveDebouncing && this.adaptiveState.adaptiveMode) {
      return this.adaptiveState.currentDelay;
    }

    if (this.performanceMode) {
      return this.options.debounceDelay * 1.5; // Increase delay in performance mode
    }

    return this.options.debounceDelay;
  }

  /**
   * Execute the pending command
   * @returns {Promise<boolean>} Execution result
   */
  async executePendingCommand() {
    if (!this.pendingCommand) {
      return false;
    }

    const { command, context } = this.pendingCommand;
    this.pendingCommand = null;
    this.debounceTimer = null;

    return this.executeCommand(command, context);
  }

  /**
   * Execute a command immediately
   * @param {Object} command - Command to execute
   * @param {Object} context - Command context
   * @returns {Promise<boolean>} Execution result
   */
  async executeCommand(command, context) {
    const now = Date.now();
    
    try {
      // Update last command info
      this.lastCommandTime = now;
      this.lastCommand = command;

      // Add to command history
      this.commandHistory.push({
        command,
        context,
        timestamp: now,
        executed: true
      });

      // Trim command history
      if (this.commandHistory.length > 100) {
        this.commandHistory.shift();
      }

      // Notify command callbacks
      let result = false;
      for (const callback of this.commandCallbacks) {
        try {
          const callbackResult = await callback(command, context);
          if (callbackResult) {
            result = true;
          }
        } catch (error) {
          console.error('Error in command callback:', error);
        }
      }

      this.performanceStats.commandsProcessed++;
      performanceMonitor.recordMetric('voice', 'commandExecuted', 1);

      return result;

    } catch (error) {
      console.error('Error executing command:', error);
      performanceMonitor.recordMetric('voice', 'commandExecutionError', 1);
      return false;
    }
  }

  /**
   * Update adaptive debouncing based on command results
   * @param {Object} command - Executed command
   * @param {boolean} result - Execution result
   * @param {number} timeSinceLastCommand - Time since last command
   */
  updateAdaptiveDebouncing(command, result, timeSinceLastCommand) {
    const accuracy = command.confidence || 0.5;
    const wasError = !result;
    const wasFast = timeSinceLastCommand < this.options.adaptiveThresholds.fastSpeech;

    // Update history
    this.adaptiveState.accuracyHistory.push(accuracy);
    this.adaptiveState.errorHistory.push(wasError ? 1 : 0);
    this.adaptiveState.speedHistory.push(timeSinceLastCommand);

    // Keep only recent history
    const maxHistory = 10;
    if (this.adaptiveState.accuracyHistory.length > maxHistory) {
      this.adaptiveState.accuracyHistory.shift();
      this.adaptiveState.errorHistory.shift();
      this.adaptiveState.speedHistory.shift();
    }

    // Calculate averages
    const avgAccuracy = this.adaptiveState.accuracyHistory.reduce((a, b) => a + b, 0) / 
                       this.adaptiveState.accuracyHistory.length;
    const errorRate = this.adaptiveState.errorHistory.reduce((a, b) => a + b, 0) / 
                     this.adaptiveState.errorHistory.length;
    const avgSpeed = this.adaptiveState.speedHistory.reduce((a, b) => a + b, 0) / 
                    this.adaptiveState.speedHistory.length;

    // Determine if adaptive mode should be enabled
    const shouldEnableAdaptive = (
      avgAccuracy < this.options.adaptiveThresholds.lowAccuracy ||
      errorRate > this.options.adaptiveThresholds.highError ||
      avgSpeed < this.options.adaptiveThresholds.fastSpeech
    );

    if (shouldEnableAdaptive && !this.adaptiveState.adaptiveMode) {
      this.enableAdaptiveMode();
    } else if (!shouldEnableAdaptive && this.adaptiveState.adaptiveMode) {
      this.disableAdaptiveMode();
    }

    // Adjust debounce delay based on conditions
    if (this.adaptiveState.adaptiveMode) {
      let delayMultiplier = 1.0;

      if (avgAccuracy < 0.5) delayMultiplier += 0.5;
      if (errorRate > 0.4) delayMultiplier += 0.3;
      if (avgSpeed < 150) delayMultiplier += 0.2;

      this.adaptiveState.currentDelay = Math.min(
        this.options.debounceDelay * delayMultiplier,
        this.options.debounceDelay * 3 // Max 3x original delay
      );
    }
  }

  /**
   * Enable adaptive debouncing mode
   */
  enableAdaptiveMode() {
    this.adaptiveState.adaptiveMode = true;
    this.adaptiveState.currentDelay = this.options.debounceDelay * 1.5;
    
    console.log('Adaptive voice debouncing enabled');
    this.notifyDebug('adaptive_mode_enabled', {
      currentDelay: this.adaptiveState.currentDelay
    });
  }

  /**
   * Disable adaptive debouncing mode
   */
  disableAdaptiveMode() {
    this.adaptiveState.adaptiveMode = false;
    this.adaptiveState.currentDelay = this.options.debounceDelay;
    
    console.log('Adaptive voice debouncing disabled');
    this.notifyDebug('adaptive_mode_disabled', {
      currentDelay: this.adaptiveState.currentDelay
    });
  }

  /**
   * Check and update performance mode
   */
  checkPerformanceMode() {
    if (!this.options.enablePerformanceMode) {
      return;
    }

    const currentFPS = performanceMonitor.getMetrics().fps || 60;
    const shouldEnablePerformanceMode = currentFPS < this.options.performanceModeThreshold;

    if (shouldEnablePerformanceMode && !this.performanceMode) {
      this.enablePerformanceMode();
    } else if (!shouldEnablePerformanceMode && this.performanceMode) {
      this.disablePerformanceMode();
    }
  }

  /**
   * Enable performance mode
   */
  enablePerformanceMode() {
    this.performanceMode = true;
    console.log('Voice command performance mode enabled');
    this.notifyDebug('performance_mode_enabled', {
      reason: 'low_fps'
    });
  }

  /**
   * Disable performance mode
   */
  disablePerformanceMode() {
    this.performanceMode = false;
    console.log('Voice command performance mode disabled');
    this.notifyDebug('performance_mode_disabled', {
      reason: 'fps_improved'
    });
  }

  /**
   * Set command debounce delay
   * @param {number} delay - Debounce delay in milliseconds
   */
  setCommandDebounceDelay(delay) {
    this.options.debounceDelay = Math.max(100, delay);
  }

  /**
   * Enable adaptive debouncing mode
   */
  enableAdaptiveMode() {
    this.adaptiveState.adaptiveMode = true;
    this.adaptiveState.currentDelay = this.options.debounceDelay * 1.5;
    
    console.log('Adaptive voice debouncing enabled');
    this.notifyDebug('adaptive_mode_enabled', {
      currentDelay: this.adaptiveState.currentDelay
    });
  }

  /**
   * Update performance statistics
   * @param {number} processingTime - Command processing time
   */
  updatePerformanceStats(processingTime) {
    this.performanceStats.totalProcessingTime += processingTime;
    this.performanceStats.averageProcessingTime = 
      this.performanceStats.totalProcessingTime / 
      (this.performanceStats.commandsProcessed + 1);
  }

  /**
   * Register command callback
   * @param {Function} callback - Callback function
   * @returns {Function} Unregister function
   */
  onCommand(callback) {
    this.commandCallbacks.add(callback);
    return () => this.commandCallbacks.delete(callback);
  }

  /**
   * Register debug callback
   * @param {Function} callback - Debug callback function
   * @returns {Function} Unregister function
   */
  onDebug(callback) {
    this.debugCallbacks.add(callback);
    return () => this.debugCallbacks.delete(callback);
  }

  /**
   * Notify debug callbacks
   * @param {string} event - Debug event type
   * @param {Object} data - Debug data
   */
  notifyDebug(event, data) {
    this.debugCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in debug callback:', error);
      }
    });
  }

  /**
   * Get debouncer statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      performance: { ...this.performanceStats },
      adaptive: {
        mode: this.adaptiveState.adaptiveMode,
        currentDelay: this.adaptiveState.currentDelay,
        averageAccuracy: this.adaptiveState.accuracyHistory.length > 0 ?
          this.adaptiveState.accuracyHistory.reduce((a, b) => a + b, 0) / 
          this.adaptiveState.accuracyHistory.length : 0
      },
      rateLimiting: {
        commandsPerSecond: this.commandCounts.lastSecond,
        commandsPerMinute: this.commandCounts.lastMinute
      },
      filtering: {
        recentCommandsCount: this.recentCommands.length,
        duplicateCommandsCount: this.duplicateCommands.size
      },
      performanceMode: this.performanceMode
    };
  }

  /**
   * Get debouncer status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isDebouncing: !!this.pendingCommand,
      lastCommandTime: this.lastCommandTime,
      currentDelay: this.getCurrentDebounceDelay(),
      adaptiveMode: this.adaptiveState.adaptiveMode,
      performanceMode: this.performanceMode,
      statistics: this.getStatistics()
    };
  }

  /**
   * Reset debouncer state
   */
  reset() {
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Reset state
    this.lastCommandTime = 0;
    this.lastCommand = null;
    this.pendingCommand = null;
    this.commandHistory = [];
    this.recentCommands = [];
    this.duplicateCommands.clear();

    // Reset adaptive state
    this.adaptiveState = {
      currentDelay: this.options.debounceDelay,
      accuracyHistory: [],
      errorHistory: [],
      speedHistory: [],
      adaptiveMode: false
    };

    // Reset performance stats
    this.performanceStats = {
      commandsProcessed: 0,
      commandsDebounced: 0,
      commandsFiltered: 0,
      commandsRateLimited: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };

    console.log('Voice command debouncer reset');
  }

  /**
   * Destroy the debouncer
   */
  destroy() {
    this.reset();
    this.commandCallbacks.clear();
    this.debugCallbacks.clear();
    
    console.log('Voice command debouncer destroyed');
  }
}

export default VoiceCommandDebouncer;