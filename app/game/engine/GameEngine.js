/**
 * GameEngine - Core game loop and state management
 * Handles centralized game state, timing, and system coordination
 */

import { GameState } from './GameState.js';
import { GameTimer } from './GameTimer.js';
import { FearSystem } from './FearSystem.js';
import { HealthSystem } from './HealthSystem.js';
import { InventorySystem } from './InventorySystem.js';
import { EndingSystem } from './EndingSystem.js';
import EventSystem from './EventSystem.js';
import GameLoop from './GameLoop.js';

export class GameEngine {
  constructor(audioManager = null, voiceController = null, voiceNarrator = null) {
    this.gameState = new GameState();
    this.gameTimer = new GameTimer(this.gameState);
    this.fearSystem = new FearSystem(this.gameState);
    this.healthSystem = new HealthSystem(this.gameState);
    this.inventorySystem = new InventorySystem(this.gameState, audioManager, voiceNarrator);
    this.endingSystem = new EndingSystem(this.gameState, audioManager, voiceNarrator);
    this.eventSystem = new EventSystem(this.gameState, audioManager, voiceController);
    
    // Game loop management
    this.gameLoop = new GameLoop(this, {
      targetFPS: 60,
      enablePerformanceMonitoring: true,
      logPerformance: false
    });
    
    this.isRunning = false;
    this.updateCallbacks = new Set();
    this.commandHandlers = new Map();
    
    // External system references
    this.audioManager = audioManager;
    this.voiceController = voiceController;
    this.voiceNarrator = voiceNarrator;
    
    // Set up timer event handlers
    this.setupTimerEvents();
    
    // Set up system integrations
    this.setupSystemIntegrations();
    
    // Set up game loop callbacks
    this.setupGameLoopCallbacks();
    
    // Bind methods to preserve context
    this.update = this.update.bind(this);
    this.handleCommand = this.handleCommand.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handlePerformanceIssue = this.handlePerformanceIssue.bind(this);
  }

  /**
   * Start the game engine and begin the game loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameState.startGame();
    this.gameTimer.start();
    
    // Initialize starting inventory
    this.inventorySystem.initializeStartingInventory();
    
    // Start the advanced game loop
    this.gameLoop.start();
    
    console.log('GameEngine started with advanced game loop');
  }

  /**
   * Stop the game engine
   */
  stop() {
    this.isRunning = false;
    this.gameState.endGame();
    this.gameTimer.stop();
    
    // Stop the game loop
    this.gameLoop.stop();
    
    console.log('GameEngine stopped');
  }

  /**
   * Pause the game engine
   */
  pause() {
    if (!this.isRunning) return;
    
    this.gameLoop.pause();
    this.gameTimer.pause();
    console.log('GameEngine paused');
  }

  /**
   * Resume the game engine
   */
  resume() {
    if (!this.isRunning) return;
    
    this.gameLoop.resume();
    this.gameTimer.resume();
    console.log('GameEngine resumed');
  }

