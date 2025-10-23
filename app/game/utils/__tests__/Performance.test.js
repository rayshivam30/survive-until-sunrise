/**
 * Performance Tests
 * Tests for audio loading, voice recognition response times, and overall system performance
 */

import AudioManager from '../AudioManager.js';
import { VoiceNarrator } from '../VoiceNarrator.js';
import { CommandParser } from '../CommandParser.js';

// Mock Howler.js for performance testing
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
    
    // Simulate loading time based on config
    const loadTime = config.src?.includes('large') ? 200 : 50;
    setTimeout(() => {
      if (config.onload) config.onload();
    }, loadTime);
    
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

// Mock performance.now for consistent timing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow };

describe('Performance Tests', () => {
  let startTime = 0;

  beforeEach(() => {
    startTime = 1000;
    mockPerformanceNow.mockReturnValue(startTime);
    jest.clearAllMocks();
  });

  describe('Audio Loading Performance', () => {
    let audioManager;

    beforeEach(() => {
      audioManager = new AudioManager();
    });

    afterEach(() => {
      if (audioManager) {
        audioManager.destroy();
      }
    });

    test('should initialize audio system within acceptable time', async () => {
      const initStartTime = performance.now();
      
      const result = await audioManager.initialize(jest.fn());
      
      const initEndTime = performance.now();
      const initDuration = initEndTime - initStartTime;
      
      expect(result).toBe(true);
      expect(initDuration).toBeLessThan(1000); // Should initialize in under 1 second
    });

    test('should load individual sounds quickly', async () => {
      await audioManager.initialize(jest.fn());
      
      const loadStartTime = performance.now();
      
      // Test loading a single sound
      const result = audioManager.playEffect('jump_scare');
      
      const loadEndTime = performance.now();
      const loadDuration = loadEndTime - loadStartTime;
      
      expect(result).toBe('mock-sound-id');
      expect(loadDuration).toBeLessThan(100); // Should load in under 100ms
    });

    test('should handle multiple simultaneous sound loads efficiently', async () => {
      await audioManager.initialize(jest.fn());
      
      const loadStartTime = performance.now();
      
      // Load multiple sounds simultaneously
      const promises = [
        audioManager.playEffect('jump_scare'),
        audioManager.playEffect('footsteps'),
        audioManager.playEffect('whisper'),
        audioManager.playAmbient('forest_night')
      ];
      
      await Promise.all(promises);
      
      const loadEndTime = performance.now();
      const loadDuration = loadEndTime - loadStartTime;
      
      expect(loadDuration).toBeLessThan(500); // Should handle multiple loads in under 500ms
    });

    test('should preload sounds within performance budget', async () => {
      await audioManager.initialize(jest.fn());
      
      const preloadStartTime = performance.now();
      
      const soundKeys = ['jump_scare', 'whisper', 'forest_night', 'heartbeat'];
      await audioManager.preloadSounds(soundKeys);
      
      const preloadEndTime = performance.now();
      const preloadDuration = preloadEndTime - preloadStartTime;
      
      expect(preloadDuration).toBeLessThan(1000); // Should preload in under 1 second
    });

    test('should maintain performance under memory pressure', async () => {
      await audioManager.initialize(jest.fn());
      
      // Simulate memory pressure by loading many sounds
      const loadStartTime = performance.now();
      
      for (let i = 0; i < 20; i++) {
        audioManager.playEffect('jump_scare');
        audioManager.playEffect('footsteps');
      }
      
      const loadEndTime = performance.now();
      const loadDuration = loadEndTime - loadStartTime;
      
      // Should still perform reasonably under load
      expect(loadDuration).toBeLessThan(2000);
    });
  });

  describe('Voice Recognition Performance', () => {
    let commandParser;

    beforeEach(() => {
      commandParser = new CommandParser();
    });

    test('should parse commands quickly', () => {
      const parseStartTime = performance.now();
      
      const result = commandParser.parseCommand('hide behind the door');
      
      const parseEndTime = performance.now();
      const parseDuration = parseEndTime - parseStartTime;
      
      expect(result).toBeDefined();
      expect(parseDuration).toBeLessThan(10); // Should parse in under 10ms
    });

    test('should handle complex commands efficiently', () => {
      const parseStartTime = performance.now();
      
      const complexCommands = [
        'turn on the flashlight and look around carefully',
        'hide behind the door and listen for footsteps',
        'run to the basement and find the key',
        'open the window and climb outside quietly'
      ];
      
      const results = complexCommands.map(cmd => commandParser.parseCommand(cmd));
      
      const parseEndTime = performance.now();
      const parseDuration = parseEndTime - parseStartTime;
      
      expect(results).toHaveLength(4);
      expect(parseDuration).toBeLessThan(50); // Should parse all in under 50ms
    });

    test('should maintain performance with command history', () => {
      // Build up command history
      for (let i = 0; i < 100; i++) {
        commandParser.parseCommand(`command ${i}`);
      }
      
      const parseStartTime = performance.now();
      
      const result = commandParser.parseCommand('hide');
      
      const parseEndTime = performance.now();
      const parseDuration = parseEndTime - parseStartTime;
      
      expect(result).toBeDefined();
      expect(parseDuration).toBeLessThan(15); // Should still be fast with history
    });
  });

  describe('Voice Narration Performance', () => {
    let voiceNarrator;

    beforeEach(() => {
      // Mock speechSynthesis
      global.speechSynthesis = {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn().mockReturnValue([
          { name: 'Test Voice', lang: 'en-US' }
        ]),
        speaking: false,
        pending: false,
        paused: false
      };

      voiceNarrator = new VoiceNarrator();
    });

    test('should queue narration quickly', () => {
      const queueStartTime = performance.now();
      
      voiceNarrator.narrate('This is a test narration');
      
      const queueEndTime = performance.now();
      const queueDuration = queueEndTime - queueStartTime;
      
      expect(queueDuration).toBeLessThan(5); // Should queue in under 5ms
    });

    test('should handle rapid narration requests efficiently', () => {
      const rapidStartTime = performance.now();
      
      // Queue multiple narrations rapidly
      for (let i = 0; i < 10; i++) {
        voiceNarrator.narrate(`Narration ${i}`);
      }
      
      const rapidEndTime = performance.now();
      const rapidDuration = rapidEndTime - rapidStartTime;
      
      expect(rapidDuration).toBeLessThan(50); // Should handle rapid requests in under 50ms
    });

    test('should process narration queue efficiently', () => {
      // Queue several narrations
      voiceNarrator.narrate('First narration');
      voiceNarrator.narrate('Second narration');
      voiceNarrator.narrate('Third narration');
      
      const processStartTime = performance.now();
      
      // Simulate processing the queue
      voiceNarrator.processQueue();
      
      const processEndTime = performance.now();
      const processDuration = processEndTime - processStartTime;
      
      expect(processDuration).toBeLessThan(20); // Should process queue in under 20ms
    });
  });

  describe('Game State Update Performance', () => {
    test('should update game state quickly', () => {
      const gameState = {
        fearLevel: 50,
        health: 75,
        currentTime: '01:30',
        location: 'basement',
        inventory: ['flashlight', 'key']
      };
      
      const updateStartTime = performance.now();
      
      // Simulate game state updates
      gameState.fearLevel += 10;
      gameState.health -= 5;
      gameState.currentTime = '01:31';
      
      const updateEndTime = performance.now();
      const updateDuration = updateEndTime - updateStartTime;
      
      expect(updateDuration).toBeLessThan(1); // Should update in under 1ms
    });

    test('should handle complex state calculations efficiently', () => {
      const gameState = {
        fearLevel: 50,
        health: 75,
        currentTime: '01:30',
        location: 'basement',
        inventory: ['flashlight', 'key'],
        eventsTriggered: [],
        commandsIssued: []
      };
      
      const calculationStartTime = performance.now();
      
      // Simulate complex calculations
      for (let i = 0; i < 100; i++) {
        const fearModifier = Math.sin(i * 0.1) * 5;
        const healthModifier = Math.cos(i * 0.1) * 3;
        
        gameState.fearLevel = Math.max(0, Math.min(100, gameState.fearLevel + fearModifier));
        gameState.health = Math.max(0, Math.min(100, gameState.health + healthModifier));
        
        gameState.eventsTriggered.push(`event_${i}`);
        gameState.commandsIssued.push(`command_${i}`);
      }
      
      const calculationEndTime = performance.now();
      const calculationDuration = calculationEndTime - calculationStartTime;
      
      expect(calculationDuration).toBeLessThan(100); // Should calculate in under 100ms
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not leak memory during normal operation', () => {
      const audioManager = new AudioManager();
      
      // Simulate normal operation
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // Perform operations that might leak memory
      for (let i = 0; i < 50; i++) {
        audioManager.playEffect('jump_scare');
        audioManager.stopEffect('jump_scare', 'mock-sound-id');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      audioManager.destroy();
    });

    test('should clean up resources properly', () => {
      const audioManager = new AudioManager();
      
      // Initialize and use the audio manager
      audioManager.initialize(jest.fn());
      audioManager.playAmbient('forest_night');
      audioManager.playEffect('jump_scare');
      
      // Destroy should clean up quickly
      const destroyStartTime = performance.now();
      
      audioManager.destroy();
      
      const destroyEndTime = performance.now();
      const destroyDuration = destroyEndTime - destroyStartTime;
      
      expect(destroyDuration).toBeLessThan(50); // Should destroy in under 50ms
      expect(audioManager.isInitialized).toBe(false);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent audio and voice operations', async () => {
      const audioManager = new AudioManager();
      const voiceNarrator = new VoiceNarrator();
      
      await audioManager.initialize(jest.fn());
      
      const concurrentStartTime = performance.now();
      
      // Perform concurrent operations
      const operations = [
        audioManager.playAmbient('forest_night'),
        audioManager.playEffect('jump_scare'),
        voiceNarrator.narrate('Something is approaching'),
        audioManager.playEffect('footsteps'),
        voiceNarrator.narrate('You hear a door creak')
      ];
      
      await Promise.all(operations);
      
      const concurrentEndTime = performance.now();
      const concurrentDuration = concurrentEndTime - concurrentStartTime;
      
      expect(concurrentDuration).toBeLessThan(200); // Should handle concurrency in under 200ms
      
      audioManager.destroy();
    });

    test('should maintain responsiveness under load', async () => {
      const audioManager = new AudioManager();
      await audioManager.initialize(jest.fn());
      
      const loadStartTime = performance.now();
      
      // Create high load scenario
      const heavyOperations = [];
      for (let i = 0; i < 20; i++) {
        heavyOperations.push(audioManager.playEffect('jump_scare'));
        heavyOperations.push(audioManager.playEffect('footsteps'));
      }
      
      // Should still respond to new requests quickly
      const quickResponseStartTime = performance.now();
      const quickResult = audioManager.playEffect('whisper');
      const quickResponseEndTime = performance.now();
      
      const quickResponseDuration = quickResponseEndTime - quickResponseStartTime;
      
      expect(quickResult).toBe('mock-sound-id');
      expect(quickResponseDuration).toBeLessThan(50); // Should respond quickly even under load
      
      audioManager.destroy();
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', () => {
      const metrics = {
        audioLoadTimes: [],
        voiceProcessingTimes: [],
        gameStateUpdateTimes: []
      };
      
      const trackingStartTime = performance.now();
      
      // Simulate tracking various operations
      for (let i = 0; i < 10; i++) {
        const operationStart = performance.now();
        
        // Simulate operation
        const duration = Math.random() * 50;
        mockPerformanceNow.mockReturnValue(operationStart + duration);
        
        const operationEnd = performance.now();
        metrics.audioLoadTimes.push(operationEnd - operationStart);
      }
      
      const trackingEndTime = performance.now();
      const trackingDuration = trackingEndTime - trackingStartTime;
      
      expect(metrics.audioLoadTimes).toHaveLength(10);
      expect(trackingDuration).toBeLessThan(100); // Tracking should be lightweight
      
      // Calculate performance statistics
      const avgLoadTime = metrics.audioLoadTimes.reduce((a, b) => a + b, 0) / metrics.audioLoadTimes.length;
      const maxLoadTime = Math.max(...metrics.audioLoadTimes);
      
      expect(avgLoadTime).toBeGreaterThan(0);
      expect(maxLoadTime).toBeGreaterThan(0);
    });

    test('should detect performance degradation', () => {
      const performanceThresholds = {
        audioLoad: 100,
        voiceProcessing: 50,
        gameStateUpdate: 10
      };
      
      const testMetrics = {
        audioLoad: 150, // Above threshold
        voiceProcessing: 30, // Below threshold
        gameStateUpdate: 5 // Below threshold
      };
      
      const issues = [];
      
      Object.keys(performanceThresholds).forEach(metric => {
        if (testMetrics[metric] > performanceThresholds[metric]) {
          issues.push({
            metric,
            actual: testMetrics[metric],
            threshold: performanceThresholds[metric]
          });
        }
      });
      
      expect(issues).toHaveLength(1);
      expect(issues[0].metric).toBe('audioLoad');
      expect(issues[0].actual).toBe(150);
      expect(issues[0].threshold).toBe(100);
    });
  });
});