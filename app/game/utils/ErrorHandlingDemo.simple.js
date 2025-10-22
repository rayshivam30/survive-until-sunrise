/**
 * Simple Error Handling Demonstration
 * Shows how the error handling systems work in practice
 */

import { VoiceErrorHandler } from './VoiceErrorHandler.js';
import AudioErrorHandler from './AudioErrorHandler.js';
import { GameStateManager } from './GameStateManager.js';
import { BrowserCompatibility } from './BrowserCompatibility.js';

/**
 * Demonstrate error handling capabilities
 */
export function demonstrateErrorHandling() {
  console.log('🔧 Error Handling System Demonstration');
  console.log('=====================================');

  // 1. Voice Error Handling Demo
  console.log('\n1. 🎤 Voice Error Handling:');
  const voiceHandler = new VoiceErrorHandler();
  
  // Simulate permission denied error
  const voiceError = voiceHandler.handleError(
    {
      type: 'permission-denied',
      message: 'Microphone access denied',
      originalTranscript: 'look around'
    },
    () => console.log('   ✅ Text input fallback activated'),
    () => console.log('   🔄 Retry attempted')
  );
  
  console.log(`   📊 Error Type: ${voiceError.type}`);
  console.log(`   📊 Severity: ${voiceError.severity}`);
  console.log(`   📊 Fallback Needed: ${voiceError.shouldActivateFallback}`);

  // 2. Audio Error Handling Demo
  console.log('\n2. 🔊 Audio Error Handling:');
  const audioHandler = new AudioErrorHandler();
  
  // Simulate audio initialization failure
  audioHandler.handleAudioError(
    'initialization',
    new Error('Web Audio API not supported'),
    { component: 'AudioManager' }
  );
  
  console.log(`   📊 Silent Mode: ${audioHandler.fallbacksEnabled.silentMode}`);
  console.log(`   📊 Visual Effects: ${audioHandler.fallbacksEnabled.visualEffects}`);

  // 3. Game State Management Demo
  console.log('\n3. 💾 Game State Management:');
  const gameStateManager = new GameStateManager(null, { 
    autoSaveInterval: 0,
    storageKey: 'demo-game'
  });
  
  console.log(`   📊 Storage Available: ${gameStateManager.storageAvailable}`);
  
  // Simulate saving game state
  const demoGameState = {
    currentTime: '01:30',
    fearLevel: 45,
    health: 75,
    isAlive: true,
    inventory: ['flashlight', 'key']
  };
  
  gameStateManager.saveCheckpoint(demoGameState, 'demo').then(result => {
    console.log(`   📊 Save Result: ${result ? 'Success' : 'Failed'}`);
  });

  // 4. Browser Compatibility Demo
  console.log('\n4. 🌐 Browser Compatibility:');
  const compatibility = new BrowserCompatibility();
  
  // Mock some methods to avoid JSDOM issues in demo
  compatibility.checkWebGL = () => ({ supported: false, message: 'WebGL not available in demo' });
  compatibility.checkHTTPS = () => ({ supported: true, message: 'Demo environment secure' });
  
  const compatResults = compatibility.checkCompatibility();
  
  console.log(`   📊 Overall Compatibility: ${compatResults.overall}`);
  console.log(`   📊 Compatibility Score: ${Math.round((compatResults.score / compatResults.maxScore) * 100)}%`);
  console.log(`   📊 Critical Issues: ${compatResults.errors.filter(e => e.severity === 'high').length}`);
  console.log(`   📊 Warnings: ${compatResults.warnings.length}`);

  // 5. Error Statistics Demo
  console.log('\n5. 📈 Error Statistics:');
  
  // Generate some test errors
  voiceHandler.handleError({ type: 'network', message: 'Network timeout' });
  voiceHandler.handleError({ type: 'no-match', message: 'Command not recognized' });
  audioHandler.handleAudioError('ambient_playback', new Error('Ambient sound failed'));
  
  const voiceStats = voiceHandler.getErrorStatistics();
  const audioStats = audioHandler.getErrorStats();
  const stateStats = gameStateManager.getCheckpointStats();
  
  console.log(`   📊 Voice Errors: ${voiceStats.totalErrors}`);
  console.log(`   📊 Audio Errors: ${audioStats.totalErrors}`);
  console.log(`   📊 Checkpoints: ${stateStats.totalCheckpoints}`);

  // 6. Fallback Strategies Demo
  console.log('\n6. 🔄 Fallback Strategies:');
  
  const mockResults = {
    features: {
      speechRecognition: { supported: false },
      speechSynthesis: { supported: false },
      audioContext: { supported: false },
      localStorage: { supported: true }
    }
  };
  
  const fallbacks = compatibility.generateFallbacks(mockResults);
  
  console.log('   Available Fallbacks:');
  fallbacks.forEach(fallback => {
    console.log(`   - ${fallback.feature}: ${fallback.strategy} (${fallback.priority} priority)`);
  });

  // 7. Recommendations Demo
  console.log('\n7. 💡 Recommendations:');
  
  const recommendations = compatibility.generateRecommendations({
    overall: 'poor',
    features: {
      https: { supported: false },
      speechRecognition: { supported: false },
      localStorage: { supported: false },
      audioContext: { supported: false }
    }
  });
  
  console.log('   Recommended Actions:');
  recommendations.forEach(rec => {
    console.log(`   - ${rec.type}: ${rec.message} (${rec.priority} priority)`);
  });

  // Cleanup
  gameStateManager.destroy();
  
  console.log('\n✅ Error Handling Demonstration Complete!');
  console.log('=====================================');
  
  return {
    voiceErrors: voiceStats.totalErrors,
    audioErrors: audioStats.totalErrors,
    compatibility: compatResults.overall,
    fallbacksAvailable: fallbacks.length,
    recommendationsCount: recommendations.length
  };
}

