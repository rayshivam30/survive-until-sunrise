import {
  initializeAudio,
  getAudioManager,
  getAudioErrorHandler,
  playAmbient,
  stopAmbient,
  playJumpScare,
  playWhisper,
  playFootsteps,
  playDoorCreak,
  playHeartbeat,
  stopHeartbeat,
  adjustMasterVolume,
  adjustAmbientVolume,
  adjustEffectsVolume,
  updateAudioForGameState,
  playMixedEffects,
  preloadSounds,
  getAudioStatus,
  destroyAudio
} from '../soundManager.js';

// Mock the AudioManager and AudioErrorHandler
jest.mock('../AudioManager.js');
jest.mock('../AudioErrorHandler.js');

describe('soundManager', () => {
  let mockAudioManager;
  let mockAudioErrorHandler;

  beforeEach(() => {
    // Reset modules
    jest.resetModules();
    
    // Create mock instances
    mockAudioManager = {
      isInitialized: false,
      initialize: jest.fn().mockResolvedValue(true),
      playAmbient: jest.fn().mockReturnValue(true),
      stopAmbient: jest.fn(),
      playEffect: jest.fn().mockReturnValue('mock-sound-id'),
      stopEffect: jest.fn(),
      adjustVolume: jest.fn(),
      updateAudioForGameState: jest.fn(),
      playMixedEffects: jest.fn().mockReturnValue([]),
      preloadSounds: jest.fn().mockResolvedValue(),
      getStatus: jest.fn().mockReturnValue({ isInitialized: true }),
      destroy: jest.fn()
    };

    mockAudioErrorHandler = {
      handleAudioError: jest.fn()
    };

    // Mock the constructors
    const AudioManager = require('../AudioManager.js').default;
    const AudioErrorHandler = require('../AudioErrorHandler.js').default;
    
    AudioManager.mockImplementation(() => mockAudioManager);
    AudioErrorHandler.mockImplementation(() => mockAudioErrorHandler);
  });

  afterEach(() => {
    destroyAudio();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize audio system successfully', async () => {
      mockAudioManager.isInitialized = true;
      const result = await initializeAudio();
      
      expect(result).toBe(true);
      expect(mockAudioManager.initialize).toHaveBeenCalled();
    });

    test('should return existing manager if already initialized', async () => {
      await initializeAudio();
      mockAudioManager.isInitialized = true;
      
      const result = await initializeAudio();
      expect(result).toBe(true);
    });

    test('should provide access to audio manager instance', async () => {
      await initializeAudio();
      const manager = getAudioManager();
      expect(manager).toBe(mockAudioManager);
    });

    test('should provide access to error handler instance', async () => {
      await initializeAudio();
      const errorHandler = getAudioErrorHandler();
      expect(errorHandler).toBe(mockAudioErrorHandler);
    });
  });

  describe('Backward Compatibility Functions', () => {
    beforeEach(async () => {
      mockAudioManager.isInitialized = true;
      await initializeAudio();
    });

    test('should play ambient sound with default parameters', () => {
      const result = playAmbient();
      expect(result).toBe(true);
      expect(mockAudioManager.playAmbient).toHaveBeenCalledWith('forest_night', {});
    });

    test('should play ambient sound with custom parameters', () => {
      const options = { volume: 0.5, fadeIn: 2000 };
      const result = playAmbient('house_creaks', options);
      
      expect(result).toBe(true);
      expect(mockAudioManager.playAmbient).toHaveBeenCalledWith('house_creaks', options);
    });

    test('should stop ambient sound', () => {
      const options = { fadeOut: 1000 };
      stopAmbient(options);
      expect(mockAudioManager.stopAmbient).toHaveBeenCalledWith(options);
    });

    test('should play jump scare sound', () => {
      const result = playJumpScare();
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('jump_scare', {});
    });

    test('should play whisper sound', () => {
      const result = playWhisper();
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('whisper', {});
    });
  });

  describe('Additional Convenience Functions', () => {
    beforeEach(async () => {
      mockAudioManager.isInitialized = true;
      await initializeAudio();
    });

    test('should play footsteps with default type', () => {
      const result = playFootsteps();
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('footsteps', { sprite: 'walk' });
    });

    test('should play footsteps with custom type', () => {
      const result = playFootsteps('run', { volume: 0.8 });
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('footsteps', { 
        volume: 0.8, 
        sprite: 'run' 
      });
    });

    test('should play door creak sound', () => {
      const result = playDoorCreak();
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('door_creak', {});
    });

    test('should play heartbeat sound with loop', () => {
      const result = playHeartbeat();
      expect(result).toBe('mock-sound-id');
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('heartbeat', { loop: true });
    });

    test('should stop heartbeat sound', () => {
      stopHeartbeat();
      expect(mockAudioManager.stopEffect).toHaveBeenCalledWith('heartbeat');
    });
  });

  describe('Volume Control Functions', () => {
    beforeEach(async () => {
      mockAudioManager.isInitialized = true;
      await initializeAudio();
    });

    test('should adjust master volume', () => {
      adjustMasterVolume(0.7);
      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('master', 0.7);
    });

    test('should adjust ambient volume', () => {
      adjustAmbientVolume(0.5);
      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('ambient', 0.5);
    });

    test('should adjust effects volume', () => {
      adjustEffectsVolume(0.8);
      expect(mockAudioManager.adjustVolume).toHaveBeenCalledWith('effects', 0.8);
    });
  });

  describe('Advanced Functions', () => {
    beforeEach(async () => {
      mockAudioManager.isInitialized = true;
      await initializeAudio();
    });

    test('should update audio for game state', () => {
      const gameState = { fearLevel: 50, health: 75 };
      updateAudioForGameState(gameState);
      expect(mockAudioManager.updateAudioForGameState).toHaveBeenCalledWith(gameState);
    });

    test('should play mixed effects', () => {
      const effects = [{ soundKey: 'footsteps' }, { soundKey: 'whisper' }];
      const result = playMixedEffects(effects);
      
      expect(result).toEqual([]);
      expect(mockAudioManager.playMixedEffects).toHaveBeenCalledWith(effects);
    });

    test('should preload sounds', async () => {
      const soundKeys = ['jump_scare', 'whisper'];
      await preloadSounds(soundKeys);
      expect(mockAudioManager.preloadSounds).toHaveBeenCalledWith(soundKeys);
    });

    test('should get audio status', () => {
      const result = getAudioStatus();
      expect(result).toEqual({ isInitialized: true });
      expect(mockAudioManager.getStatus).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle uninitialized audio manager gracefully', () => {
      // Don't initialize audio manager
      const result = playAmbient();
      expect(result).toBe(false);
    });

    test('should handle missing audio manager for effects', () => {
      const result = playJumpScare();
      expect(result).toBeNull();
    });

    test('should handle missing audio manager for volume adjustment', () => {
      // Should not throw error
      adjustMasterVolume(0.5);
      expect(true).toBe(true);
    });

    test('should return error status when audio manager not created', () => {
      const status = getAudioStatus();
      expect(status).toEqual({ 
        isInitialized: false, 
        error: 'Audio manager not created' 
      });
    });
  });

  describe('Cleanup', () => {
    test('should destroy audio resources', async () => {
      await initializeAudio();
      destroyAudio();
      
      expect(mockAudioManager.destroy).toHaveBeenCalled();
      
      // Should return null after destruction
      expect(getAudioManager()).toBeNull();
      expect(getAudioErrorHandler()).toBeNull();
    });

    test('should handle destroy when audio manager not initialized', () => {
      // Should not throw error
      destroyAudio();
      expect(true).toBe(true);
    });
  });
});