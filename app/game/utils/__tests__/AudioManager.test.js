import AudioManager from '../AudioManager.js';
import AudioErrorHandler from '../AudioErrorHandler.js';

// Mock Howler.js
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation((config) => {
    const mockSound = {
      play: jest.fn().mockReturnValue('mock-sound-id'),
      stop: jest.fn(),
      pause: jest.fn(),
      volume: jest.fn().mockReturnThis(),
      rate: jest.fn().mockReturnThis(),
      loop: jest.fn().mockReturnThis(),
      fade: jest.fn(),
      unload: jest.fn(),
      playing: jest.fn().mockReturnValue(false),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn()
    };
    
    // Simulate immediate loading success
    setTimeout(() => {
      if (config.onload) config.onload();
    }, 0);
    
    return mockSound;
  }),
  Howler: {
    volume: jest.fn(),
    mute: jest.fn(),
    stop: jest.fn(),
    ctx: {
      state: 'running'
    }
  }
}));

describe('AudioManager', () => {
  let audioManager;
  let mockErrorHandler;

  beforeEach(() => {
    audioManager = new AudioManager();
    mockErrorHandler = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await audioManager.initialize(mockErrorHandler);
      expect(result).toBe(true);
      expect(audioManager.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await audioManager.initialize(mockErrorHandler);
      const result = await audioManager.initialize(mockErrorHandler);
      expect(result).toBe(true);
      expect(audioManager.isInitialized).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock Howl constructor to throw error
      const { Howl } = require('howler');
      Howl.mockImplementationOnce(() => {
        throw new Error('Audio context error');
      });

      const result = await audioManager.initialize(mockErrorHandler);
      expect(result).toBe(false);
      expect(mockErrorHandler).toHaveBeenCalledWith(
        'initialization',
        expect.any(Error),
        {}
      );
    });
  });

  describe('Ambient Sound Management', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should play ambient sound successfully', () => {
      const result = audioManager.playAmbient('forest_night');
      expect(result).toBe(true);
      expect(audioManager.currentAmbient).toBe('forest_night');
    });

    test('should stop current ambient when playing new one', () => {
      audioManager.playAmbient('forest_night');
      audioManager.playAmbient('house_creaks');
      expect(audioManager.currentAmbient).toBe('house_creaks');
    });

    test('should handle unknown ambient sound gracefully', () => {
      const result = audioManager.playAmbient('unknown_sound');
      expect(result).toBe(false);
      expect(audioManager.currentAmbient).toBeNull();
    });

    test('should stop ambient sound', () => {
      audioManager.playAmbient('forest_night');
      audioManager.stopAmbient();
      expect(audioManager.currentAmbient).toBeNull();
    });
  });

  describe('Effect Sound Management', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should play effect sound successfully', () => {
      const soundId = audioManager.playEffect('jump_scare');
      expect(soundId).toBe('mock-sound-id');
    });

    test('should handle unknown effect sound gracefully', () => {
      const soundId = audioManager.playEffect('unknown_effect');
      expect(soundId).toBeNull();
    });

    test('should play effect with custom options', () => {
      const soundId = audioManager.playEffect('footsteps', {
        volume: 0.8,
        rate: 1.2,
        sprite: 'run'
      });
      expect(soundId).toBe('mock-sound-id');
    });

    test('should stop specific effect sound', () => {
      const soundId = audioManager.playEffect('heartbeat');
      audioManager.stopEffect('heartbeat', soundId);
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('Volume Management', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should adjust master volume', () => {
      audioManager.adjustVolume('master', 0.5);
      expect(audioManager.getVolume('master')).toBe(0.5);
    });

    test('should adjust category volumes', () => {
      audioManager.adjustVolume('ambient', 0.7);
      audioManager.adjustVolume('effects', 0.8);
      expect(audioManager.getVolume('ambient')).toBe(0.7);
      expect(audioManager.getVolume('effects')).toBe(0.8);
    });

    test('should clamp volume values', () => {
      audioManager.adjustVolume('master', 1.5);
      expect(audioManager.getVolume('master')).toBe(1.0);
      
      audioManager.adjustVolume('master', -0.5);
      expect(audioManager.getVolume('master')).toBe(0.0);
    });
  });

  describe('Game State Integration', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should update audio based on game state', () => {
      const gameState = {
        fearLevel: 80,
        health: 25,
        currentTime: '02:30',
        location: 'basement'
      };

      // Should not throw error
      audioManager.updateAudioForGameState(gameState);
      expect(true).toBe(true);
    });

    test('should handle null game state gracefully', () => {
      audioManager.updateAudioForGameState(null);
      expect(true).toBe(true);
    });
  });

  describe('Mixed Effects', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should play multiple effects simultaneously', () => {
      const effects = [
        { soundKey: 'footsteps', options: { volume: 0.5 } },
        { soundKey: 'whisper', options: { volume: 0.3 }, delay: 100 }
      ];

      const result = audioManager.playMixedEffects(effects);
      expect(result).toHaveLength(1); // Only immediate effects are returned
      expect(result[0]).toEqual({
        soundKey: 'footsteps',
        soundId: 'mock-sound-id'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should handle playback errors', () => {
      audioManager.handleError('effect_playback', new Error('Playback failed'), {
        soundKey: 'test_sound'
      });

      expect(mockErrorHandler).toHaveBeenCalledWith(
        'effect_playback',
        expect.any(Error),
        { soundKey: 'test_sound' }
      );
    });

    test('should implement fallback strategies', () => {
      audioManager.handleError('ambient_playback', new Error('Failed'), {
        soundKey: 'unknown_sound'
      });

      // Should attempt fallback to forest_night
      expect(audioManager.currentAmbient).toBe('forest_night');
    });
  });

  describe('Status and Cleanup', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should provide status information', () => {
      const status = audioManager.getStatus();
      expect(status).toHaveProperty('isInitialized', true);
      expect(status).toHaveProperty('currentAmbient');
      expect(status).toHaveProperty('volumes');
      expect(status).toHaveProperty('loadedAmbientSounds');
      expect(status).toHaveProperty('loadedEffectSounds');
      expect(status).toHaveProperty('totalSounds');
    });

    test('should clean up resources on destroy', () => {
      audioManager.playAmbient('forest_night');
      audioManager.destroy();
      
      expect(audioManager.isInitialized).toBe(false);
      expect(audioManager.currentAmbient).toBeNull();
      expect(audioManager.ambientSounds.size).toBe(0);
      expect(audioManager.effectSounds.size).toBe(0);
    });
  });

  describe('Preloading', () => {
    beforeEach(async () => {
      await audioManager.initialize(mockErrorHandler);
    });

    test('should preload specified sounds', async () => {
      const soundKeys = ['jump_scare', 'whisper', 'forest_night'];
      await audioManager.preloadSounds(soundKeys);
      
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });
});

