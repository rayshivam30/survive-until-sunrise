/**
 * Tests for PerformanceIntegration
 * Verifies that all performance optimization systems work together
 */

import { PerformanceIntegration } from '../PerformanceIntegration.js';
import { AudioPreloader } from '../AudioPreloader.js';
import { VoiceCommandDebouncer } from '../VoiceCommandDebouncer.js';
import { BrowserCompatibility } from '../BrowserCompatibility.js';
import { PerformanceMonitor } from '../PerformanceMonitor.js';
import { PerformanceOptimizer } from '../PerformanceOptimizer.js';

// Mock dependencies
const mockAudioManager = {
  audioAssets: {
    ambient: {
      'forest_night': { src: 'forest.mp3' },
      'house_creaks': { src: 'creaks.mp3' }
    },
    effects: {
      'jump_scare': { src: 'scare.mp3' },
      'heartbeat': { src: 'heart.mp3' }
    }
  },
  loadSound: jest.fn().mockResolvedValue({}),
  preloadSounds: jest.fn().mockResolvedValue([]),
  adjustVolume: jest.fn(),
  optimizeForLatency: jest.fn(),
  isInitialized: true
};

const mockGameEngine = {
  gameLoop: {
    setTargetFPS: jest.fn(),
    setFrameSkipping: jest.fn()
  },
  getFearSystem: jest.fn().mockReturnValue({
    setUpdateFrequency: jest.fn()
  }),
  getHealthSystem: jest.fn().mockReturnValue({
    setUpdateFrequency: jest.fn()
  }),
  getEventSystem: jest.fn().mockReturnValue({
    setEventFrequency: jest.fn()
  })
};

const mockVoiceController = {
  enableTextFallback: jest.fn()
};