  /**
   * Update game state and notify all registered callbacks
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Update game timer first
    this.gameTimer.update(deltaTime);
    
    // Update game state timing
    this.gameState.update(deltaTime);

    // Update fear and health systems
    this.fearSystem.update(deltaTime);
    this.healthSystem.update(deltaTime);
    
    // Update inventory system
    this.inventorySystem.update(deltaTime);
    
    // Update event system
    this.eventSystem.update();

    // Check for ending conditions
    if (this.endingSystem.shouldTriggerEnding() && !this.endingSystem.getCurrentEnding()) {
      this.triggerGameEnding();
    }

    // Notify all registered update callbacks
    this.updateCallbacks.forEach(callback => {
      try {
        callback(deltaTime, this.gameState);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  /**
   * Handle player commands
   * @param {string} command - The command to process
   */
  handleCommand(command) {
    if (!this.isRunning || !this.gameState.isAlive) {
      return false;
    }

    const normalizedCommand = command.toLowerCase().trim();
    
    // Record command in game state
    this.gameState.addCommand(normalizedCommand);

    // Check if command responds to active events first
    const activeEvents = this.eventSystem.getActiveEvents();
    for (const event of activeEvents) {
      const response = this.eventSystem.evaluatePlayerResponse(normalizedCommand, event);
      if (response) {
        console.log(`Command "${command}" handled by event system`);
        return true;
      }
    }

    // Check if command is inventory-related
    const inventoryResult = this.inventorySystem.processVoiceCommand(normalizedCommand, {
      location: this.gameState.location,
      fearLevel: this.gameState.fearLevel,
      inventory: this.gameState.inventory
    });
    
    if (inventoryResult.success) {
      console.log(`Command "${command}" handled by inventory system`);
      return true;
    }

    // Check for registered command handlers
    for (const [pattern, handler] of this.commandHandlers) {
      if (normalizedCommand.includes(pattern)) {
        try {
          const result = handler(normalizedCommand, this.gameState);
          if (result) {
            return true; // Command was handled
          }
        } catch (error) {
          console.error(`Error handling command "${command}":`, error);
        }
      }
    }

    // Default response for unrecognized commands
    console.log(`Unrecognized command: ${command}`);
    return false;
  }

  /**
   * Register a callback to be called on each update
   * @param {Function} callback - Function to call with (deltaTime, gameState)
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Register a command handler
   * @param {string} pattern - Command pattern to match
   * @param {Function} handler - Handler function (command, gameState) => boolean
   */
  registerCommandHandler(pattern, handler) {
    this.commandHandlers.set(pattern, handler);
  }

  /**
   * Unregister a command handler
   * @param {string} pattern - Command pattern to remove
   */
  unregisterCommandHandler(pattern) {
    this.commandHandlers.delete(pattern);
  }

  /**
   * Get current game state (read-only)
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * Get fear system instance
   */
  getFearSystem() {
    return this.fearSystem;
  }

  /**
   * Get health system instance
   */
  getHealthSystem() {
    return this.healthSystem;
  }

  /**
   * Get event system instance
   */
  getEventSystem() {
    return this.eventSystem;
  }

  /**
   * Get inventory system instance
   */
  getInventorySystem() {
    return this.inventorySystem;
  }

  /**
   * Get ending system instance
   */
  getEndingSystem() {
    return this.endingSystem;
  }

  /**
   * Check if game is currently running
   */
  isGameRunning() {
    return this.isRunning && this.gameState.gameStarted;
  }

  /**
   * Trigger a game event
   * @param {Object} eventData - Event data to process
   */
  triggerEvent(eventData) {
    if (!this.isRunning) return;

    // Add event to game state history
    this.gameState.addEvent(eventData.id || 'unknown');
    
    // Process event effects using the new systems
    if (eventData.fearEvent) {
      this.fearSystem.triggerFearEvent(eventData.fearEvent.type, {
        intensity: eventData.fearEvent.intensity || 1.0,
        source: eventData.id || 'unknown'
      });
    } else if (eventData.fearDelta) {
      // Legacy support - convert to fear event
      const fearType = eventData.fearDelta > 15 ? 'jump_scare' : 'ambient';
      this.fearSystem.triggerFearEvent(fearType, {
        intensity: Math.abs(eventData.fearDelta) / 15,
        source: eventData.id || 'unknown'
      });
    }
    
    if (eventData.damageEvent) {
      this.healthSystem.applyDamage(eventData.damageEvent.type, {
        amount: eventData.damageEvent.amount,
        source: eventData.id || 'unknown',
        duration: eventData.damageEvent.duration
      });
    } else if (eventData.healthDelta && eventData.healthDelta < 0) {
      // Legacy support - convert to damage event
      this.healthSystem.applyDamage('environmental', {
        amount: Math.abs(eventData.healthDelta),
        source: eventData.id || 'unknown'
      });
    } else if (eventData.healthDelta && eventData.healthDelta > 0) {
      // Healing event
      this.healthSystem.heal(eventData.healthDelta, eventData.id || 'unknown');
    }

    console.log('Event triggered:', eventData.id);
  }

