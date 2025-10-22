/**
 * GameEngine - Core game loop and state management
 * Handles centralized game state, timing, and system coordination
 */

import { GameState } from './GameState.js';
import { GameTimer } from './GameTimer.js';

export class GameEngine {
  constructor() {
    this.gameState = new GameState();
    this.gameTimer = new GameTimer(this.gameState);
    this.isRunning = false;
    this.lastUpdateTime = 0;
    this.updateCallbacks = new Set();
    this.commandHandlers = new Map();
    
    // Set up timer event handlers
    this.setupTimerEvents();
    
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
    
    // Process event effects
    if (eventData.fearDelta) {
      this.gameState.updateFear(eventData.fearDelta);
    }
    
    if (eventData.healthDelta) {
      this.gameState.updateHealth(eventData.healthDelta);
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
    this.setupTimerEvents();
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
    // Different events based on time of night
    switch (hour) {
      case 0: // Midnight
        this.gameState.updateFear(5);
        break;
      case 1:
        this.gameState.updateFear(3);
        break;
      case 2:
        this.gameState.updateFear(7);
        break;
      case 3: // Witching hour
        this.gameState.updateFear(10);
        break;
      case 4:
        this.gameState.updateFear(5);
        break;
      case 5:
        this.gameState.updateFear(-5); // Fear starts to decrease as dawn approaches
        break;
    }
  }
}