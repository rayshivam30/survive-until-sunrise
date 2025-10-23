/**
 * GameInitializer Tests
 * Tests for game initialization and main game loop integration
 */

import { GameInitializer } from '../GameInitializer.js';
import { GameLoop } from '../GameLoop.js';

// Mock browser APIs
global.window = {
  speechSynthesis: {
    getVoices: () => [],
    speak: jest.fn(),
    cancel: jest.fn()
  },
  SpeechSynthesisUtterance: jest.fn(),
  AudioContext: jest.fn(() => ({
    close: jest.fn(),
    sampleRate: 44100,
    state: 'running'
  })),
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn(),
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  location: {
    protocol: 'https:',
    hostname: 'localhost'
  },
  Notification: {
    permission: 'default',
    requestPermission: jest.fn(() => Promise.resolve('granted'))
  }
};

global.document = {
  createElement: jest.fn((tagName) => {
    if (tagName === 'canvas') {
      return {
        getContext: jest.fn(() => ({
          getParameter: jest.fn(() => 'Mock WebGL'),
          VERSION: 'WebGL 1.0',
          VENDOR: 'Mock Vendor',
          RENDERER: 'Mock Renderer'
        }))
      };
    }
    return {};
  }),
  documentElement: {
    requestFullscreen: jest.fn(),
    webkitRequestFullscreen: jest.fn(),
    mozRequestFullScreen: jest.fn(),
    msRequestFullscreen: jest.fn()
  },
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

global.navigator = {
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }]
    }))
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
  platform: 'Win32',
  language: 'en-US',
  cookieEnabled: true,
  onLine: true,
  hardwareConcurrency: 4
};

global.performance = {
  now: jest.fn(() => Date.now())
};

