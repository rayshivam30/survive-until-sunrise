/**
 * Error Handling Integration Demo
 * Demonstrates how all error handling systems work together
 */

import { VoiceErrorHandler } from './VoiceErrorHandler.js';
import AudioErrorHandler from './AudioErrorHandler.js';
import { GameStateManager } from './GameStateManager.js';
import { BrowserCompatibility } from './BrowserCompatibility.js';

export class ErrorHandlingDemo {
  constructor() {
    this.compatibility = new BrowserCompatibility();
    this.voiceErrorHandler = new VoiceErrorHandler();
    this.audioErrorHandler = new AudioErrorHandler();
    this.gameStateManager = new GameStateManager();
    
    this.isInitialized = false;
    this.errorLog = [];
  }

  /**
   * Initialize the error handling system with compatibility checks
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    console.log('🔧 Initializing Error Handling System...');
    
    try {
      // Step 1: Check browser compatibility
      const compatibilityResults = this.compatibility.checkCompatibility();
      console.log('✅ Browser Compatibility Check:', compatibilityResults.overall);
      
      // Step 2: Show warnings for critical issues
      compatibilityResults.errors.forEach(error => {
        if (error.severity === 'high') {
          this.compatibility.showCompatibilityWarning(error);
        }
      });
      
      // Step 3: Activate fallbacks for unsupported features
      compatibilityResults.fallbacks.forEach(fallback => {
        if (fallback.priority === 'high') {
          this.activateFallback(fallback);
        }
      });
      
      // Step 4: Initialize game state manager if storage is available
      if (compatibilityResults.features.localStorage.supported) {
        await this.initializeGameStateManager();
      } else {
        console.warn('⚠️ localStorage not available - game progress cannot be saved');
      }
      
      // Step 5: Test error handling systems
      await this.runErrorHandlingTests();
      
      this.isInitialized = true;
      
      return {
        success: true,
        compatibility: compatibilityResults,
        message: 'Error handling system initialized successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize error handling system:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Error handling system initialization failed'
      };
    }
  }

  /**
   * Initialize game state manager with error recovery
   */
  async initializeGameStateManager() {
    try {
      console.log('💾 Initializing Game State Manager...');
      
      // Try to load existing checkpoint
      const savedState = await this.gameStateManager.loadCheckpoint();
      
      if (savedState) {
        console.log('✅ Loaded saved game state:', {
          gameTime: savedState.currentTime,
          fearLevel: savedState.fearLevel,
          health: savedState.health
        });
      } else {
        console.log('ℹ️ No saved game state found - starting fresh');
        
        // Save initial checkpoint
        const initialState = {
          currentTime: '23:00',
          fearLevel: 0,
          health: 100,
          isAlive: true,
          inventory: []
        };
        
        await this.gameStateManager.saveCheckpoint(initialState, 'initial');
        console.log('✅ Initial checkpoint saved');
      }
      
    } catch (error) {
      console.error('❌ Game State Manager initialization failed:', error);
      this.logError('gamestate_init', error);
    }
  }

  /**
   * Activate a fallback system
   * @param {Object} fallback - Fallback configuration
   */
  activateFallback(fallback) {
    console.log(`🔄 Activating fallback for ${fallback.feature}: ${fallback.strategy}`);
    
    switch (fallback.feature) {
      case 'voice-input':
        this.activateTextInputFallback();
        break;
      case 'voice-narration':
        this.activateTextNarrationFallback();
        break;
      case 'audio-effects':
        this.activateVisualEffectsFallback();
        break;
      case 'game-saves':
        this.activateSessionOnlyFallback();
        break;
      default:
        console.log(`Unknown fallback feature: ${fallback.feature}`);
    }
  }

