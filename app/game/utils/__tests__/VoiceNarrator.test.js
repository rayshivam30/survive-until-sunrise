/**
 * VoiceNarrator Test Suite
 * 
 * Tests for the voice narration and feedback system
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { VoiceNarrator } from '../VoiceNarrator.js';

// Mock SpeechSynthesis API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Microsoft David Desktop', lang: 'en-US' },
    { name: 'Alex', lang: 'en-US' }
  ]),
  addEventListener: jest.fn()
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'en-US',
  voice: null,
  onstart: null,
  onend: null,
  onerror: null
}));

// Setup global mocks
global.window = {
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: mockSpeechSynthesisUtterance
};

describe('VoiceNarrator', () => {
  let narrator;
  let mockCallbacks;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock callbacks
    mockCallbacks = {
      onNarrationStart: jest.fn(),
      onNarrationEnd: jest.fn(),
      onNarrationError: jest.fn()
    };

    // Create narrator instance
    narrator = new VoiceNarrator(mockCallbacks);
  });

  describe('Initialization', () => {
    test('should initialize with default settings', () => {
      expect(narrator.isSupported).toBe(true);
      expect(narrator.voiceSettings.rate).toBe(0.8);
      expect(narrator.voiceSettings.pitch).toBe(0.9);
      expect(narrator.voiceSettings.volume).toBe(0.9);
      expect(narrator.narrationQueue).toEqual([]);
      expect(narrator.isNarrating).toBe(false);
    });

    test('should initialize with custom settings', () => {
      const customNarrator = new VoiceNarrator({
        rate: 1.0,
        pitch: 1.2,
        volume: 0.8,
        lang: 'en-GB'
      });

      expect(customNarrator.voiceSettings.rate).toBe(1.0);
      expect(customNarrator.voiceSettings.pitch).toBe(1.2);
      expect(customNarrator.voiceSettings.volume).toBe(0.8);
      expect(customNarrator.voiceSettings.lang).toBe('en-GB');
    });

    test('should handle unsupported browser', () => {
      // Temporarily remove speechSynthesis
      const originalSpeechSynthesis = global.window.speechSynthesis;
      global.window.speechSynthesis = null;

      const unsupportedNarrator = new VoiceNarrator();
      expect(unsupportedNarrator.isSupported).toBe(false);

      // Restore speechSynthesis
      global.window.speechSynthesis = originalSpeechSynthesis;
    });
  });

  describe('Voice Selection', () => {
    test('should select preferred voice', () => {
      // Simulate voice loading
      narrator.initializeVoice();
      
      // Should attempt to get voices
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled();
    });

    test('should handle empty voices list', () => {
      mockSpeechSynthesis.getVoices.mockReturnValue([]);
      
      const emptyVoicesNarrator = new VoiceNarrator();
      expect(emptyVoicesNarrator.preferredVoice).toBeNull();
    });
  });

  describe('Basic Narration', () => {
    test('should add narration to queue', () => {
      const result = narrator.narrate('Test narration');
      
      expect(result).toBe(true);
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toBe('Test narration');
    });

    test('should handle narration with options', () => {
      narrator.narrate('High priority test', {
        priority: 'high',
        interrupt: true,
        context: 'test'
      });

      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].priority).toBe('high');
      expect(narrator.narrationQueue[0].interrupt).toBe(true);
      expect(narrator.narrationQueue[0].context).toBe('test');
    });

    test('should prioritize high priority narrations', () => {
      narrator.narrate('Normal priority', { priority: 'normal' });
      narrator.narrate('High priority', { priority: 'high' });
      narrator.narrate('Low priority', { priority: 'low' });

      expect(narrator.narrationQueue[0].text).toBe('High priority');
      expect(narrator.narrationQueue[1].text).toBe('Normal priority');
      expect(narrator.narrationQueue[2].text).toBe('Low priority');
    });

    test('should return false for unsupported browser', () => {
      narrator.isSupported = false;
      const result = narrator.narrate('Test');
      
      expect(result).toBe(false);
      expect(narrator.narrationQueue).toHaveLength(0);
    });
  });

  describe('Queue Management', () => {
    test('should process narration queue', () => {
      narrator.narrate('First narration');
      narrator.narrate('Second narration');

      expect(narrator.narrationQueue).toHaveLength(2);
      
      // Mock that we're not currently narrating
      narrator.isNarrating = false;
      narrator.processNarrationQueue();

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should not process queue when already narrating', () => {
      narrator.isNarrating = true;
      narrator.narrate('Test narration');
      
      narrator.processNarrationQueue();
      
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    test('should clear queue', () => {
      narrator.narrate('First');
      narrator.narrate('Second');
      
      expect(narrator.narrationQueue).toHaveLength(2);
      
      narrator.clearQueue();
      
      expect(narrator.narrationQueue).toHaveLength(0);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    test('should stop current narration', () => {
      narrator.isNarrating = true;
      narrator.stopCurrentNarration();
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(narrator.isNarrating).toBe(false);
      expect(narrator.currentUtterance).toBeNull();
    });
  });

  describe('Command Feedback', () => {
    test('should provide successful command feedback', () => {
      const command = { action: 'hide' };
      const gameState = { fearLevel: 30 };
      
      narrator.provideCommandFeedback(command, true, gameState);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].priority).toBe('high');
      expect(narrator.narrationQueue[0].context).toBe('command-feedback');
    });

    test('should provide failed command feedback', () => {
      const command = { action: 'run' };
      const gameState = { fearLevel: 80 };
      
      narrator.provideCommandFeedback(command, false, gameState);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('legs feel like lead');
    });

    test('should handle unknown command feedback', () => {
      const command = { action: 'unknown' };
      
      narrator.provideCommandFeedback(command, true);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('unknown command executed successfully');
    });
  });

  describe('Event Narration', () => {
    test('should narrate known events', () => {
      narrator.narrateEvent('footsteps', {}, { fearLevel: 50 });
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].context).toBe('event');
      expect(narrator.narrationQueue[0].text).toContain('footsteps');
    });

    test('should narrate custom event data', () => {
      const eventData = { narration: 'A custom scary event occurs' };
      
      narrator.narrateEvent('custom', eventData);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toBe('A custom scary event occurs');
    });

    test('should handle urgent events with interruption', () => {
      narrator.isNarrating = true;
      const eventData = { urgent: true };
      
      narrator.narrateEvent('doorSlam', eventData);
      
      expect(narrator.narrationQueue[0].interrupt).toBe(true);
    });
  });

  describe('Fear Level Narration', () => {
    test('should narrate significant fear level changes', () => {
      narrator.narrateFearLevel(70, 30);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].context).toBe('fear-update');
    });

    test('should not narrate small fear level changes', () => {
      narrator.narrateFearLevel(35, 30);
      
      expect(narrator.narrationQueue).toHaveLength(0);
    });

    test('should categorize fear levels correctly', () => {
      // Test high fear
      narrator.narrateFearLevel(80, 20);
      expect(narrator.narrationQueue[0].text).toContain('Terror grips');
      
      narrator.clearQueue();
      
      // Test medium fear
      narrator.narrateFearLevel(50, 10);
      expect(narrator.narrationQueue[0].text).toContain('heart is racing');
      
      narrator.clearQueue();
      
      // Test low fear
      narrator.narrateFearLevel(20, 60);
      expect(narrator.narrationQueue[0].text).toContain('relatively calm');
    });
  });

  describe('Time Updates', () => {
    test('should narrate time updates', () => {
      narrator.narrateTimeUpdate('00:00');
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('Midnight');
      expect(narrator.narrationQueue[0].context).toBe('time-update');
    });

    test('should handle unknown time', () => {
      narrator.narrateTimeUpdate('13:00');
      
      expect(narrator.narrationQueue).toHaveLength(0);
    });

    test('should adjust voice for different times', () => {
      const morningSettings = narrator.adjustVoiceForTime('05:00');
      const nightSettings = narrator.adjustVoiceForTime('03:00');
      
      expect(morningSettings.pitch).toBeGreaterThan(nightSettings.pitch);
    });
  });

  describe('Game State Narration', () => {
    test('should narrate game start', () => {
      narrator.narrateGameStart();
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].priority).toBe('high');
      expect(narrator.narrationQueue[0].context).toBe('game-start');
      expect(narrator.narrationQueue[0].voiceSettings.rate).toBe(0.7);
    });

    test('should narrate victory', () => {
      narrator.narrateGameEnd(true);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('survived');
      expect(narrator.narrationQueue[0].interrupt).toBe(true);
    });

    test('should narrate defeat', () => {
      narrator.narrateGameEnd(false);
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('darkness has claimed');
      expect(narrator.narrationQueue[0].voiceSettings.pitch).toBe(0.7);
    });
  });

  describe('Error Handling', () => {
    test('should narrate known errors', () => {
      narrator.narrateError('commandNotRecognized');
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain("didn't understand");
      expect(narrator.narrationQueue[0].priority).toBe('high');
    });

    test('should narrate custom error messages', () => {
      narrator.narrateError('custom', 'Custom error message');
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toBe('Custom error message');
    });

    test('should provide fallback error message', () => {
      narrator.narrateError('unknown');
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('Something went wrong');
    });
  });

  describe('Voice Adjustment', () => {
    test('should adjust voice for fear levels', () => {
      const lowFearSettings = narrator.adjustVoiceForFear(20);
      const highFearSettings = narrator.adjustVoiceForFear(80);
      
      expect(highFearSettings.rate).toBeGreaterThan(lowFearSettings.rate);
      expect(highFearSettings.pitch).toBeGreaterThan(lowFearSettings.pitch);
    });

    test('should adjust voice for different event types', () => {
      const whisperSettings = narrator.adjustVoiceForEvent('whispers', 30);
      const doorSlamSettings = narrator.adjustVoiceForEvent('doorSlam', 30);
      
      expect(whisperSettings.rate).toBeLessThan(doorSlamSettings.rate);
      expect(whisperSettings.volume).toBeLessThan(doorSlamSettings.volume);
    });

    test('should not exceed voice setting limits', () => {
      const extremeSettings = narrator.adjustVoiceForFear(100);
      
      expect(extremeSettings.rate).toBeLessThanOrEqual(1.2);
      expect(extremeSettings.pitch).toBeLessThanOrEqual(1.5);
    });
  });

  describe('Utility Methods', () => {
    test('should get random response from array', () => {
      const responses = ['Response 1', 'Response 2', 'Response 3'];
      const response = narrator.getRandomResponse(responses);
      
      expect(responses).toContain(response);
    });

    test('should handle empty response array', () => {
      const response = narrator.getRandomResponse([]);
      
      expect(response).toBe('Something happens in the darkness.');
    });

    test('should get queue status', () => {
      narrator.narrate('Test');
      const status = narrator.getQueueStatus();
      
      expect(status.isNarrating).toBe(false);
      expect(status.queueLength).toBe(1);
      expect(status.isSupported).toBe(true);
    });

    test('should update voice settings', () => {
      narrator.updateVoiceSettings({ rate: 1.5, pitch: 1.3 });
      
      expect(narrator.voiceSettings.rate).toBe(1.5);
      expect(narrator.voiceSettings.pitch).toBe(1.3);
      expect(narrator.voiceSettings.volume).toBe(0.9); // Should preserve other settings
    });

    test('should test voice functionality', () => {
      narrator.testVoice();
      
      expect(narrator.narrationQueue).toHaveLength(1);
      expect(narrator.narrationQueue[0].text).toContain('working correctly');
      expect(narrator.narrationQueue[0].context).toBe('test');
    });
  });

  describe('Speech Synthesis Integration', () => {
    test('should create utterance with correct settings', () => {
      const narrationItem = {
        text: 'Test narration',
        voiceSettings: {
          rate: 0.8,
          pitch: 0.9,
          volume: 0.9,
          lang: 'en-US'
        }
      };

      narrator.speakText(narrationItem);

      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('Test narration');
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should handle speech synthesis errors', () => {
      const narrationItem = {
        text: 'Test narration',
        voiceSettings: narrator.voiceSettings
      };

      // Mock speech synthesis to throw error
      mockSpeechSynthesis.speak.mockImplementation(() => {
        throw new Error('Speech synthesis failed');
      });

      narrator.speakText(narrationItem);

      expect(narrator.isNarrating).toBe(false);
      expect(narrator.currentUtterance).toBeNull();
    });
  });
});