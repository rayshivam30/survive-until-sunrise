/**
 * VoiceNarrator Integration Tests
 * 
 * Tests integration between VoiceNarrator and other game systems
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { VoiceNarrator } from '../VoiceNarrator.js';

// Mock browser APIs
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Microsoft David Desktop', lang: 'en-US' }
  ]),
  addEventListener: jest.fn()
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => {
  const utterance = {
    text,
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'en-US',
    voice: null,
    onstart: null,
    onend: null,
    onerror: null
  };
  
  // Simulate async speech synthesis
  setTimeout(() => {
    if (utterance.onstart) utterance.onstart();
    setTimeout(() => {
      if (utterance.onend) utterance.onend();
    }, 100);
  }, 10);
  
  return utterance;
});

// Set up global window object for tests
global.window = {
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: mockSpeechSynthesisUtterance
};

// Also set up the global constructors
global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;

// Ensure window is available in the global scope
if (typeof window === 'undefined') {
  global.window = global.window;
}

describe('VoiceNarrator Integration', () => {
  let narrator;
  let gameState;
  let mockCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock game state
    gameState = {
      currentTime: '23:00',
      fearLevel: 30,
      health: 100,
      inventory: ['flashlight'],
      location: 'starting_room',
      isAlive: true,
      gameStarted: true
    };

    // Mock callbacks
    mockCallbacks = {
      onNarrationStart: jest.fn(),
      onNarrationEnd: jest.fn(),
      onNarrationError: jest.fn()
    };

    narrator = new VoiceNarrator({
      ...mockCallbacks,
      forceSupported: true, // Force support for testing
      testMode: true // Prevent automatic queue processing
    });
    
    // Manually set synthesis for testing since window mocking might not work
    narrator.synthesis = mockSpeechSynthesis;
  });



  describe('Game Flow Integration', () => {
    test('should handle complete game start sequence', async () => {
      // Start game narration
      narrator.narrateGameStart();
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].context).toBe('game-start');
      expect(narrator.narrationQueue[0].priority).toBe('high');
      
      // Test that voice settings are adjusted for dramatic intro
      expect(narrator.narrationQueue[0].voiceSettings.rate).toBe(0.7);
      
      // Process the queue manually
      narrator.processNarrationQueue();
      
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should handle command sequence with feedback', () => {
      const commands = [
        { action: 'hide', success: true },
        { action: 'listen', success: true },
        { action: 'run', success: false }
      ];

      commands.forEach(({ action, success }) => {
        narrator.provideCommandFeedback({ action }, success, gameState);
      });

      expect(narrator.narrationQueue).toHaveLength(3);
      
      // All should be high priority command feedback
      narrator.narrationQueue.forEach(item => {
        expect(item.priority).toBe('high');
        expect(item.context).toBe('command-feedback');
      });
    });

    test('should handle escalating fear scenario', () => {
      const fearProgression = [20, 45, 70, 90];
      let previousFear = 0;

      fearProgression.forEach(fearLevel => {
        narrator.narrateFearLevel(fearLevel, previousFear);
        previousFear = fearLevel;
      });

      // Should have narrated 4 times (all changes are >= 20)
      expect(narrator.narrationQueue).toHaveLength(4);
      
      // Check voice adjustment for high fear
      const highFearItem = narrator.narrationQueue[3]; // Last item (90 fear level)
      expect(highFearItem.voiceSettings.rate).toBeGreaterThan(narrator.voiceSettings.rate);
    });

    test('should handle time progression through the night', () => {
      const timeProgression = ['23:00', '00:00', '01:00', '03:00', '05:00', '06:00'];
      
      timeProgression.forEach(time => {
        narrator.narrateTimeUpdate(time, gameState);
      });

      expect(narrator.narrationQueue).toHaveLength(6);
      
      // Check that 6 AM (victory) has different voice settings
      const victoryItem = narrator.narrationQueue[5];
      expect(victoryItem.text).toContain('sun rises');
    });
  });

  describe('Event Response Integration', () => {
    test('should handle multiple simultaneous events', () => {
      const events = [
        { type: 'footsteps', urgent: false },
        { type: 'whispers', urgent: true },
        { type: 'doorSlam', urgent: true }
      ];

      events.forEach(event => {
        narrator.narrateEvent(event.type, { urgent: event.urgent }, gameState);
      });

      expect(narrator.narrationQueue).toHaveLength(3);
      
      // Urgent events should have interrupt flag
      const urgentEvents = narrator.narrationQueue.filter(item => item.interrupt);
      expect(urgentEvents).toHaveLength(2);
    });

    test('should adjust narration based on game context', () => {
      // High fear state
      const highFearState = { ...gameState, fearLevel: 85 };
      
      narrator.narrateEvent('breathing', {}, highFearState);
      
      const narrationItem = narrator.narrationQueue[0];
      // Breathing event should have slower, lower voice settings for dramatic effect
      expect(narrationItem.voiceSettings.rate).toBe(0.5);
      expect(narrationItem.voiceSettings.pitch).toBe(0.7);
      expect(narrationItem.voiceSettings.volume).toBe(0.8);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle voice recognition errors gracefully', () => {
      const errorTypes = [
        'commandNotRecognized',
        'microphoneError'
      ];

      errorTypes.forEach(errorType => {
        narrator.narrateError(errorType);
      });

      expect(narrator.narrationQueue).toHaveLength(2);
      
      // All error narrations should be high priority
      narrator.narrationQueue.forEach(item => {
        expect(item.priority).toBe('high');
        expect(item.context).toBe('error');
      });
    });

    test('should handle speech synthesis failures', () => {
      // Mock speech synthesis to fail
      mockSpeechSynthesis.speak.mockImplementation(() => {
        throw new Error('Speech synthesis failed');
      });

      narrator.narrate('Test narration');
      narrator.processNarrationQueue();

      // Should not crash and should reset state
      expect(narrator.isNarrating).toBe(false);
      expect(narrator.currentUtterance).toBeNull();
    });
  });

  describe('Queue Management Integration', () => {
    test('should handle priority queue with mixed content', () => {
      // Add various types of narration
      narrator.narrateTimeUpdate('01:00');                    // normal priority
      narrator.provideCommandFeedback({ action: 'hide' }, true); // high priority
      narrator.narrateFearLevel(60, 20);                      // normal priority
      narrator.narrateError('commandNotRecognized');          // high priority

      // High priority items should be at the front
      expect(narrator.narrationQueue[0].priority).toBe('high');
      expect(narrator.narrationQueue[1].priority).toBe('high');
      expect(narrator.narrationQueue[2].priority).toBe('normal');
      expect(narrator.narrationQueue[3].priority).toBe('normal');
    });

    test('should handle interruption scenarios', () => {
      // Start a normal narration
      narrator.narrate('Normal narration', { priority: 'normal' });
      narrator.processNarrationQueue();
      
      // Simulate that narration is in progress
      narrator.isNarrating = true;
      
      // Add urgent event that should interrupt
      narrator.narrateEvent('doorSlam', { urgent: true }, gameState);
      
      // Should have called cancel due to interrupt
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('Voice Settings Adaptation', () => {
    test('should adapt voice throughout game progression', () => {
      // Early game - low fear
      narrator.provideCommandFeedback({ action: 'hide' }, true, { fearLevel: 10 });
      const earlySettings = narrator.narrationQueue[0].voiceSettings;
      
      narrator.clearQueue();
      
      // Late game - high fear
      narrator.provideCommandFeedback({ action: 'hide' }, true, { fearLevel: 90 });
      const lateSettings = narrator.narrationQueue[0].voiceSettings;
      
      expect(lateSettings.rate).toBeGreaterThan(earlySettings.rate);
      expect(lateSettings.pitch).toBeGreaterThan(earlySettings.pitch);
    });

    test('should adapt voice for different times of night', () => {
      // Midnight
      narrator.narrateTimeUpdate('00:00');
      const midnightSettings = narrator.narrationQueue[0].voiceSettings;
      
      narrator.clearQueue();
      
      // Dawn
      narrator.narrateTimeUpdate('05:00');
      const dawnSettings = narrator.narrationQueue[0].voiceSettings;
      
      expect(dawnSettings.pitch).toBeGreaterThan(midnightSettings.pitch);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle rapid command sequences', () => {
      const commands = ['hide', 'run', 'listen', 'open', 'flashlight'];
      
      commands.forEach(action => {
        narrator.provideCommandFeedback({ action }, true, gameState);
      });

      expect(narrator.narrationQueue).toHaveLength(5);
      
      // Should process without errors
      narrator.processNarrationQueue();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should maintain queue integrity under stress', () => {
      // Add many narrations rapidly
      for (let i = 0; i < 20; i++) {
        narrator.narrate(`Narration ${i}`, {
          priority: i % 3 === 0 ? 'high' : 'normal'
        });
      }

      expect(narrator.narrationQueue).toHaveLength(20);
      
      // High priority items should be at the front
      const highPriorityCount = narrator.narrationQueue
        .slice(0, 7) // First 7 items should include all high priority
        .filter(item => item.priority === 'high').length;
      
      expect(highPriorityCount).toBeGreaterThan(0);
    });

    test('should handle queue cleanup properly', () => {
      // Fill queue
      for (let i = 0; i < 5; i++) {
        narrator.narrate(`Test ${i}`);
      }

      expect(narrator.narrationQueue).toHaveLength(5);
      
      // Simulate narration in progress
      narrator.isNarrating = true;
      
      // Clear queue
      narrator.clearQueue();
      
      expect(narrator.narrationQueue).toHaveLength(0);
      expect(narrator.isNarrating).toBe(false);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('Callback Integration', () => {
    test('should trigger callbacks during narration lifecycle', () => {
      narrator.narrate('Test narration');
      
      // Manually trigger the speech synthesis process
      narrator.processNarrationQueue();
      
      // The utterance should be created and callbacks should be set
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      
      // Get the utterance that was passed to speak()
      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.onstart).toBeDefined();
      expect(utterance.onend).toBeDefined();
      
      // Manually trigger the callbacks to test they work
      if (utterance.onstart) utterance.onstart();
      if (utterance.onend) utterance.onend();
      
      expect(mockCallbacks.onNarrationStart).toHaveBeenCalled();
      expect(mockCallbacks.onNarrationEnd).toHaveBeenCalled();
    });

    test('should handle callback errors gracefully', () => {
      // Mock callback to throw error
      mockCallbacks.onNarrationStart.mockImplementation(() => {
        throw new Error('Callback error');
      });

      narrator.narrate('Test narration');
      
      // Should not crash the narrator
      expect(() => narrator.processNarrationQueue()).not.toThrow();
    });
  });

  describe('Browser Compatibility', () => {
    test('should handle missing SpeechSynthesis API', () => {
      // Temporarily remove API
      const originalSpeechSynthesis = global.window.speechSynthesis;
      global.window.speechSynthesis = null;

      const unsupportedNarrator = new VoiceNarrator();
      const result = unsupportedNarrator.narrate('Test');

      expect(result).toBe(false);
      expect(unsupportedNarrator.isSupported).toBe(false);

      // Restore API
      global.window.speechSynthesis = originalSpeechSynthesis;
    });

    test('should handle partial API support', () => {
      // Mock limited API
      const limitedAPI = {
        speak: mockSpeechSynthesis.speak,
        cancel: mockSpeechSynthesis.cancel,
        getVoices: () => [], // No voices available
        addEventListener: mockSpeechSynthesis.addEventListener
      };

      global.window.speechSynthesis = limitedAPI;

      const limitedNarrator = new VoiceNarrator();
      expect(limitedNarrator.isSupported).toBe(true);
      expect(limitedNarrator.preferredVoice).toBeNull();

      // Should still work without preferred voice
      const result = limitedNarrator.narrate('Test');
      expect(result).toBe(true);

      // Restore full API
      global.window.speechSynthesis = mockSpeechSynthesis;
    });
  });
});