  /**
   * Activate text input fallback for voice commands
   */
  activateTextInputFallback() {
    console.log('📝 Text input fallback activated');
    
    // Create text input element
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Type your command here...';
    textInput.id = 'voice-fallback-input';
    textInput.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      padding: 10px;
      border: 2px solid #00ff00;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: monospace;
      z-index: 10000;
    `;
    
    textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const command = e.target.value.trim();
        if (command) {
          console.log('📝 Text command received:', command);
          e.target.value = '';
          // Process command here
        }
      }
    });
    
    document.body.appendChild(textInput);
  }

  /**
   * Activate text narration fallback for voice synthesis
   */
  activateTextNarrationFallback() {
    console.log('📄 Text narration fallback activated');
    
    // Create text display element
    const textDisplay = document.createElement('div');
    textDisplay.id = 'narration-fallback-display';
    textDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 300px;
      padding: 15px;
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      font-family: serif;
      font-size: 14px;
      line-height: 1.4;
      border-radius: 8px;
      z-index: 10000;
      display: none;
    `;
    
    document.body.appendChild(textDisplay);
    
    // Function to show text narration
    window.showTextNarration = (text) => {
      textDisplay.textContent = text;
      textDisplay.style.display = 'block';
      
      setTimeout(() => {
        textDisplay.style.display = 'none';
      }, 5000);
    };
  }

  /**
   * Activate visual effects fallback for audio
   */
  activateVisualEffectsFallback() {
    console.log('✨ Visual effects fallback activated');
    this.audioErrorHandler.enableVisualEffects();
  }

