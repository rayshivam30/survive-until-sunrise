/**
 * Utility modules for the Survive Until Sunrise game
 * Exports all utility classes and functions
 */

// Error Handling
export { VoiceErrorHandler } from './VoiceErrorHandler.js';
export { default as AudioErrorHandler } from './AudioErrorHandler.js';
export { GameStateManager } from './GameStateManager.js';
export { BrowserCompatibility, browserCompatibility } from './BrowserCompatibility.js';

// Audio Management
export { default as AudioManager } from './AudioManager.js';
export { default as soundManager } from './soundManager.js';

// Voice and Narration
export { VoiceNarrator } from './VoiceNarrator.js';
export { default as useVoiceNarrator } from './useVoiceNarrator.js';

// Command Processing
export { CommandParser } from './CommandParser.js';

// Analysis and Utilities
export { fearAnalyzer } from './fearAnalyzer.js';