  /**
   * Trigger game ending sequence
   */
  async triggerGameEnding() {
    if (!this.isRunning) return;
    
    try {
      // Stop the game loop
      this.stop();
      
      // Trigger the ending system
      const endingResult = await this.endingSystem.triggerEnding();
      
      console.log('Game ending triggered:', endingResult.ending.title);
      
      // Notify callbacks about game ending
      this.updateCallbacks.forEach(callback => {
        try {
          if (callback.onGameEnding) {
            callback.onGameEnding(endingResult);
          }
        } catch (error) {
          console.error('Error in game ending callback:', error);
        }
      });
      
      return endingResult;
      
    } catch (error) {
      console.error('Error triggering game ending:', error);
    }
  }

  /**
   * Restart the game after an ending
   */
  async restartGame() {
    try {
      // Use ending system's restart functionality
      const restartResult = this.endingSystem.restartGame();
      
      if (restartResult.success) {
        // Reset all systems
        this.reset();
        
        // Brief delay before starting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start the game again
        this.start();
        
        console.log('Game restarted successfully');
        return { success: true, message: 'Game restarted successfully' };
      }
      
      return restartResult;
      
    } catch (error) {
      console.error('Error restarting game:', error);
      return { success: false, message: 'Failed to restart game' };
    }
  }

  /**
   * Reset game to initial state
   */
  reset() {
    this.stop();
    this.gameState = new GameState();
    this.gameTimer = new GameTimer(this.gameState);
    this.fearSystem = new FearSystem(this.gameState);
    this.healthSystem = new HealthSystem(this.gameState);
    this.inventorySystem = new InventorySystem(this.gameState, this.audioManager, this.voiceNarrator);
    this.endingSystem = new EndingSystem(this.gameState, this.audioManager, this.voiceNarrator);
    this.eventSystem.clearEventHistory();
    this.setupTimerEvents();
    this.setupSystemIntegrations();
    console.log('GameEngine reset');
  }

  /**
   * Set up timer event handlers for win/lose conditions and time-based events
   */
  setupTimerEvents() {
    // Register win condition callback
    this.gameTimer.onWinCondition(() => {
      this.gameState.triggerVictory();
      // Ending will be triggered by the update loop check
    });

    // Register hour change callback for atmospheric events
    this.gameTimer.onHourChange((currentHour, previousHour) => {
      console.log(`Hour changed from ${previousHour}:00 to ${currentHour}:00`);
      
      // Trigger hour-specific events
      this.triggerHourlyEvent(currentHour);
    });

    // Register time-based events
    this.registerTimeBasedEvents();
  }

  /**
   * Set up game loop callbacks
   */
  setupGameLoopCallbacks() {
    // Register update callback with the game loop
    this.gameLoop.onUpdate((deltaTime, performanceStats) => {
      // This will call our update method
      // The game loop handles the timing and performance monitoring
    });

    // Register performance monitoring callback
    this.gameLoop.onPostUpdate((deltaTime, performanceStats) => {
      // Check for performance issues and adjust game settings if needed
      if (performanceStats.fps < 30) {
        this.handlePerformanceIssue({
          fps: performanceStats.fps,
          frameTime: performanceStats.averageFrameTime,
          suggestion: 'reduce_effects'
        });
      }
    });

    // Register event processing
    this.gameLoop.registerEventProcessor('game-event', (event) => {
      this.triggerEvent(event.data);
    });

    this.gameLoop.registerEventProcessor('command', (event) => {
      this.handleCommand(event.data.command);
    });
  }

