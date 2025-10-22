import AudioManager from './AudioManager.js';
import AudioErrorHandler from './AudioErrorHandler.js';

// Create global audio manager instance
let audioManager = null;
let audioErrorHandler = null;

/**
 * Initialize the audio system
 * @param {Object} gameEngine - Game engine instance for error handling
 * @returns {Promise<boolean>} - Success status
 */
export const initializeAudio = async (gameEngine = null) => {
  if (audioManager) {
    return audioManager.isInitialized;
  }

  audioErrorHandler = new AudioErrorHandler(gameEngine);
  audioManager = new AudioManager();
  
  const success = await audioManager.initialize((errorType, error, context) => {
    audioErrorHandler.handleAudioError(errorType, error, context);
  });

  return success;
};

/**
 * Get the audio manager instance
 * @returns {AudioManager|null} - Audio manager instance
 */
export const getAudioManager = () => audioManager;

/**
 * Get the audio error handler instance
 * @returns {AudioErrorHandler|null} - Audio error handler instance
 */
export const getAudioErrorHandler = () => audioErrorHandler;

// Backward compatibility functions for existing code
export const playAmbient = (soundKey = 'forest_night', options = {}) => {
  if (!audioManager || !audioManager.isInitialized) {
    console.warn('Audio manager not initialized');
    return false;
  }
  return audioManager.playAmbient(soundKey, options);
};

export const stopAmbient = (options = {}) => {
  if (!audioManager) return;
  audioManager.stopAmbient(options);
};

export const playJumpScare = (options = {}) => {
  if (!audioManager || !audioManager.isInitialized) {
    console.warn('Audio manager not initialized');
    return null;
  }
  return audioManager.playEffect('jump_scare', options);
};

export const playWhisper = (options = {}) => {
  if (!audioManager || !audioManager.isInitialized) {
    console.warn('Audio manager not initialized');
    return null;
  }
  return audioManager.playEffect('whisper', options);
};

// Additional convenience functions
export const playFootsteps = (type = 'walk', options = {}) => {
  if (!audioManager || !audioManager.isInitialized) return null;
  return audioManager.playEffect('footsteps', { ...options, sprite: type });
};

export const playDoorCreak = (options = {}) => {
  if (!audioManager || !audioManager.isInitialized) return null;
  return audioManager.playEffect('door_creak', options);
};

export const playHeartbeat = (options = {}) => {
  if (!audioManager || !audioManager.isInitialized) return null;
  return audioManager.playEffect('heartbeat', { ...options, loop: true });
};

export const stopHeartbeat = () => {
  if (!audioManager) return;
  audioManager.stopEffect('heartbeat');
};

export const adjustMasterVolume = (volume) => {
  if (!audioManager) return;
  audioManager.adjustVolume('master', volume);
};

export const adjustAmbientVolume = (volume) => {
  if (!audioManager) return;
  audioManager.adjustVolume('ambient', volume);
};

export const adjustEffectsVolume = (volume) => {
  if (!audioManager) return;
  audioManager.adjustVolume('effects', volume);
};

/**
 * Update audio based on game state
 * @param {Object} gameState - Current game state
 */
export const updateAudioForGameState = (gameState) => {
  if (!audioManager || !audioManager.isInitialized) return;
  audioManager.updateAudioForGameState(gameState);
};

/**
 * Play multiple sound effects simultaneously
 * @param {Array} effects - Array of effect configurations
 * @returns {Array} - Array of played sound IDs
 */
export const playMixedEffects = (effects) => {
  if (!audioManager || !audioManager.isInitialized) return [];
  return audioManager.playMixedEffects(effects);
};

/**
 * Preload specific sounds for better performance
 * @param {Array} soundKeys - Array of sound keys to preload
 * @returns {Promise<void>}
 */
export const preloadSounds = async (soundKeys) => {
  if (!audioManager) return;
  await audioManager.preloadSounds(soundKeys);
};

/**
 * Get audio system status
 * @returns {Object} - Status information
 */
export const getAudioStatus = () => {
  if (!audioManager) {
    return { isInitialized: false, error: 'Audio manager not created' };
  }
  return audioManager.getStatus();
};

/**
 * Clean up audio resources
 */
export const destroyAudio = () => {
  if (audioManager) {
    audioManager.destroy();
    audioManager = null;
  }
  if (audioErrorHandler) {
    audioErrorHandler = null;
  }
};
