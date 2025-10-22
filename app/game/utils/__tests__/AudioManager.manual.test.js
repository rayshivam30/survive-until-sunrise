/**
 * Manual test for AudioManager - run this to verify basic functionality
 * This test doesn't use complex mocking and focuses on core functionality
 */

import AudioManager from '../AudioManager.js';
import AudioErrorHandler from '../AudioErrorHandler.js';

// Simple mock for Howler.js
const mockHowl = {
  play: jest.fn().mockReturnValue('test-id'),
  stop: jest.fn(),
  volume: jest.fn().mockReturnThis(),
  fade: jest.fn(),
  unload: jest.fn(),
  playing: jest.fn().mockReturnValue(false)
};

jest.mock('howler', () => ({
  Howl: jest.fn(() => mockHowl),
  Howler: {
    volume: jest.fn()
  }
}));

describe('AudioManager Manual Test', () => {
  let audioManager;
  let errorHandler;

  beforeEach(() => {
    audioManager = new AudioManager();
    errorHandler = new AudioErrorHandler();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.destroy();
    }
  });

  test('should create AudioManager instance', () => {
    expect(audioManager).toBeInstanceOf(AudioManager);
    expect(audioManager.isInitialized).toBe(false);
  });

  test('should create AudioErrorHandler instance', () => {
    expect(errorHandler).toBeInstanceOf(AudioErrorHandler);
    expect(errorHandler.isAudioFunctional()).toBe(true);
  });

  test('should have correct initial state', () => {
    expect(audioManager.currentAmbient).toBeNull();
    expect(audioManager.volumes.master).toBe(1.0);
    expect(audioManager.volumes.ambient).toBe(0.3);
    expect(audioManager.volumes.effects).toBe(0.7);
  });

  test('should handle volume adjustments', () => {
    audioManager.adjustVolume('master', 0.5);
    expect(audioManager.getVolume('master')).toBe(0.5);

    audioManager.adjustVolume('ambient', 0.8);
    expect(audioManager.getVolume('ambient')).toBe(0.8);
  });

  test('should provide status information', () => {
    const status = audioManager.getStatus();
    expect(status).toHaveProperty('isInitialized');
    expect(status).toHaveProperty('currentAmbient');
    expect(status).toHaveProperty('volumes');
    expect(status).toHaveProperty('loadedAmbientSounds');
    expect(status).toHaveProperty('loadedEffectSounds');
    expect(status).toHaveProperty('totalSounds');
  });

  test('should handle errors gracefully', () => {
    const mockErrorHandler = jest.fn();
    audioManager.errorHandler = mockErrorHandler;

    audioManager.handleError('test_error', new Error('Test error'), { test: true });
    expect(mockErrorHandler).toHaveBeenCalledWith('test_error', expect.any(Error), { test: true });
  });

  test('should clean up resources', () => {
    audioManager.ambientSounds.set('test', mockHowl);
    audioManager.effectSounds.set('test', mockHowl);
    
    audioManager.destroy();
    
    expect(audioManager.isInitialized).toBe(false);
    expect(audioManager.currentAmbient).toBeNull();
    expect(audioManager.ambientSounds.size).toBe(0);
    expect(audioManager.effectSounds.size).toBe(0);
  });
});

describe('AudioErrorHandler Manual Test', () => {
  let errorHandler;
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      notifyAudioIssue: jest.fn(),
      enableVisualEffects: jest.fn(),
      enableTextNarration: jest.fn()
    };
    errorHandler = new AudioErrorHandler(mockGameEngine);
    
    // Mock DOM for notifications
    global.document = {
      createElement: jest.fn().mockReturnValue({
        style: {},
        remove: jest.fn(),
        className: '',
        innerHTML: ''
      }),
      body: { appendChild: jest.fn() },
      head: { appendChild: jest.fn() },
      getElementById: jest.fn().mockReturnValue(null)
    };
  });

  test('should track errors', () => {
    errorHandler.handleAudioError('test_error', new Error('Test'), {});
    
    const stats = errorHandler.getErrorStats();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByType.test_error).toBe(1);
  });

  test('should enable fallbacks on errors', () => {
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(true);

    errorHandler.handleAudioError('voice_synthesis', new Error('Voice failed'));
    expect(errorHandler.fallbacksEnabled.textNarration).toBe(true);

    errorHandler.handleAudioError('effect_playback', new Error('Effect failed'));
    expect(errorHandler.fallbacksEnabled.visualEffects).toBe(true);
  });

  test('should reset fallbacks', () => {
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(true);

    errorHandler.resetFallbacks();
    expect(errorHandler.fallbacksEnabled.silentMode).toBe(false);
  });

  test('should check audio functionality', () => {
    expect(errorHandler.isAudioFunctional()).toBe(true);
    
    errorHandler.handleAudioError('initialization', new Error('Init failed'));
    expect(errorHandler.isAudioFunctional()).toBe(false);
  });
});