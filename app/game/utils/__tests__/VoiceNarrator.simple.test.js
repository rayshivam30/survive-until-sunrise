/**
 * Simple VoiceNarrator Test
 * 
 * Basic functionality test to verify VoiceNarrator works correctly
 */

import { VoiceNarrator } from '../VoiceNarrator.js';

// Mock browser APIs
global.window = {
  speechSynthesis: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
    addEventListener: jest.fn()
  },
  SpeechSynthesisUtterance: jest.fn().mockImplementation((text) => ({
    text,
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'en-US',
    voice: null,
    onstart: null,
    onend: null,
    onerror: null
  }))
};

describe('VoiceNarrator Basic Functionality', () => {
  test('should initialize without errors', () => {
    const narrator = new VoiceNarrator();
    expect(narrator).toBeDefined();
    // In test environment, speechSynthesis might not be available
    expect(typeof narrator.isSupported).toBe('boolean');
  });

  test('should handle missing browser APIs gracefully', () => {
    // Temporarily remove APIs
    const originalSpeechSynthesis = global.window.speechSynthesis;
    const originalSpeechSynthesisUtterance = global.window.SpeechSynthesisUtterance;
    
    global.window.speechSynthesis = null;
    global.window.SpeechSynthesisUtterance = null;

    expect(() => {
      const narrator = new VoiceNarrator();
      expect(narrator.isSupported).toBe(false);
    }).not.toThrow();

    // Restore APIs
    global.window.speechSynthesis = originalSpeechSynthesis;
    global.window.SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
  });

  test('should have all required methods', () => {
    const narrator = new VoiceNarrator();
    
    expect(typeof narrator.narrate).toBe('function');
    expect(typeof narrator.provideCommandFeedback).toBe('function');
    expect(typeof narrator.narrateEvent).toBe('function');
    expect(typeof narrator.narrateFearLevel).toBe('function');
    expect(typeof narrator.narrateTimeUpdate).toBe('function');
    expect(typeof narrator.narrateGameStart).toBe('function');
    expect(typeof narrator.narrateGameEnd).toBe('function');
    expect(typeof narrator.narrateError).toBe('function');
    expect(typeof narrator.stopCurrentNarration).toBe('function');
    expect(typeof narrator.clearQueue).toBe('function');
    expect(typeof narrator.testVoice).toBe('function');
  });

  test('should have response templates', () => {
    const narrator = new VoiceNarrator();
    
    expect(narrator.responseTemplates).toBeDefined();
    expect(narrator.responseTemplates.gameStart).toBeDefined();
    expect(narrator.responseTemplates.commandSuccess).toBeDefined();
    expect(narrator.responseTemplates.commandFailure).toBeDefined();
    expect(narrator.responseTemplates.fearLevel).toBeDefined();
    expect(narrator.responseTemplates.timeUpdate).toBeDefined();
    expect(narrator.responseTemplates.events).toBeDefined();
    expect(narrator.responseTemplates.errors).toBeDefined();
    expect(narrator.responseTemplates.gameEnd).toBeDefined();
  });
});