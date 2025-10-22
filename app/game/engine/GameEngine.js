/**
 * GameEngine - Core game loop and state management
 * Handles centralized game state, timing, and system coordination
 */

import { GameState } from './GameState.js';
import { GameTimer } from './GameTimer.js';
import { FearSystem } from './FearSystem.js';
import { HealthSystem } from './HealthSystem.js';

export class GameEngine {
  constructor() {
    this.gameState = new GameState();
    this.gameTimer = new GameTimer(this.gameState);
    this.fearSystem = new FearSystem(this.gameState);
    this.healthSystem = new HealthSystem(this.gameState);
    this.isRunning = false;
    this.lastUpdateTime = 0;
    this.updateCallbacks = new Set();
    this.commandHandlers = new Map();
    
    // Set up timer event handlers
    this.setupTimerEvents();
    
    // Set up system integrations
    this.setupSystemIntegrations();
    
    // Bind methods to preserve context
    this.update = this.update.bind(this);
    this.handleCommand = this.handleCommand.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Start the game engine and begin the game loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameState.startGame();
    this.gameTimer.start();
    this.lastUpdateTime = performance.now();
    
    // Start the game loop
    this.gameLoop();
    
    console.log('GameEngine started');
  }

  /**
   * Stop the game engine
   */
  stop() {
    this.isRunning = false;
    this.gameState.endGame();
    this.gameTimer.stop();
    console.log('GameEngine stopped');
  }

  /**
   * Main game loop - runs continuously while game is active
   */
  gameLoop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Update game state
    this.update(deltaTime);

    // Continue the loop
    requestAnimationFrame(() => this.gameLoop());
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
   * Reset game to initial state
   */
  reset() {
    this.stop();
    this.gameState = new GameState();
    this.gameTimer = new GameTimer(this.gameState);
    this.fearSystem = new FearSystem(this.gameState);
    this.healthSystem = new HealthSystem(this.gameState);
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
      this.stop();
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
}