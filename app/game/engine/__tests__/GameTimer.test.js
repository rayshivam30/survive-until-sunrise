/**
 * GameTimer Tests
 * Tests for the game timer functionality including time conversion and event triggers
 */

import { GameTimer } from '../GameTimer.js';
import { GameState } from '../GameState.js';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow };

// Mock Date.now for consistent testing
const mockDateNow = jest.fn();
global.Date.now = mockDateNow;

describe('GameTimer', () => {
  let gameState;
  let gameTimer;
  let mockTime;

  beforeEach(() => {
    mockTime = 1000000; // Starting mock time
    mockPerformanceNow.mockReturnValue(mockTime);
    mockDateNow.mockReturnValue(mockTime);
    
    gameState = new GameState();
    gameTimer = new GameTimer(gameState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Timer Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(gameTimer.isRunning).toBe(false);
      expect(gameTimer.isPaused).toBe(false);
      expect(gameTimer.REAL_TO_GAME_RATIO).toBe(60);
      expect(gameTimer.GAME_START_HOUR).toBe(23);
      expect(gameTimer.GAME_END_HOUR).toBe(6);
    });

    test('should start timer correctly', () => {
      gameTimer.start();
      
      expect(gameTimer.isRunning).toBe(true);
      expect(gameTimer.startTime).toBe(mockTime);
      expect(gameState.currentTime).toBe('23:00');
    });

    test('should stop timer correctly', () => {
      gameTimer.start();
      gameTimer.stop();
      
      expect(gameTimer.isRunning).toBe(false);
      expect(gameTimer.startTime).toBe(null);
    });
  });

  describe('Time Conversion', () => {
    test('should convert real time to game time correctly', () => {
      const realTimeElapsed = 60 * 1000; // 1 real minute
      const gameTimeData = gameTimer.calculateGameTime(realTimeElapsed);
      
      expect(gameTimeData.hour).toBe(0); // 23 + 1 hour = 0 (midnight)
      expect(gameTimeData.minute).toBe(0);
      expect(gameTimeData.formattedTime).toBe('00:00');
    });

    test('should handle multiple hours correctly', () => {
      const realTimeElapsed = 3 * 60 * 1000; // 3 real minutes = 3 game hours
      const gameTimeData = gameTimer.calculateGameTime(realTimeElapsed);
      
      expect(gameTimeData.hour).toBe(2); // 23 + 3 = 26, 26 - 24 = 2 AM
      expect(gameTimeData.minute).toBe(0);
      expect(gameTimeData.formattedTime).toBe('02:00');
    });

    test('should handle partial hours correctly', () => {
      const realTimeElapsed = 90 * 1000; // 1.5 real minutes = 1.5 game hours
      const gameTimeData = gameTimer.calculateGameTime(realTimeElapsed);
      
      expect(gameTimeData.hour).toBe(0); // 23 + 1 = 0 (midnight)
      expect(gameTimeData.minute).toBe(30); // 0.5 * 60 = 30 minutes
      expect(gameTimeData.formattedTime).toBe('00:30');
    });

    test('should calculate sunrise time correctly', () => {
      const realTimeElapsed = 7 * 60 * 1000; // 7 real minutes = 7 game hours
      const gameTimeData = gameTimer.calculateGameTime(realTimeElapsed);
      
      expect(gameTimeData.hour).toBe(6); // 23 + 7 = 30, 30 - 24 = 6 AM
      expect(gameTimeData.minute).toBe(0);
      expect(gameTimeData.formattedTime).toBe('06:00');
    });
  });

  describe('Time Until Sunrise', () => {
    test('should calculate time until sunrise at game start', () => {
      gameTimer.start();
      const timeUntilSunrise = gameTimer.getTimeUntilSunrise();
      
      expect(timeUntilSunrise.hours).toBe(7);
      expect(timeUntilSunrise.minutes).toBe(0);
      expect(timeUntilSunrise.totalMinutes).toBe(420); // 7 hours * 60 minutes
      expect(timeUntilSunrise.percentage).toBe(0);
    });

    test('should calculate time until sunrise at midnight', () => {
      gameTimer.start();
      
      // Simulate 1 real minute elapsed (1 game hour)
      mockDateNow.mockReturnValue(mockTime + 60 * 1000);
      gameTimer.update(60 * 1000);
      
      const timeUntilSunrise = gameTimer.getTimeUntilSunrise();
      
      expect(timeUntilSunrise.hours).toBe(6);
      expect(timeUntilSunrise.minutes).toBe(0);
      expect(timeUntilSunrise.totalMinutes).toBe(360); // 6 hours * 60 minutes
    });

    test('should calculate progress percentage correctly', () => {
      gameTimer.start();
      
      // Simulate 3.5 real minutes elapsed (3.5 game hours)
      const elapsed = 3.5 * 60 * 1000;
      mockDateNow.mockReturnValue(mockTime + elapsed);
      gameTimer.update(elapsed);
      
      const timeUntilSunrise = gameTimer.getTimeUntilSunrise();
      
      // 3.5 hours out of 7 total = 50%
      expect(Math.round(timeUntilSunrise.percentage)).toBe(50);
    });
  });

  describe('Time-Based Events', () => {
    test('should register and trigger time-based events', () => {
      const mockCallback = jest.fn();
      gameTimer.registerTimeBasedEvent('test_event', '00:00', mockCallback);
      
      gameTimer.start();
      
      // Simulate 1 real minute elapsed to reach midnight
      mockDateNow.mockReturnValue(mockTime + 60 * 1000);
      gameTimer.update(60 * 1000);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should not trigger same event multiple times', () => {
      const mockCallback = jest.fn();
      gameTimer.registerTimeBasedEvent('test_event', '00:00', mockCallback);
      
      gameTimer.start();
      
      // Simulate reaching midnight
      mockDateNow.mockReturnValue(mockTime + 60 * 1000);
      gameTimer.update(60 * 1000);
      
      // Update again at same time
      gameTimer.update(1000);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should unregister events correctly', () => {
      const mockCallback = jest.fn();
      gameTimer.registerTimeBasedEvent('test_event', '00:00', mockCallback);
      gameTimer.unregisterTimeBasedEvent('test_event');
      
      gameTimer.start();
      
      // Simulate reaching midnight
      mockDateNow.mockReturnValue(mockTime + 60 * 1000);
      gameTimer.update(60 * 1000);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Win Condition', () => {
    test('should trigger win condition at sunrise', () => {
      const mockWinCallback = jest.fn();
      gameTimer.onWinCondition(mockWinCallback);
      
      gameTimer.start();
      
      // Simulate 7 real minutes elapsed to reach 6:00 AM
      mockDateNow.mockReturnValue(mockTime + 7 * 60 * 1000);
      gameTimer.update(7 * 60 * 1000);
      
      expect(mockWinCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pause and Resume', () => {
    test('should pause and resume correctly', () => {
      gameTimer.start();
      
      // Advance time
      mockDateNow.mockReturnValue(mockTime + 30 * 1000);
      gameTimer.update(30 * 1000);
      
      // Pause
      gameTimer.pause();
      expect(gameTimer.isPaused).toBe(true);
      
      // Advance mock time while paused
      mockDateNow.mockReturnValue(mockTime + 90 * 1000);
      
      // Resume
      gameTimer.resume();
      expect(gameTimer.isPaused).toBe(false);
      
      // The pause duration should be accounted for
      const gameTimeData = gameTimer.calculateGameTime(30 * 1000); // Only 30s should count
      expect(gameTimeData.minute).toBe(30); // 0.5 * 60 = 30 minutes
    });
  });

  describe('Timer Status', () => {
    test('should return correct status', () => {
      gameTimer.start();
      
      const status = gameTimer.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.isPaused).toBe(false);
      expect(status.currentTime).toBe('23:00');
      expect(status.realTimeElapsed).toBe(0);
      expect(status.gameProgress).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should reset timer correctly', () => {
      gameTimer.start();
      gameTimer.registerTimeBasedEvent('test', '00:00', jest.fn());
      
      gameTimer.reset();
      
      expect(gameTimer.isRunning).toBe(false);
      expect(gameTimer.timeBasedEvents.size).toBe(0);
      expect(gameTimer.triggeredEvents.size).toBe(0);
    });
  });
});