/**
 * Test error recovery scenarios
 */
export function demonstrateErrorRecovery() {
  console.log('\n🔄 Error Recovery Demonstration');
  console.log('===============================');

  const voiceHandler = new VoiceErrorHandler();
  let recoveryAttempts = 0;
  
  // Simulate recovery scenario
  const simulateRecovery = () => {
    recoveryAttempts++;
    console.log(`   🔄 Recovery attempt ${recoveryAttempts}`);
    
    if (recoveryAttempts < 3) {
      // Simulate continued failure
      voiceHandler.handleError(
        { type: 'network', message: `Network error attempt ${recoveryAttempts}` },
        () => console.log('   ✅ Fallback activated after retries'),
        simulateRecovery
      );
    } else {
      console.log('   ✅ Recovery successful after 3 attempts');
    }
  };
  
  // Start recovery process
  voiceHandler.handleError(
    { type: 'network', message: 'Initial network failure' },
    () => console.log('   ✅ Fallback activated'),
    simulateRecovery
  );
  
  console.log('✅ Error Recovery Demonstration Complete!');
  
  return {
    recoveryAttempts,
    finalState: 'recovered'
  };
}

/**
 * Demonstrate cross-system error coordination
 */
export function demonstrateCrossSystemErrors() {
  console.log('\n🔗 Cross-System Error Coordination');
  console.log('==================================');

  // Create mock game engine for coordination
  const mockGameEngine = {
    errors: [],
    notifications: [],
    
    notifyError: function(type, details) {
      this.errors.push({ type, details, timestamp: Date.now() });
      console.log(`   🚨 Game Engine notified: ${type}`);
    },
    
    notifyAudioIssue: function(message) {
      this.notifications.push({ type: 'audio', message, timestamp: Date.now() });
      console.log(`   🔊 Audio issue: ${message}`);
    },
    
    enableVisualEffects: function() {
      console.log('   ✨ Visual effects enabled as audio fallback');
    },
    
    enableTextNarration: function() {
      console.log('   📝 Text narration enabled as voice fallback');
    }
  };

  // Set up coordinated error handling
  const voiceHandler = new VoiceErrorHandler();
  const audioHandler = new AudioErrorHandler(mockGameEngine);
  const gameStateManager = new GameStateManager(mockGameEngine, { autoSaveInterval: 0 });

  // Simulate coordinated errors
  console.log('\n   Simulating coordinated system failures...');
  
  // 1. Voice system failure
  voiceHandler.handleError(
    { type: 'permission-denied', message: 'Microphone blocked' },
    () => mockGameEngine.enableTextNarration()
  );
  
  // 2. Audio system failure
  audioHandler.handleAudioError(
    'voice_synthesis',
    new Error('Text-to-speech failed'),
    { text: 'Game narration' }
  );
  
  // 3. Storage system failure (simulated)
  console.log('   💾 Storage system: Quota exceeded, activating cleanup');
  mockGameEngine.notifyError('storage_full', {
    error: 'Storage quota exceeded',
    action: 'cleanup_initiated'
  });

  // Show coordination results
  console.log('\n   📊 Coordination Results:');
  console.log(`   - Game Engine Errors: ${mockGameEngine.errors.length}`);
  console.log(`   - Audio Notifications: ${mockGameEngine.notifications.length}`);
  console.log(`   - Fallbacks Activated: ${audioHandler.fallbacksEnabled.textNarration ? 'Yes' : 'No'}`);

  gameStateManager.destroy();
  
  console.log('✅ Cross-System Coordination Complete!');
  
  return {
    totalErrors: mockGameEngine.errors.length,
    totalNotifications: mockGameEngine.notifications.length,
    systemsCoordinated: 3
  };
}

// Export for use in other modules
export default {
  demonstrateErrorHandling,
  demonstrateErrorRecovery,
  demonstrateCrossSystemErrors
};