  /**
   * Activate session-only fallback for game saves
   */
  activateSessionOnlyFallback() {
    console.log('⏱️ Session-only mode activated - progress will not persist');
    
    // Show notification to user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff6b6b;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 10001;
      font-family: sans-serif;
    `;
    notification.innerHTML = `
      <h3>⚠️ Limited Storage</h3>
      <p>Game progress will only be saved during this session.</p>
      <button onclick="this.parentElement.remove()">OK</button>
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Run comprehensive error handling tests
   */
  async runErrorHandlingTests() {
    console.log('🧪 Running Error Handling Tests...');
    
    // Test 1: Voice Error Handling
    await this.testVoiceErrorHandling();
    
    // Test 2: Audio Error Handling
    await this.testAudioErrorHandling();
    
    // Test 3: Game State Error Recovery
    await this.testGameStateErrorRecovery();
    
    console.log('✅ Error handling tests completed');
  }

  /**
   * Test voice error handling scenarios
   */
  async testVoiceErrorHandling() {
    console.log('🎤 Testing Voice Error Handling...');
    
    const testErrors = [
      { type: 'permission-denied', message: 'Microphone permission denied' },
      { type: 'network', message: 'Network connection failed' },
      { type: 'no-match', message: 'Command not recognized' }
    ];
    
    for (const errorData of testErrors) {
      const result = this.voiceErrorHandler.handleError(
        errorData,
        () => console.log(`🔄 Fallback activated for ${errorData.type}`),
        () => console.log(`🔁 Retry attempted for ${errorData.type}`)
      );
      
      console.log(`  ✓ ${errorData.type}: ${result.severity} severity`);
    }
  }

  /**
   * Test audio error handling scenarios
   */
  async testAudioErrorHandling() {
    console.log('🔊 Testing Audio Error Handling...');
    
    const testErrors = [
      { type: 'initialization', error: new Error('Audio context failed') },
      { type: 'ambient_playback', error: new Error('Ambient sound failed') },
      { type: 'voice_synthesis', error: new Error('Speech synthesis failed') }
    ];
    
    for (const { type, error } of testErrors) {
      this.audioErrorHandler.handleAudioError(type, error, { soundKey: 'test' });
      console.log(`  ✓ ${type}: Error handled gracefully`);
    }
  }

  /**
   * Test game state error recovery
   */
  async testGameStateErrorRecovery() {
    console.log('💾 Testing Game State Error Recovery...');
    
    try {
      // Test saving a checkpoint
      const testState = {
        currentTime: '01:30',
        fearLevel: 45,
        health: 75,
        isAlive: true,
        inventory: ['flashlight', 'key']
      };
      
      const saveResult = await this.gameStateManager.saveCheckpoint(testState, 'test');
      console.log(`  ✓ Checkpoint save: ${saveResult ? 'Success' : 'Failed'}`);
      
      // Test loading the checkpoint
      const loadResult = await this.gameStateManager.loadCheckpoint();
      console.log(`  ✓ Checkpoint load: ${loadResult ? 'Success' : 'Failed'}`);
      
      // Test checkpoint statistics
      const stats = this.gameStateManager.getCheckpointStats();
      console.log(`  ✓ Checkpoint stats: ${stats.totalCheckpoints} checkpoints`);
      
    } catch (error) {
      console.error('  ❌ Game state test failed:', error);
      this.logError('gamestate_test', error);
    }
  }

  /**
   * Simulate a voice command with error handling
   * @param {string} command - Voice command to simulate
   */
  async simulateVoiceCommand(command) {
    console.log(`🎤 Simulating voice command: "${command}"`);
    
    try {
      // Simulate random errors for demonstration
      const errorChance = Math.random();
      
      if (errorChance < 0.2) {
        // 20% chance of permission error
        throw new Error('Microphone permission denied');
      } else if (errorChance < 0.3) {
        // 10% chance of network error
        throw new Error('Network connection failed');
      } else if (errorChance < 0.4) {
        // 10% chance of recognition error
        throw new Error('Command not recognized');
      }
      
      // Success case
      console.log(`✅ Voice command processed: "${command}"`);
      return { success: true, command };
      
    } catch (error) {
      console.log(`❌ Voice command failed: ${error.message}`);
      
      const errorResult = this.voiceErrorHandler.handleError(
        {
          type: this.getErrorType(error.message),
          message: error.message,
          originalTranscript: command
        },
        () => this.activateTextInputFallback(),
        () => this.simulateVoiceCommand(command)
      );
      
      return { success: false, error: errorResult };
    }
  }

  /**
   * Get error type from error message
   * @param {string} message - Error message
   * @returns {string} Error type
   */
  getErrorType(message) {
    if (message.includes('permission')) return 'permission-denied';
    if (message.includes('network')) return 'network';
    if (message.includes('not recognized')) return 'no-match';
    return 'unknown';
  }

  /**
   * Log error for debugging and analytics
   * @param {string} type - Error type
   * @param {Error} error - Error object
   */
  logError(type, error) {
    const errorEntry = {
      type,
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    this.errorLog.push(errorEntry);
    console.error(`📊 Error logged:`, errorEntry);
  }

  /**
   * Get comprehensive error statistics
   * @returns {Object} Error statistics
   */
  getErrorStatistics() {
    return {
      compatibility: this.compatibility.getCompatibilitySummary(),
      voice: this.voiceErrorHandler.getErrorStatistics(),
      audio: this.audioErrorHandler.getErrorStats(),
      gameState: this.gameStateManager.getCheckpointStats(),
      system: {
        totalErrors: this.errorLog.length,
        errorsByType: this.errorLog.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {}),
        isInitialized: this.isInitialized
      }
    };
  }

  /**
   * Cleanup and destroy all error handlers
   */
  destroy() {
    console.log('🧹 Cleaning up Error Handling System...');
    
    this.voiceErrorHandler.reset();
    this.audioErrorHandler.resetFallbacks();
    this.gameStateManager.destroy();
    this.compatibility.reset();
    
    // Remove fallback UI elements
    const fallbackElements = [
      'voice-fallback-input',
      'narration-fallback-display'
    ];
    
    fallbackElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
    
    this.isInitialized = false;
    console.log('✅ Error handling system cleaned up');
  }
}

// Export singleton instance for easy use
export const errorHandlingDemo = new ErrorHandlingDemo();