  /**
   * Set up integrations between different systems
   */
  setupSystemIntegrations() {
    // Set up fear system callbacks
    this.fearSystem.onFearChange((changeType, data, fearLevel, fearState) => {
      // Trigger health effects based on extreme fear
      if (fearLevel >= 95 && changeType === 'event') {
        this.healthSystem.applyDamage('fear_induced', { 
          amount: 5, 
          source: 'extreme_fear' 
        });
      }

      // Notify update callbacks about fear changes
      this.updateCallbacks.forEach(callback => {
        try {
          if (callback.onFearChange) {
            callback.onFearChange(changeType, data, fearLevel, fearState);
          }
        } catch (error) {
          console.error('Error in fear change callback:', error);
        }
      });
    });

    // Set up health system callbacks
    this.healthSystem.onHealthChange((changeType, data, healthLevel, healthState) => {
      // Trigger fear effects based on low health
      if (healthLevel <= 20 && changeType === 'damage') {
        this.fearSystem.triggerFearEvent('panic_attack', { 
          intensity: 0.8, 
          source: 'low_health' 
        });
      }

      // Notify update callbacks about health changes
      this.updateCallbacks.forEach(callback => {
        try {
          if (callback.onHealthChange) {
            callback.onHealthChange(changeType, data, healthLevel, healthState);
          }
        } catch (error) {
          console.error('Error in health change callback:', error);
        }
      });
    });
  }

  /**
   * Register time-based events that trigger at specific times
   */
  registerTimeBasedEvents() {
    // Midnight event
    this.gameTimer.registerTimeBasedEvent('midnight', '00:00', () => {
      this.gameState.updateFear(10);
      console.log('Midnight strikes - fear increases');
    });

    // Witching hour event
    this.gameTimer.registerTimeBasedEvent('witching_hour', '03:00', () => {
      this.gameState.updateFear(15);
      console.log('The witching hour - supernatural activity peaks');
    });

    // Dawn approaches event
    this.gameTimer.registerTimeBasedEvent('dawn_approaches', '05:30', () => {
      this.gameState.updateFear(-20);
      console.log('Dawn approaches - hope returns');
    });
  }

  /**
   * Trigger hourly atmospheric events
   * @param {number} hour - Current hour
   */
  triggerHourlyEvent(hour) {
    // Different events based on time of night using the new fear system
    switch (hour) {
      case 0: // Midnight
        this.fearSystem.triggerFearEvent('ambient', { 
          intensity: 0.8, 
          source: 'midnight_hour' 
        });
        break;
      case 1:
        this.fearSystem.triggerFearEvent('whisper', { 
          intensity: 0.6, 
          source: 'late_night' 
        });
        break;
      case 2:
        this.fearSystem.triggerFearEvent('footsteps', { 
          intensity: 1.0, 
          source: 'deep_night' 
        });
        break;
      case 3: // Witching hour
        this.fearSystem.triggerFearEvent('supernatural', { 
          intensity: 1.2, 
          source: 'witching_hour' 
        });
        break;
      case 4:
        this.fearSystem.triggerFearEvent('darkness', { 
          intensity: 0.9, 
          source: 'pre_dawn' 
        });
        break;
      case 5:
        // Dawn approaches - add positive modifier instead of negative fear
        this.fearSystem.addFearModifier('dawn_hope', 0.5, 60000); // 1 minute of reduced fear
        break;
    }
  }

