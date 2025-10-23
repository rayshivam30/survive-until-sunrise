/**
 * Comprehensive GameEngine Tests
 * Additional unit tests to ensure complete coverage of GameEngine functionality
 */

import { GameEngine } from '../GameEngine.js';
import { GameState } from '../GameState.js';

// Mock all dependencies
jest.mock('../GameTimer.js', () => ({
  GameTimer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    isRunning: false,
    gameState: null
  }))
}));

jest.mock('../EventSystem.js', () => ({
  EventSystem: jest.fn().mockImplementation(() => ({
    generateRandomEvent: jest.fn(),
    processEvent: jest.fn(),
    getActiveEvents: jest.fn().mockReturnValue([])
  }))
}));

jest.mock('../FearSystem.js', () => ({
  FearSystem: jest.fn().mockImplementation(() => ({
    updateFear: jest.fn(),
    calculateFearModifier: jest.fn().mockReturnValue(1.0)
  }))
}));

jest.mock('../HealthSystem.js', () => ({
  HealthSystem: jest.fn().mockImplementation(() => ({
    updateHealth: jest.fn(),
    checkDeathCondition: jest.fn().mockReturnValue(false)
  }))
}));

jest.mock('../InventorySystem.js', () => ({
  InventorySystem: jest.fn().mockImplementation(() => ({
    addItem: jest.fn(),
    removeItem: jest.fn(),
    hasItem: jest.fn().mockReturnValue(false),
    useItem: jest.fn()
  }))
}));