describe('PerformanceIntegration', () => {
  let performanceIntegration;

  beforeEach(() => {
    performanceIntegration = new PerformanceIntegration(
      mockAudioManager,
      mockGameEngine,
      mockVoiceController
    );
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (performanceIntegration.isInitialized) {
      performanceIntegration.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize all performance systems', async () => {
      // Mock console.log to avoid noise
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      console.log = jest.fn();
      console.error = jest.fn();
      
      const result = await performanceIntegration.initialize();
      
      // If initialization failed, log the error for debugging
      if (!result.success) {
        console.log('Initialization failed:', result);
        console.log('Console errors:', console.error.mock.calls);
      }
      
      expect(result.success).toBe(true);
      expect(performanceIntegration.isInitialized).toBe(true);
      expect(performanceIntegration.audioPreloader).toBeInstanceOf(AudioPreloader);
      expect(performanceIntegration.voiceDebouncer).toBeInstanceOf(VoiceCommandDebouncer);
      expect(performanceIntegration.performanceOptimizer).toBeInstanceOf(PerformanceOptimizer);
      
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    });

    test('should not reinitialize if already initialized', async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      await performanceIntegration.initialize();
      const result = await performanceIntegration.initialize();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Already initialized');
      
      console.log = originalConsoleLog;
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock an error in one of the systems
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Force an error by passing invalid options
      performanceIntegration.audioManager = null;
      
      const result = await performanceIntegration.initialize();
      
      expect(result.success).toBe(true); // Should still succeed without audio manager
      
      console.error = originalConsoleError;
    });
  });

  describe('Performance Issue Handling', () => {
    beforeEach(async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      await performanceIntegration.initialize();
      console.log = originalConsoleLog;
    });

    test('should handle low FPS issues', () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const issue = {
        type: 'low_fps',
        fps: 20,
        severity: 'high'
      };

      performanceIntegration.handlePerformanceIssue(issue);

      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('effects', 0.7);
      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('ambient', 0.5);
      expect(mockGameEngine.gameLoop.setTargetFPS).toHaveBeenCalledWith(30);
      
      console.log = originalConsoleLog;
    });

    test('should handle memory issues', () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const issue = {
        type: 'high_memory_usage',
        memoryUsage: 150 * 1024 * 1024,
        severity: 'high'
      };

      // Mock the cleanup method
      performanceIntegration.audioPreloader.cleanupNonEssentialAssets = jest.fn();

      performanceIntegration.handlePerformanceIssue(issue);

      // Should trigger memory cleanup
      expect(performanceIntegration.audioPreloader.cleanupNonEssentialAssets).toHaveBeenCalled();
      
      console.log = originalConsoleLog;
    });

    test('should handle audio latency issues', () => {
      const issue = {
        type: 'high_audio_latency',
        audioLatency: 200,
        severity: 'medium'
      };

      performanceIntegration.handlePerformanceIssue(issue);

      expect(mockAudioManager.optimizeForLatency).toHaveBeenCalled();
      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('effects', 0.5);
    });
  });

  describe('Compatibility Issue Handling', () => {
    beforeEach(async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      await performanceIntegration.initialize();
      console.log = originalConsoleLog;
    });

    test('should handle audio load errors', () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const issue = {
        type: 'audio_load_error',
        asset: 'jump_scare',
        error: 'Failed to load audio'
      };

      performanceIntegration.handleCompatibilityIssue(issue);

      // Should mark asset as failed
      const failedAsset = performanceIntegration.audioPreloader.failedAssets.get('jump_scare');
      expect(failedAsset).toBeDefined();
      expect(failedAsset.attempts).toBe(999);
      
      console.log = originalConsoleLog;
    });

    test('should enable text input fallback for voice errors', () => {
      const issue = {
        type: 'voice_recognition_error',
        error: 'Speech recognition not supported'
      };

      performanceIntegration.handleCompatibilityIssue(issue);

      expect(mockVoiceController.enableTextFallback).toHaveBeenCalled();
    });
  });

  describe('Voice Command Processing', () => {
    beforeEach(async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      await performanceIntegration.initialize();
      console.log = originalConsoleLog;
    });

    test('should process voice commands with debouncing', async () => {
      const command = { text: 'hide', confidence: 0.8 };
      const context = { gameState: { fearLevel: 50 } };

      // Mock the debouncer to return true
      performanceIntegration.voiceDebouncer.processCommand = jest.fn().mockResolvedValue(true);

      const result = await performanceIntegration.processVoiceCommand(command, context);

      expect(result).toBe(true);
      expect(performanceIntegration.voiceDebouncer.processCommand).toHaveBeenCalledWith(command, context);
    });

    test('should return false if voice debouncer is not available', async () => {
      performanceIntegration.voiceDebouncer = null;

      const result = await performanceIntegration.processVoiceCommand({ text: 'test' });

      expect(result).toBe(false);
    });
  });

  describe('Audio Asset Preloading', () => {
    beforeEach(async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      await performanceIntegration.initialize();
      console.log = originalConsoleLog;
    });

    test('should preload audio assets based on game state', async () => {
      const gameState = {
        fearLevel: 80,
        health: 50,
        currentTime: '02:00'
      };

      // Mock the performance optimizer
      performanceIntegration.performanceOptimizer.lazyLoadAudioAssets = jest.fn().mockResolvedValue();

      await performanceIntegration.preloadAudioAssets(gameState);

      expect(performanceIntegration.performanceOptimizer.lazyLoadAudioAssets).toHaveBeenCalledWith(gameState);
    });

    test('should handle missing audio preloader gracefully', async () => {
      performanceIntegration.audioPreloader = null;

      await expect(performanceIntegration.preloadAudioAssets({})).resolves.toBeUndefined();
    });
  });

  describe('Performance Status', () => {
    test('should return comprehensive performance status', async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      await performanceIntegration.initialize();

      const status = performanceIntegration.getPerformanceStatus();

      expect(status).toHaveProperty('isInitialized', true);
      expect(status).toHaveProperty('compatibility');
      expect(status).toHaveProperty('monitor');
      expect(status).toHaveProperty('audioPreloader');
      expect(status).toHaveProperty('voiceDebouncer');
      expect(status).toHaveProperty('optimizer');
      
      console.log = originalConsoleLog;
    });

    test('should return null for unavailable systems', () => {
      const status = performanceIntegration.getPerformanceStatus();

      expect(status.isInitialized).toBe(false);
      expect(status.audioPreloader).toBeNull();
      expect(status.voiceDebouncer).toBeNull();
      expect(status.optimizer).toBeNull();
    });
  });

  describe('Callbacks', () => {
    test('should register and notify performance callbacks', () => {
      const callback = jest.fn();
      const unregister = performanceIntegration.onPerformanceUpdate(callback);

      const issue = { type: 'test_issue', severity: 'low' };
      performanceIntegration.notifyPerformanceCallbacks(issue);

      expect(callback).toHaveBeenCalledWith(issue);

      // Test unregister
      unregister();
      performanceIntegration.notifyPerformanceCallbacks(issue);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should register and notify compatibility callbacks', () => {
      const callback = jest.fn();
      const unregister = performanceIntegration.onCompatibilityIssue(callback);

      const issue = { type: 'test_compatibility_issue' };
      performanceIntegration.notifyCompatibilityCallbacks(issue);

      expect(callback).toHaveBeenCalledWith(issue);

      // Test unregister
      unregister();
      performanceIntegration.notifyCompatibilityCallbacks(issue);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle callback errors gracefully', () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      performanceIntegration.onPerformanceUpdate(errorCallback);
      performanceIntegration.notifyPerformanceCallbacks({ type: 'test' });

      expect(console.error).toHaveBeenCalledWith('Error in performance callback:', expect.any(Error));

      console.error = originalConsoleError;
    });
  });

  describe('Cleanup', () => {
    test('should destroy all systems properly', async () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      await performanceIntegration.initialize();

      // Mock destroy methods
      performanceIntegration.audioPreloader.destroy = jest.fn();
      performanceIntegration.voiceDebouncer.destroy = jest.fn();
      performanceIntegration.performanceOptimizer.destroy = jest.fn();
      performanceIntegration.performanceMonitor.destroy = jest.fn();

      performanceIntegration.destroy();

      expect(performanceIntegration.audioPreloader.destroy).toHaveBeenCalled();
      expect(performanceIntegration.voiceDebouncer.destroy).toHaveBeenCalled();
      expect(performanceIntegration.performanceOptimizer.destroy).toHaveBeenCalled();
      expect(performanceIntegration.performanceMonitor.destroy).toHaveBeenCalled();
      expect(performanceIntegration.isInitialized).toBe(false);
      
      console.log = originalConsoleLog;
    });
  });
});