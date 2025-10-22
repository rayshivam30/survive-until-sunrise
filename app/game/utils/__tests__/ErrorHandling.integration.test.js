/**
 * @jest-environment jsdom
 */

import { VoiceErrorHandler } from '../VoiceErrorHandler.js';
import AudioErrorHandler from '../AudioErrorHandler.js';
import { GameStateManager } from '../GameStateManager.js';
import { BrowserCompatibility } from '../BrowserCompatibility.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Error Handling Integration', () => {
  let voiceErrorHandler;
  let audioErrorHandler;
  let gameStateManager;
  let browserCompatibility;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    voiceErrorHandler = new VoiceErrorHandler();
    audioErrorHandler = new AudioErrorHandler();
    gameStateManager = new GameStateManager(null, { autoSaveInterval: 0 });
    browserCompatibility = new BrowserCompatibility();
  });

  afterEach(() => {
    if (gameStateManager) {
      gameStateManager.destroy();
    }
  });

  describe('Voice Error Handling Integration', () => {
    test('should handle voice errors with fallback activation', () => {
      const fallbackCallback = jest.fn();
      const retryCallback = jest.fn();

      const errorResult = voiceErrorHandler.handleError(
        {
          type: 'permission-denied',
          message: 'Microphone permission denied',
          originalTranscript: 'look around'
        },
        fallbackCallback,
        retryCallback
      );

      expect(errorResult.type).toBe('permission-denied');
      expect(errorResult.severity).toBe('critical');
      expect(errorResult.shouldActivateFallback).toBe(true);
      expect(fallbackCallback).toHaveBeenCalled();
    });

    test('should handle network errors with retry logic', () => {
      const fallbackCallback = jest.fn();
      const retryCallback = jest.fn();

      const errorResult = voiceErrorHandler.handleError(
        {
          type: 'network',
          message: 'Network connection failed',
          originalTranscript: 'open door'
        },
        fallbackCallback,
        retryCallback
      );

      expect(errorResult.type).toBe('network');
      expect(errorResult.canRetry).toBe(true);
      expect(retryCallback).not.toHaveBeenCalled(); // Retry is scheduled, not immediate
    });

    test('should provide error statistics', () => {
      // Generate some errors
      voiceErrorHandler.handleError({ type: 'permission-denied', message: 'Test error 1' });
      voiceErrorHandler.handleError({ type: 'network', message: 'Test error 2' });
      voiceErrorHandler.handleError({ type: 'no-match', message: 'Test error 3' });

      const stats = voiceErrorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType['permission-denied']).toBe(1);
      expect(stats.errorsByType['network']).toBe(1);
      expect(stats.errorsByType['no-match']).toBe(1);
    });
  });

  describe('Audio Error Handling Integration', () => {
    test('should handle audio initialization errors', () => {
      const mockGameEngine = {
        notifyAudioIssue: jest.fn()
      };
      
      audioErrorHandler.gameEngine = mockGameEngine;
      
      audioErrorHandler.handleAudioError(
        'initialization',
        new Error('Audio context failed'),
        { component: 'AudioManager' }
      );

      expect(audioErrorHandler.fallbacksEnabled.silentMode).toBe(true);
      expect(mockGameEngine.notifyAudioIssue).toHaveBeenCalledWith(
        'Audio system unavailable - running in silent mode'
      );
    });

    test('should enable visual effects fallback for sound effects', () => {
      audioErrorHandler.handleAudioError(
        'effect_playback',
        new Error('Sound effect failed'),
        { soundKey: 'footsteps' }
      );

      expect(audioErrorHandler.fallbacksEnabled.visualEffects).toBe(true);
    });

    test('should provide error statistics', () => {
      audioErrorHandler.handleAudioError('initialization', new Error('Init failed'));
      audioErrorHandler.handleAudioError('ambient_playback', new Error('Ambient failed'));
      
      const stats = audioErrorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType.initialization).toBe(1);
      expect(stats.errorsByType.ambient_playback).toBe(1);
    });
  });

  describe('Game State Management Integration', () => {
    test('should save and load game state successfully', async () => {
      const gameState = {
        currentTime: '01:30',
        fearLevel: 45,
        health: 75,
        isAlive: true,
        inventory: ['flashlight']
      };

      // Ensure storage is available
      gameStateManager.storageAvailable = true;

      // Save checkpoint
      const saveResult = await gameStateManager.saveCheckpoint(gameState, 'test');
      expect(saveResult).toBe(true);

      // Mock the stored data for loading
      const storedCheckpoint = {
        gameState: JSON.stringify(gameState),
        metadata: {
          timestamp: Date.now(),
          type: 'test',
          compressed: false
        },
        checksum: gameStateManager.calculateChecksum(JSON.stringify(gameState))
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedCheckpoint));

      // Load checkpoint
      const loadResult = await gameStateManager.loadCheckpoint();
      expect(loadResult).toEqual(gameState);
    });

    test('should handle storage errors gracefully', async () => {
      const mockGameEngine = {
        notifyError: jest.fn()
      };
      
      const manager = new GameStateManager(mockGameEngine, { 
        autoSaveInterval: 0,
        storageKey: 'test-error'
      });

      // Ensure storage is initially available
      manager.storageAvailable = true;

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const gameState = {
        currentTime: '02:00',
        fearLevel: 60,
        health: 50,
        isAlive: true
      };

      const result = await manager.saveCheckpoint(gameState);
      
      expect(result).toBe(false);
      expect(mockGameEngine.notifyError).toHaveBeenCalledWith(
        'save_failed',
        expect.objectContaining({
          error: 'Storage full',
          canRetry: true
        })
      );

      manager.destroy();
    });

    test('should provide checkpoint statistics', () => {
      const stats = gameStateManager.getCheckpointStats();
      
      expect(stats).toHaveProperty('totalCheckpoints');
      expect(stats).toHaveProperty('storageAvailable');
      expect(stats).toHaveProperty('autoSaveActive');
      expect(typeof stats.storageAvailable).toBe('boolean');
    });
  });

  describe('Browser Compatibility Integration', () => {
    test('should check browser compatibility', () => {
      const results = browserCompatibility.checkCompatibility();
      
      expect(results).toHaveProperty('overall');
      expect(results).toHaveProperty('score');
      expect(results).toHaveProperty('features');
      expect(results).toHaveProperty('browserInfo');
      expect(results).toHaveProperty('recommendations');
      expect(results).toHaveProperty('fallbacks');
    });

    test('should generate recommendations for poor compatibility', () => {
      const mockResults = {
        overall: 'poor',
        features: {
          https: { supported: false },
          speechRecognition: { supported: false },
          localStorage: { supported: false },
          audioContext: { supported: false }
        }
      };

      const recommendations = browserCompatibility.generateRecommendations(mockResults);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'browser')).toBe(true);
    });

    test('should generate fallback strategies', () => {
      const mockResults = {
        features: {
          speechRecognition: { supported: false },
          speechSynthesis: { supported: false },
          audioContext: { supported: false },
          localStorage: { supported: true } // Add localStorage to avoid undefined error
        }
      };

      const fallbacks = browserCompatibility.generateFallbacks(mockResults);
      
      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.feature === 'voice-input')).toBe(true);
      expect(fallbacks.some(f => f.feature === 'voice-narration')).toBe(true);
    });
  });

  describe('Cross-System Error Handling', () => {
    test('should coordinate error handling across systems', async () => {
      // Simulate a scenario where multiple systems encounter errors
      const mockGameEngine = {
        notifyError: jest.fn(),
        notifyAudioIssue: jest.fn(),
        enableVisualEffects: jest.fn(),
        enableTextNarration: jest.fn()
      };

      // Set up systems with game engine
      audioErrorHandler.gameEngine = mockGameEngine;
      const stateManager = new GameStateManager(mockGameEngine, { autoSaveInterval: 0 });
      
      // Ensure storage is available initially
      stateManager.storageAvailable = true;

      // Simulate voice error
      const voiceResult = voiceErrorHandler.handleError(
        { type: 'permission-denied', message: 'Mic denied' },
        () => console.log('Voice fallback activated')
      );

      // Simulate audio error
      audioErrorHandler.handleAudioError(
        'voice_synthesis',
        new Error('TTS failed'),
        { text: 'Game narration' }
      );

      // Simulate storage error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const saveResult = await stateManager.saveCheckpoint({
        currentTime: '03:00',
        fearLevel: 80,
        health: 30,
        isAlive: true
      });

      // Verify coordinated error handling
      expect(voiceResult.shouldActivateFallback).toBe(true);
      expect(audioErrorHandler.fallbacksEnabled.textNarration).toBe(true);
      expect(mockGameEngine.notifyError).toHaveBeenCalled();

      stateManager.destroy();
    });

    test('should maintain error logs across systems', () => {
      // Generate errors in different systems
      voiceErrorHandler.handleError({ type: 'network', message: 'Voice network error' });
      audioErrorHandler.handleAudioError('loading', new Error('Audio load failed'));
      
      // Check that each system maintains its own error log
      const voiceStats = voiceErrorHandler.getErrorStatistics();
      const audioStats = audioErrorHandler.getErrorStats();
      
      expect(voiceStats.totalErrors).toBeGreaterThan(0);
      expect(audioStats.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from temporary network issues', () => {
      let retryCount = 0;
      const retryCallback = jest.fn(() => {
        retryCount++;
        if (retryCount < 3) {
          // Simulate continued failure
          voiceErrorHandler.handleError(
            { type: 'network', message: 'Still failing' },
            null,
            retryCallback
          );
        }
      });

      // Initial error
      voiceErrorHandler.handleError(
        { type: 'network', message: 'Network timeout' },
        null,
        retryCallback
      );

      const stats = voiceErrorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    test('should activate fallbacks when retries are exhausted', () => {
      const fallbackCallback = jest.fn();
      const retryCallback = jest.fn();
      
      // Create a fresh voice handler to avoid state from previous tests
      const freshVoiceHandler = new VoiceErrorHandler({ maxRetries: 2 });
      
      // Simulate multiple failures that exhaust retries
      // First error - should trigger retry
      freshVoiceHandler.handleError(
        { type: 'network', message: 'Network error 1' },
        fallbackCallback,
        retryCallback
      );
      
      // Second error - should trigger retry
      freshVoiceHandler.handleError(
        { type: 'network', message: 'Network error 2' },
        fallbackCallback,
        retryCallback
      );
      
      // Third error - should trigger fallback (retries exhausted)
      freshVoiceHandler.handleError(
        { type: 'network', message: 'Network error 3' },
        fallbackCallback,
        retryCallback
      );

      // After max retries, retry count should be greater than 0
      expect(freshVoiceHandler.retryCount).toBeGreaterThan(0);
      // The fallback should have been called for the final error that exceeds max retries
      expect(fallbackCallback).toHaveBeenCalled();
    });
  });
});