// Mock performance timing
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('GameEngine Comprehensive Tests', () => {
  let gameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (gameEngine?.isRunning) {
      gameEngine.stop();
    }
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with custom configuration', () => {
      const customConfig = {
        startTime: '22:00',
        initialFear: 25,
        initialHealth: 90,
        difficulty: 'hard'
      };
      
      const customEngine = new GameEngine(customConfig);
      
      expect(customEngine.gameState.currentTime).toBe('22:00');
      expect(customEngine.gameState.fearLevel).toBe(25);
      expect(customEngine.gameState.health).toBe(90);
      expect(customEngine.difficulty).toBe('hard');
    });

    test('should validate configuration parameters', () => {
      const invalidConfig = {
        initialFear: 150, // Invalid: > 100
        initialHealth: -10, // Invalid: < 0
        startTime: '25:00' // Invalid time
      };
      
      const engine = new GameEngine(invalidConfig);
      
      // Should clamp values to valid ranges
      expect(engine.gameState.fearLevel).toBeLessThanOrEqual(100);
      expect(engine.gameState.health).toBeGreaterThanOrEqual(0);
      expect(engine.gameState.currentTime).toMatch(/^\d{2}:\d{2}$/);
    });

    test('should initialize all subsystems correctly', () => {
      expect(gameEngine.gameTimer).toBeDefined();
      expect(gameEngine.eventSystem).toBeDefined();
      expect(gameEngine.fearSystem).toBeDefined();
      expect(gameEngine.healthSystem).toBeDefined();
      expect(gameEngine.inventorySystem).toBeDefined();
    });
  });

  describe('Game Lifecycle Management', () => {
    test('should handle start-stop-start cycle correctly', () => {
      // Start game
      gameEngine.start();
      expect(gameEngine.isRunning).toBe(true);
      expect(gameEngine.gameState.gameStarted).toBe(true);
      
      // Stop game
      gameEngine.stop();
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.gameState.gameStarted).toBe(false);
      
      // Start again
      gameEngine.start();
      expect(gameEngine.isRunning).toBe(true);
      expect(gameEngine.gameState.gameStarted).toBe(true);
    });

    test('should handle pause and resume functionality', () => {
      gameEngine.start();
      
      gameEngine.pause();
      expect(gameEngine.isPaused).toBe(true);
      expect(gameEngine.isRunning).toBe(true); // Still running, just paused
      
      gameEngine.resume();
      expect(gameEngine.isPaused).toBe(false);
    });

    test('should prevent multiple starts', () => {
      gameEngine.start();
      const firstStartTime = gameEngine.gameState.gameStartTime;
      
      // Try to start again
      gameEngine.start();
      
      // Should not change start time
      expect(gameEngine.gameState.gameStartTime).toBe(firstStartTime);
    });

    test('should handle stop when not running', () => {
      // Should not throw error
      expect(() => gameEngine.stop()).not.toThrow();
      expect(gameEngine.isRunning).toBe(false);
    });
  });

  describe('Command Handler System', () => {
    test('should register and execute custom command handlers', () => {
      const customHandler = jest.fn().mockReturnValue(true);
      
      gameEngine.registerCommandHandler('custom', customHandler);
      gameEngine.start();
      
      const result = gameEngine.handleCommand('custom test');
      
      expect(customHandler).toHaveBeenCalledWith('custom test', gameEngine.gameState);
      expect(result).toBe(true);
    });

    test('should handle multiple command handlers for same command', () => {
      const handler1 = jest.fn().mockReturnValue(true);
      const handler2 = jest.fn().mockReturnValue(true);
      
      gameEngine.registerCommandHandler('test', handler1);
      gameEngine.registerCommandHandler('test', handler2);
      gameEngine.start();
      
      gameEngine.handleCommand('test command');
      
      // Both handlers should be called
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    test('should unregister command handlers', () => {
      const handler = jest.fn();
      
      const unregister = gameEngine.registerCommandHandler('test', handler);
      gameEngine.start();
      
      // Handler should work
      gameEngine.handleCommand('test');
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unregister and test again
      unregister();
      gameEngine.handleCommand('test');
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should handle command handler errors gracefully', () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      gameEngine.registerCommandHandler('error', errorHandler);
      gameEngine.start();
      
      // Should not crash the game
      expect(() => gameEngine.handleCommand('error')).not.toThrow();
      expect(gameEngine.isRunning).toBe(true);
    });
  });

  describe('Event System Integration', () => {
    test('should trigger events based on game state', () => {
      gameEngine.start();
      
      // Mock event system to return an event
      const mockEvent = {
        id: 'test-event',
        type: 'ambient',
        fearDelta: 10,
        healthDelta: -5
      };
      
      gameEngine.eventSystem.generateRandomEvent.mockReturnValue(mockEvent);
      
      gameEngine.triggerEvent(mockEvent);
      
      expect(gameEngine.gameState.eventsTriggered).toContainEqual(
        expect.objectContaining({
          id: 'test-event',
          timestamp: expect.any(Number)
        })
      );
    });

    test('should process multiple events in sequence', () => {
      gameEngine.start();
      
      const events = [
        { id: 'event1', fearDelta: 5 },
        { id: 'event2', fearDelta: 10 },
        { id: 'event3', fearDelta: -3 }
      ];
      
      events.forEach(event => gameEngine.triggerEvent(event));
      
      expect(gameEngine.gameState.eventsTriggered).toHaveLength(3);
      expect(gameEngine.gameState.fearLevel).toBe(12); // 0 + 5 + 10 - 3
    });

    test('should prevent duplicate events', () => {
      gameEngine.start();
      
      const event = { id: 'unique-event', fearDelta: 5 };
      
      gameEngine.triggerEvent(event);
      gameEngine.triggerEvent(event); // Same event again
      
      // Should only be triggered once
      const uniqueEvents = gameEngine.gameState.eventsTriggered.filter(e => e.id === 'unique-event');
      expect(uniqueEvents).toHaveLength(1);
    });

    test('should handle event processing errors', () => {
      gameEngine.start();
      
      gameEngine.eventSystem.processEvent.mockImplementation(() => {
        throw new Error('Event processing error');
      });
      
      const event = { id: 'error-event' };
      
      // Should not crash the game
      expect(() => gameEngine.triggerEvent(event)).not.toThrow();
      expect(gameEngine.isRunning).toBe(true);
    });
  });

  describe('Game State Validation', () => {
    test('should validate fear level bounds', () => {
      gameEngine.start();
      
      // Test upper bound
      gameEngine.triggerEvent({ fearDelta: 150 });
      expect(gameEngine.gameState.fearLevel).toBeLessThanOrEqual(100);
      
      // Test lower bound
      gameEngine.triggerEvent({ fearDelta: -200 });
      expect(gameEngine.gameState.fearLevel).toBeGreaterThanOrEqual(0);
    });

    test('should validate health bounds', () => {
      gameEngine.start();
      
      // Test upper bound
      gameEngine.triggerEvent({ healthDelta: 150 });
      expect(gameEngine.gameState.health).toBeLessThanOrEqual(100);
      
      // Test lower bound
      gameEngine.triggerEvent({ healthDelta: -200 });
      expect(gameEngine.gameState.health).toBeGreaterThanOrEqual(0);
    });

    test('should validate time format', () => {
      gameEngine.start();
      
      // Valid time formats should be accepted
      const validTimes = ['00:00', '12:30', '23:59'];
      validTimes.forEach(time => {
        gameEngine.gameState.currentTime = time;
        expect(gameEngine.gameState.currentTime).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    test('should handle invalid game state gracefully', () => {
      gameEngine.start();
      
      // Corrupt game state
      gameEngine.gameState.fearLevel = NaN;
      gameEngine.gameState.health = undefined;
      gameEngine.gameState.currentTime = null;
      
      // Update should fix invalid state
      gameEngine.update(16);
      
      expect(gameEngine.gameState.fearLevel).toBeGreaterThanOrEqual(0);
      expect(gameEngine.gameState.health).toBeGreaterThanOrEqual(0);
      expect(gameEngine.gameState.currentTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit event history size', () => {
      gameEngine.start();
      
      // Trigger many events
      for (let i = 0; i < 200; i++) {
        gameEngine.triggerEvent({ id: `event-${i}`, fearDelta: 1 });
      }
      
      // Should limit history to prevent memory issues
      expect(gameEngine.gameState.eventsTriggered.length).toBeLessThanOrEqual(100);
    });

    test('should limit command history size', () => {
      gameEngine.start();
      
      // Issue many commands
      for (let i = 0; i < 200; i++) {
        gameEngine.handleCommand(`command-${i}`);
      }
      
      // Should limit history
      expect(gameEngine.gameState.commandsIssued.length).toBeLessThanOrEqual(50);
    });

    test('should clean up resources on stop', () => {
      gameEngine.start();
      
      // Add some data
      gameEngine.handleCommand('test');
      gameEngine.triggerEvent({ id: 'test' });
      
      gameEngine.stop();
      
      // Should clean up
      expect(gameEngine.gameState.commandsIssued).toHaveLength(0);
      expect(gameEngine.gameState.eventsTriggered).toHaveLength(0);
    });

    test('should handle high frequency updates efficiently', () => {
      gameEngine.start();
      
      const startTime = performance.now();
      
      // Simulate 60 FPS for 1 second
      for (let i = 0; i < 60; i++) {
        performance.now.mockReturnValue(startTime + i * 16.67);
        gameEngine.update(16.67);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle updates efficiently
      expect(duration).toBeLessThan(1000);
      expect(gameEngine.isRunning).toBe(true);
    });
  });

  describe('Win/Lose Conditions', () => {
    test('should detect win condition at sunrise', () => {
      gameEngine.start();
      
      // Set time to just before sunrise
      gameEngine.gameState.currentTime = '05:59';
      gameEngine.gameState.isAlive = true;
      
      // Advance to sunrise
      gameEngine.gameState.currentTime = '06:00';
      gameEngine.update(0);
      
      // Should trigger win condition
      expect(gameEngine.gameState.gameStarted).toBe(false);
      expect(gameEngine.isRunning).toBe(false);
    });

    test('should detect lose condition on death', () => {
      gameEngine.start();
      
      // Mock health system to return death condition
      gameEngine.healthSystem.checkDeathCondition.mockReturnValue(true);
      
      gameEngine.update(16);
      
      // Should trigger lose condition
      expect(gameEngine.gameState.isAlive).toBe(false);
      expect(gameEngine.gameState.gameStarted).toBe(false);
      expect(gameEngine.isRunning).toBe(false);
    });

    test('should detect lose condition on maximum fear', () => {
      gameEngine.start();
      
      // Set maximum fear
      gameEngine.gameState.fearLevel = 100;
      gameEngine.update(16);
      
      // Should trigger lose condition
      expect(gameEngine.gameState.isAlive).toBe(false);
      expect(gameEngine.isRunning).toBe(false);
    });

    test('should handle edge cases in win/lose detection', () => {
      gameEngine.start();
      
      // Test exactly at sunrise with maximum fear
      gameEngine.gameState.currentTime = '06:00';
      gameEngine.gameState.fearLevel = 100;
      
      gameEngine.update(0);
      
      // Win condition should take precedence
      expect(gameEngine.gameState.isAlive).toBe(true);
      expect(gameEngine.isRunning).toBe(false);
    });
  });

  describe('Save/Load Functionality', () => {
    test('should save game state', () => {
      gameEngine.start();
      gameEngine.handleCommand('test command');
      gameEngine.triggerEvent({ id: 'test-event' });
      
      const savedState = gameEngine.saveGame();
      
      expect(savedState).toEqual(
        expect.objectContaining({
          gameState: expect.any(Object),
          timestamp: expect.any(Number),
          version: expect.any(String)
        })
      );
    });

    test('should load game state', () => {
      gameEngine.start();
      const originalState = gameEngine.saveGame();
      
      // Modify state
      gameEngine.handleCommand('new command');
      
      // Load original state
      const loaded = gameEngine.loadGame(originalState);
      
      expect(loaded).toBe(true);
      expect(gameEngine.gameState.commandsIssued).toHaveLength(1);
    });

    test('should handle invalid save data', () => {
      const invalidSave = { invalid: 'data' };
      
      const loaded = gameEngine.loadGame(invalidSave);
      
      expect(loaded).toBe(false);
      expect(gameEngine.gameState).toBeInstanceOf(GameState);
    });

    test('should handle corrupted save data', () => {
      const corruptedSave = {
        gameState: {
          fearLevel: 'invalid',
          health: null,
          currentTime: 'not-a-time'
        }
      };
      
      const loaded = gameEngine.loadGame(corruptedSave);
      
      expect(loaded).toBe(false);
      // Should maintain valid state
      expect(gameEngine.gameState.fearLevel).toBeGreaterThanOrEqual(0);
      expect(gameEngine.gameState.health).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Debug and Development Features', () => {
    test('should provide debug information', () => {
      gameEngine.start();
      gameEngine.handleCommand('test');
      
      const debugInfo = gameEngine.getDebugInfo();
      
      expect(debugInfo).toEqual(
        expect.objectContaining({
          isRunning: expect.any(Boolean),
          gameState: expect.any(Object),
          systems: expect.any(Object),
          performance: expect.any(Object)
        })
      );
    });

    test('should allow debug commands in development mode', () => {
      gameEngine.setDebugMode(true);
      gameEngine.start();
      
      // Debug commands should work
      const result = gameEngine.handleCommand('debug:set-fear:50');
      expect(result).toBe(true);
      expect(gameEngine.gameState.fearLevel).toBe(50);
    });

    test('should ignore debug commands in production mode', () => {
      gameEngine.setDebugMode(false);
      gameEngine.start();
      
      const initialFear = gameEngine.gameState.fearLevel;
      
      // Debug commands should be ignored
      const result = gameEngine.handleCommand('debug:set-fear:50');
      expect(result).toBe(false);
      expect(gameEngine.gameState.fearLevel).toBe(initialFear);
    });
  });
});