describe('GameInitializer', () => {
  let gameInitializer;
  let mockProgressCallback;
  let mockCompleteCallback;
  let mockErrorCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProgressCallback = jest.fn();
    mockCompleteCallback = jest.fn();
    mockErrorCallback = jest.fn();

    gameInitializer = new GameInitializer({
      enableAudio: true,
      enableVoice: true,
      enableCheckpoints: true,
      autoStart: false,
      showCompatibilityWarnings: false,
      requestPermissions: false, // Skip permissions for tests
      onInitializationProgress: mockProgressCallback,
      onInitializationComplete: mockCompleteCallback,
      onInitializationError: mockErrorCallback
    });
  });

  afterEach(() => {
    if (gameInitializer) {
      gameInitializer.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await gameInitializer.initialize();
      
      expect(result).toBe(true);
      expect(gameInitializer.isInitialized).toBe(true);
      expect(mockCompleteCallback).toHaveBeenCalled();
      expect(mockErrorCallback).not.toHaveBeenCalled();
    });

    test('should call progress callback for each step', async () => {
      await gameInitializer.initialize();
      
      expect(mockProgressCallback).toHaveBeenCalledTimes(10); // 10 initialization steps
      
      // Check that progress increases
      const calls = mockProgressCallback.mock.calls;
      for (let i = 1; i < calls.length; i++) {
        expect(calls[i][0].progress).toBeGreaterThan(calls[i-1][0].progress);
      }
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock a critical step to fail
      const originalCheckCompatibility = gameInitializer.checkBrowserCompatibility;
      gameInitializer.checkBrowserCompatibility = jest.fn(() => {
        throw new Error('Browser compatibility check failed');
      });

      const result = await gameInitializer.initialize();
      
      expect(result).toBe(false);
      expect(mockErrorCallback).toHaveBeenCalled();
      
      // Restore original method
      gameInitializer.checkBrowserCompatibility = originalCheckCompatibility;
    });

    test('should not initialize twice', async () => {
      await gameInitializer.initialize();
      const result = await gameInitializer.initialize();
      
      expect(result).toBe(true);
      expect(mockCompleteCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('System Integration', () => {
    beforeEach(async () => {
      await gameInitializer.initialize();
    });

    test('should have all systems initialized', () => {
      const status = gameInitializer.getSystemStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.gameEngine).toBe(true);
      expect(status.browserCompatibility).toBe(true);
    });

    test('should start game successfully', async () => {
      const result = await gameInitializer.startGame();
      
      expect(result).toBe(true);
      expect(gameInitializer.gameEngine.isRunning).toBe(true);
    });

    test('should restart game successfully', async () => {
      await gameInitializer.startGame();
      const result = await gameInitializer.restartGame();
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await gameInitializer.initialize();
    });

    test('should handle audio errors', () => {
      const error = new Error('Audio initialization failed');
      gameInitializer.handleError('audio', error);
      
      // Should not throw and should continue functioning
      expect(gameInitializer.isInitialized).toBe(true);
    });

    test('should handle voice errors', () => {
      const error = new Error('Voice synthesis failed');
      gameInitializer.handleError('voice', error);
      
      // Should not throw and should continue functioning
      expect(gameInitializer.isInitialized).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await gameInitializer.initialize();
      await gameInitializer.startGame();
    });

    test('should provide system status', () => {
      const status = gameInitializer.getSystemStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('gameEngine');
      expect(status).toHaveProperty('permissions');
      expect(status).toHaveProperty('errors');
    });

    test('should track initialization progress', () => {
      const progress = gameInitializer.getInitializationProgress();
      
      expect(progress).toHaveProperty('isInitialized');
      expect(progress).toHaveProperty('progress');
      expect(progress).toHaveProperty('errors');
    });
  });
});

describe('GameLoop', () => {
  let gameLoop;
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      update: jest.fn(),
      handleError: jest.fn(),
      handlePerformanceIssue: jest.fn()
    };

    gameLoop = new GameLoop(mockGameEngine, {
      targetFPS: 60,
      enablePerformanceMonitoring: true,
      logPerformance: false
    });
  });

  afterEach(() => {
    if (gameLoop) {
      gameLoop.destroy();
    }
  });

  describe('Loop Control', () => {
    test('should start and stop successfully', () => {
      gameLoop.start();
      expect(gameLoop.isRunning).toBe(true);
      
      gameLoop.stop();
      expect(gameLoop.isRunning).toBe(false);
    });

    test('should pause and resume successfully', () => {
      gameLoop.start();
      
      gameLoop.pause();
      expect(gameLoop.isPaused).toBe(true);
      
      gameLoop.resume();
      expect(gameLoop.isPaused).toBe(false);
    });

    test('should not start twice', () => {
      gameLoop.start();
      gameLoop.start(); // Should not cause issues
      
      expect(gameLoop.isRunning).toBe(true);
    });
  });

  describe('Event Processing', () => {
    beforeEach(() => {
      gameLoop.start();
    });

    test('should queue and process events', () => {
      const event = {
        type: 'test-event',
        data: { message: 'test' }
      };

      gameLoop.queueEvent(event);
      expect(gameLoop.eventQueue.length).toBe(1);
    });

    test('should register and use event processors', () => {
      const processor = jest.fn();
      gameLoop.registerEventProcessor('test-event', processor);

      const event = {
        type: 'test-event',
        data: { message: 'test' }
      };

      gameLoop.queueEvent(event);
      gameLoop.processEvents();

      expect(processor).toHaveBeenCalledWith(expect.objectContaining({
        type: 'test-event',
        data: { message: 'test' }
      }));
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      gameLoop.start();
    });

    test('should track performance statistics', () => {
      const stats = gameLoop.getPerformanceStats();
      
      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('frameTime');
      expect(stats).toHaveProperty('totalFrames');
      expect(stats).toHaveProperty('droppedFrames');
    });

    test('should provide loop status', () => {
      const status = gameLoop.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('isPaused');
      expect(status).toHaveProperty('frameCount');
      expect(status).toHaveProperty('performance');
    });

    test('should adjust target FPS', () => {
      gameLoop.setTargetFPS(30);
      expect(gameLoop.options.targetFPS).toBe(30);
    });
  });

  describe('Callback System', () => {
    test('should register and execute update callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = gameLoop.onUpdate(callback);
      
      gameLoop.start();
      
      // Simulate a frame
      gameLoop.executeCallbacks(gameLoop.updateCallbacks, 16);
      
      expect(callback).toHaveBeenCalledWith(16, expect.any(Object));
      
      unsubscribe();
      gameLoop.executeCallbacks(gameLoop.updateCallbacks, 16);
      
      // Should not be called again after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      gameLoop.onUpdate(errorCallback);
      
      // Should not throw when executing callbacks
      expect(() => {
        gameLoop.executeCallbacks(gameLoop.updateCallbacks, 16);
      }).not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  let gameInitializer;

  beforeEach(async () => {
    gameInitializer = new GameInitializer({
      enableAudio: false, // Disable for faster tests
      enableVoice: false,
      enableCheckpoints: false,
      autoStart: false,
      showCompatibilityWarnings: false,
      requestPermissions: false
    });

    await gameInitializer.initialize();
  });

  afterEach(() => {
    if (gameInitializer) {
      gameInitializer.destroy();
    }
  });

  test('should integrate GameEngine with GameLoop', async () => {
    await gameInitializer.startGame();
    
    const gameEngine = gameInitializer.gameEngine;
    const gameLoop = gameEngine.gameLoop;
    
    expect(gameEngine.isRunning).toBe(true);
    expect(gameLoop.isRunning).toBe(true);
  });

  test('should handle commands through the game loop', async () => {
    await gameInitializer.startGame();
    
    const gameEngine = gameInitializer.gameEngine;
    const result = gameEngine.handleCommand('hide');
    
    // Command should be processed
    expect(typeof result).toBe('boolean');
  });

  test('should maintain game state consistency', async () => {
    await gameInitializer.startGame();
    
    const gameEngine = gameInitializer.gameEngine;
    const initialState = gameEngine.getGameState();
    
    expect(initialState.isAlive).toBe(true);
    expect(initialState.gameStarted).toBe(true);
    expect(typeof initialState.fearLevel).toBe('number');
    expect(typeof initialState.health).toBe('number');
  });
});