describe('AudioErrorHandler', () => {
  let errorHandler;
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      notifyAudioIssue: jest.fn(),
      enableVisualEffects: jest.fn(),
      enableTextNarration: jest.fn()
    };
    errorHandler = new AudioErrorHandler(mockGameEngine);
    
    // Mock DOM methods
    const mockElement = {
      style: {},
      remove: jest.fn(),
      className: '',
      innerHTML: '',
      parentElement: null
    };
    
    document.createElement = jest.fn().mockReturnValue(mockElement);
    document.getElementById = jest.fn().mockReturnValue(null);
    document.querySelector = jest.fn().mockReturnValue(null);
    
    // Mock appendChild methods
    const mockAppendChild = jest.fn();
    Object.defineProperty(document, 'body', {
      value: { appendChild: mockAppendChild },
      writable: true
    });
    Object.defineProperty(document, 'head', {
      value: { appendChild: mockAppendChild },
      writable: true
    });
  });

  test('should handle initialization errors', () => {
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(true);
    expect(mockGameEngine.notifyAudioIssue).toHaveBeenCalledWith(
      'Audio system unavailable - running in silent mode'
    );
  });

  test('should handle voice synthesis errors', () => {
    errorHandler.handleAudioError('voice_synthesis', new Error('Voice failed'));
    
    expect(errorHandler.fallbacksEnabled.textNarration).toBe(true);
    expect(mockGameEngine.enableTextNarration).toHaveBeenCalled();
  });

  test('should handle effect playback errors', () => {
    errorHandler.handleAudioError('effect_playback', new Error('Effect failed'));
    
    expect(errorHandler.fallbacksEnabled.visualEffects).toBe(true);
    expect(mockGameEngine.enableVisualEffects).toHaveBeenCalled();
  });

  test('should track error statistics', () => {
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    errorHandler.handleAudioError('effect_playback', new Error('Effect failed'));
    errorHandler.handleAudioError('effect_playback', new Error('Another effect failed'));
    
    const stats = errorHandler.getErrorStats();
    expect(stats.totalErrors).toBe(3);
    expect(stats.errorsByType.initialization).toBe(1);
    expect(stats.errorsByType.effect_playback).toBe(2);
  });

  test('should check audio functionality', () => {
    expect(errorHandler.isAudioFunctional()).toBe(true);
    
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    expect(errorHandler.isAudioFunctional()).toBe(false);
  });

  test('should reset fallback states', () => {
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    errorHandler.handleAudioError('voice_synthesis', new Error('Voice failed'));
    
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(true);
    expect(errorHandler.fallbacksEnabled.textNarration).toBe(true);
    
    errorHandler.resetFallbacks();
    
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(false);
    expect(errorHandler.fallbacksEnabled.textNarration).toBe(false);
  });
});