  /**
   * Handle errors with appropriate recovery strategies
   * @param {string} errorType - Type of error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  handleError(errorType, error, context = {}) {
    console.error(`GameEngine ${errorType} error:`, error, context);

    // Implement error recovery strategies
    switch (errorType) {
      case 'game-loop':
        // Try to continue running but log the error
        console.warn('Game loop error, attempting to continue...');
        break;
      
      case 'audio':
        // Disable audio features if they're causing issues
        if (this.audioManager) {
          console.warn('Audio error detected, reducing audio functionality');
          // Could implement audio fallback here
        }
        break;
      
      case 'voice':
        // Disable voice features if they're causing issues
        if (this.voiceNarrator) {
          console.warn('Voice error detected, reducing voice functionality');
          this.voiceNarrator.clearQueue();
        }
        break;
      
      case 'state':
        // Try to recover game state
        console.warn('Game state error, attempting recovery...');
        try {
          this.gameState.validateState();
        } catch (validationError) {
          console.error('Game state validation failed:', validationError);
          // Could trigger a game restart here
        }
        break;
      
      default:
        console.warn(`Unhandled error type: ${errorType}`);
    }

    // Notify update callbacks about the error
    this.updateCallbacks.forEach(callback => {
      try {
        if (callback.onError) {
          callback.onError(errorType, error, context);
        }
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Handle performance issues by adjusting game settings
   * @param {Object} performanceData - Performance issue data
   */
  handlePerformanceIssue(performanceData) {
    console.warn('Performance issue detected:', performanceData);

    const { fps, frameTime, suggestion } = performanceData;

    // Implement performance optimizations based on the issue
    switch (suggestion) {
      case 'reduce_effects':
        // Reduce audio effects frequency
        if (this.audioManager) {
          this.audioManager.adjustVolume('effects', 0.5);
        }
        
        // Reduce event frequency
        if (this.eventSystem) {
          this.eventSystem.setEventFrequency(0.7); // Reduce by 30%
        }
        break;
      
      case 'reduce_quality':
        // Reduce game loop target FPS
        this.gameLoop.setTargetFPS(30);
        
        // Reduce update frequency for non-critical systems
        this.fearSystem.setUpdateFrequency(0.5);
        this.healthSystem.setUpdateFrequency(0.5);
        break;
      
      case 'minimal_mode':
        // Switch to minimal performance mode
        if (this.audioManager) {
          this.audioManager.adjustVolume('ambient', 0.3);
          this.audioManager.adjustVolume('effects', 0.3);
        }
        
        // Disable non-essential features
        this.gameLoop.setFrameSkipping(true);
        break;
    }

    // Notify callbacks about performance adjustments
    this.updateCallbacks.forEach(callback => {
      try {
        if (callback.onPerformanceIssue) {
          callback.onPerformanceIssue(performanceData);
        }
      } catch (error) {
        console.error('Error in performance issue callback:', error);
      }
    });
  }

  /**
   * Queue an event for processing in the game loop
   * @param {Object} eventData - Event data to queue
   */
  queueEvent(eventData) {
    this.gameLoop.queueEvent({
      type: 'game-event',
      data: eventData,
      timestamp: performance.now()
    });
  }

  /**
   * Queue a command for processing in the game loop
   * @param {string} command - Command to queue
   */
  queueCommand(command) {
    this.gameLoop.queueEvent({
      type: 'command',
      data: { command },
      timestamp: performance.now()
    });
  }

  /**
   * Get game engine performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    return {
      gameLoop: this.gameLoop.getPerformanceStats(),
      gameState: {
        updateCount: this.gameState.updateCount || 0,
        eventCount: this.gameState.eventsTriggered?.length || 0,
        commandCount: this.gameState.commandsIssued?.length || 0
      },
      systems: {
        fearSystem: this.fearSystem.getStats?.() || {},
        healthSystem: this.healthSystem.getStats?.() || {},
        eventSystem: this.eventSystem.getStats?.() || {},
        inventorySystem: this.inventorySystem.getStats?.() || {}
      }
    };
  }

  /**
   * Check if game is active and can process updates
   * @returns {boolean} True if game is active
   */
  isGameActive() {
    return this.isRunning && this.gameState.gameStarted && this.gameState.isAlive;
  }

  /**
   * Get comprehensive game status
   * @returns {Object} Game status information
   */
  getGameStatus() {
    return {
      isRunning: this.isRunning,
      isActive: this.isGameActive(),
      gameLoop: this.gameLoop.getStatus(),
      gameState: this.gameState.serialize(),
      performance: this.getPerformanceStats(),
      systems: {
        audio: !!this.audioManager && this.audioManager.isInitialized,
        voice: !!this.voiceNarrator && this.voiceNarrator.isSupported,
        timer: this.gameTimer.isRunning(),
        fear: this.fearSystem.isActive(),
        health: this.healthSystem.isActive(),
        inventory: this.inventorySystem.isActive(),
        events: this.eventSystem.isActive(),
        endings: this.endingSystem.isActive()
      }
    };
  }
}