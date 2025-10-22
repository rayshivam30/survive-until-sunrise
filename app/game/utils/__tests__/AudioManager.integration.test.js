/**
 * Integration tests for AudioManager
 * These tests verify that the AudioManager integrates correctly with the game
 */

import { initializeAudio, playAmbient, playJumpScare, getAudioStatus, destroyAudio } from '../soundManager.js';

// Mock Howler.js for integration testing
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation((config) => {
    const mockSound = {
      play: jest.fn().mockReturnValue('test-sound-id'),
      stop: jest.fn(),
      pause: jest.fn(),
      volume: jest.fn().mockReturnThis(),
      rate: jest.fn().mockReturnThis(),
      loop: jest.fn().mockReturnThis(),
      fade: jest.fn(),
      unload: jest.fn(),
      playing: jest.fn().mockReturnValue(false)
    };
    
    // Simulate successful loading
    setTimeout(() => {
      if (config.onload) config.onload();
    }, 10);
    
    return mockSound;
  }),
  Howler: {
    volume: jest.fn(),
    mute: jest.fn(),
    stop: jest.fn()
  }
}));

describe('AudioManager Integration', () => {
  beforeEach(() => {
    // Clean up any existing audio manager
    destroyAudio();
    jest.clearAllMocks();
  });

  afterEach(() => {
    destroyAudio();
  });

  test('should initialize and provide basic functionality', async () => {
    // Initialize audio system
    const initResult = await initializeAudio();
    expect(initResult).toBe(true);

    // Check status
    const status = getAudioStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.totalSounds).toBeGreaterThan(0);
  });

  test('should play ambient sounds after initialization', async () => {
    await initializeAudio();
    
    // Should be able to play ambient sound
    const result = playAmbient('forest_night');
    expect(result).toBe(true);
  });

  test('should play effect sounds after initialization', async () => {
    await initializeAudio();
    
    // Should be able to play effect sound
    const result = playJumpScare();
    expect(result).toBe('test-sound-id');
  });

  test('should handle uninitialized state gracefully', () => {
    // Don't initialize - should handle gracefully
    const ambientResult = playAmbient();
    expect(ambientResult).toBe(false);

    const effectResult = playJumpScare();
    expect(effectResult).toBeNull();

    const status = getAudioStatus();
    expect(status.isInitialized).toBe(false);
  });

  test('should clean up resources properly', async () => {
    await initializeAudio();
    
    // Verify it's initialized
    let status = getAudioStatus();
    expect(status.isInitialized).toBe(true);
    
    // Destroy and verify cleanup
    destroyAudio();
    
    status = getAudioStatus();
    expect(status.isInitialized).toBe(false);
  });

  test('should handle audio loading errors gracefully', async () => {
    // Mock Howl to simulate loading error
    const { Howl } = require('howler');
    Howl.mockImplementationOnce((config) => {
      const mockSound = {
        play: jest.fn(),
        stop: jest.fn(),
        volume: jest.fn().mockReturnThis(),
        unload: jest.fn()
      };
      
      // Simulate loading error
      setTimeout(() => {
        if (config.onloaderror) config.onloaderror(null, new Error('Loading failed'));
      }, 10);
      
      return mockSound;
    });

    // Should still initialize successfully with fallbacks
    const result = await initializeAudio();
    expect(result).toBe(true);
  });
});

describe('AudioManager Game State Integration', () => {
  beforeEach(async () => {
    destroyAudio();
    await initializeAudio();
    jest.clearAllMocks();
  });

  afterEach(() => {
    destroyAudio();
  });

  test('should handle game state updates', () => {
    const { updateAudioForGameState } = require('../soundManager.js');
    
    const gameState = {
      fearLevel: 75,
      health: 50,
      currentTime: '02:30',
      location: 'basement'
    };

    // Should not throw error
    expect(() => {
      updateAudioForGameState(gameState);
    }).not.toThrow();
  });

  test('should handle null game state', () => {
    const { updateAudioForGameState } = require('../soundManager.js');
    
    // Should not throw error with null state
    expect(() => {
      updateAudioForGameState(null);
    }).not.toThrow();
  });
});