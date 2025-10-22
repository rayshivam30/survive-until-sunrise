/**
 * GameEngine Integration Tests
 * Tests for the integration between GameEngine and GameTimer
 */

import { GameEngine } from '../GameEngine.js';

// Mock performance.now and Date.now for consistent testing
const mockPerformanceNow = jest.fn();
const mockDateNow = jest.fn();
global.performance = { now: mockPerformanceNow };
global.Date.now = mockDateNow;

describe('GameEngine Timer Integration', () => {
  let gameEngine;
  let mockTime;

  beforeEach(() => {
    mockTime = 1000000;
    mockPerformanceNow.mockReturnValue(mockTime);
    mockDateNow.mockReturnValue(mockTime);
    
    gameEngine = new GameEngine();
  });

  afterEach(() => {
    gameEngine.stop();
    jest.clearAllMocks();
  });

  test('should initialize GameTimer with GameEngine', () => {
    expect(gameEngine.gameTimer).toBeDefined();
    expect(gameEngine.gameTimer.gameState).toBe(gameEngine.gameState);
  });

  test('should start timer when game engine starts', () => {
    gameEngine.start();
    
    expect(gameEngine.gameTimer.isRunning).toBe(true);
    expect(gameEngine.gameState.currentTime).toBe('23:00');
    expect(gameEngine.gameState.gameStarted).toBe(true);
  });

  test('should stop timer when game engine stops', () => {
    gameEngine.start();
    gameEngine.stop();
    
    expect(gameEngine.gameTimer.isRunning).toBe(false);
    expect(gameEngine.gameState.gameStarted).toBe(false);
  });

  test('should update game time through timer', () => {
    gameEngine.start();
    
    // Simulate 2 real minutes elapsed (2 game hours)
    const elapsed = 2 * 60 * 1000;
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    
    gameEngine.update(elapsed);
    
    expect(gameEngine.gameState.currentTime).toBe('01:00'); // 23:00 + 2 hours = 01:00
  });

  test('should trigger win condition at sunrise', () => {
    gameEngine.start();
    
    // Simulate 7 real minutes elapsed to reach sunrise
    const elapsed = 7 * 60 * 1000;
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    
    gameEngine.update(elapsed);
    
    expect(gameEngine.gameState.currentTime).toBe('06:00');
    expect(gameEngine.gameState.gameStarted).toBe(false); // Game should end
    expect(gameEngine.isRunning).toBe(false); // Engine should stop
  });

  test('should trigger time-based fear events', () => {
    gameEngine.start();
    const initialFear = gameEngine.gameState.fearLevel;
    
    // Simulate reaching midnight (1 real minute = 1 game hour)
    const elapsed = 60 * 1000;
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    
    gameEngine.update(elapsed);
    
    expect(gameEngine.gameState.currentTime).toBe('00:00');
    expect(gameEngine.gameState.fearLevel).toBeGreaterThan(initialFear);
  });

  test('should trigger witching hour event', () => {
    gameEngine.start();
    const initialFear = gameEngine.gameState.fearLevel;
    
    // Simulate reaching 3:00 AM (4 real minutes = 4 game hours)
    const elapsed = 4 * 60 * 1000;
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    
    gameEngine.update(elapsed);
    
    expect(gameEngine.gameState.currentTime).toBe('03:00');
    expect(gameEngine.gameState.fearLevel).toBeGreaterThan(initialFear);
  });

  test('should reset timer with game engine', () => {
    gameEngine.start();
    
    // Advance time
    const elapsed = 60 * 1000;
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    gameEngine.update(elapsed);
    
    // Reset
    gameEngine.reset();
    
    expect(gameEngine.gameTimer.isRunning).toBe(false);
    expect(gameEngine.gameState.currentTime).toBe('23:00');
    expect(gameEngine.gameState.gameStarted).toBe(false);
  });

  test('should handle game state updates with timer', () => {
    gameEngine.start();
    
    // Simulate partial time progression
    const elapsed = 30 * 1000; // 30 seconds = 0.5 game hours = 30 game minutes
    mockPerformanceNow.mockReturnValue(mockTime + elapsed);
    mockDateNow.mockReturnValue(mockTime + elapsed);
    
    gameEngine.update(elapsed);
    
    expect(gameEngine.gameState.currentTime).toBe('23:30');
    expect(gameEngine.gameState.realTimeElapsed).toBe(elapsed);
  });
});