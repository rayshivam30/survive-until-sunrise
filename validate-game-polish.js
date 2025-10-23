#!/usr/bin/env node

/**
 * Game Polish Validation Script
 * 
 * Runs comprehensive validation of the polished game experience
 * Tests audio mixing, voice recognition, smooth transitions, visual polish, and performance
 */

import { GameEngine } from './app/game/engine/GameEngine.js';
import AudioManager from './app/game/utils/AudioManager.js';
import { VoiceNarrator } from './app/game/utils/VoiceNarrator.js';
import GameIntegrationValidator from './app/game/utils/GameIntegrationValidator.js';

// Mock browser APIs for Node.js environment
global.window = {
  SpeechRecognition: function() {
    return {
      start: () => {},
      stop: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  },
  speechSynthesis: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => [],
    addEventListener: () => {}
  },
  SpeechSynthesisUtterance: function() {},
  AudioContext: function() {
    return {
      createGain: () => ({
        connect: () => {},
        gain: { value: 1 }
      }),
      createOscillator: () => ({
        connect: () => {},
        start: () => {},
        stop: () => {},
        frequency: { value: 440 }
      }),
      destination: {}
    };
  },
  matchMedia: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  }),
  getComputedStyle: () => ({
    transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    animation: 'none',
    textShadow: '0 0 5px currentColor'
  }),
  performance: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024 // 50MB
    }
  }
};

global.document = {
  createElement: (tag) => ({
    className: '',
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
    classList: {
      add: () => {},
      remove: () => {}
    }
  },
  head: {
    appendChild: () => {}
  },
  getElementById: () => null
};

global.navigator = {
  mediaDevices: {
    getUserMedia: () => Promise.resolve({})
  }
};

// Mock Howler.js
const mockHowl = {
  load: () => {},
  play: () => 1,
  stop: () => {},
  volume: () => {},
  fade: () => {},
  playing: () => false,
  unload: () => {}
};

global.Howl = function() { return mockHowl; };
global.Howler = { volume: () => {} };

async function runValidation() {
  console.log('🎮 Starting Game Polish Validation...\n');

  try {
    // Initialize game systems
    console.log('📦 Initializing game systems...');
    
    const audioManager = new AudioManager();
    await audioManager.initialize();
    
    const voiceNarrator = new VoiceNarrator();
    const gameEngine = new GameEngine(audioManager, null, voiceNarrator);
    
    console.log('✅ Game systems initialized\n');

    // Run comprehensive validation
    console.log('🔍 Running comprehensive validation...\n');
    
    const validator = new GameIntegrationValidator();
    const results = await validator.validateComplete(gameEngine);
    
    // Generate and display report
    const report = validator.generateReport();
    
    // Cleanup
    gameEngine.destroy();
    
    // Exit with appropriate code
    const exitCode = report.overall.passed ? 0 : 1;
    console.log(`\n🏁 Validation ${report.overall.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Final Score: ${report.overall.score}%\n`);
    
    if (report.overall.passed) {
      console.log('🎉 Game polish validation successful! The game is ready for production.');
    } else {
      console.log('❌ Game polish validation failed. Please address the issues above.');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('💥 Validation failed with error:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}

export { runValidation };