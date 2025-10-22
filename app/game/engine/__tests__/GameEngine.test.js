/**
 * GameEngine Tests
 * Basic unit tests to verify core functionality
 */

import { GameEngine } from '../GameEngine.js';
import { GameState } from '../GameState.js';

// Mock performance.now for consistent testing
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

describe('GameEngine', () => {
  let gameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (gameEngine.isRunning) {
      gameEngine.stop();
    }
  });

  test('should initialize with default state', () => {
    expect(gameEngine.isRunning).toBe(false);
    expect(gameEngine.gameState).toBeInstanceOf(GameState);
    expect(gameEngine.gameState.gameStarted).toBe(false);
  });

  test('should start and stop game correctly', () => {
    gameEngine.start();
    expect(gameEngine.isRunning).toBe(true);
    expect(gameEngine.gameState.gameStarted).toBe(true);

    gameEngine.stop();
    expect(gameEngine.isRunning).toBe(false);
    expect(gameEngine.gameState.gameStarted).toBe(false);
  });

  test('should handle commands when running', () => {
    gameEngine.start();
    
    const result = gameEngine.handleCommand('test command');
    expect(gameEngine.gameState.commandsIssued).toHaveLength(1);
    expect(gameEngine.gameState.commandsIssued[0].command).toBe('test command');
  });

  test('should not handle commands when not running', () => {
    const result = gameEngine.handleCommand('test command');
    expect(result).toBe(false);
    expect(gameEngine.gameState.commandsIssued).toHaveLength(0);
  });

  test('should register and execute command handlers', () => {
    const mockHandler = jest.fn(() => true);
    gameEngine.registerCommandHandler('test', mockHandler);
    gameEngine.start();

    gameEngine.handleCommand('test command');
    expect(mockHandler).toHaveBeenCalledWith('test command', gameEngine.gameState);
  });

  test('should trigger events correctly', () => {
    gameEngine.start();
    
    const eventData = {
      id: 'test-event',
      fearDelta: 10,
      healthDelta: -5
    };

    const initialFear = gameEngine.gameState.fearLevel;
    const initialHealth = gameEngine.gameState.health;

    gameEngine.triggerEvent(eventData);

    expect(gameEngine.gameState.fearLevel).toBe(initialFear + 10);
    expect(gameEngine.gameState.health).toBe(initialHealth - 5);
    expect(gameEngine.gameState.eventsTriggered).toHaveLength(1);
  });

  test('should reset to initial state', () => {
    gameEngine.start();
    gameEngine.handleCommand('test');
    gameEngine.gameState.updateFear(50);

    gameEngine.reset();

    expect(gameEngine.isRunning).toBe(false);
    expect(gameEngine.gameState.fearLevel).toBe(0);
    expect(gameEngine.gameState.commandsIssued).toHaveLength(0);
  });
});