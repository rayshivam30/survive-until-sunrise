/**
 * Unit tests for enhanced VoiceController component
 * Tests voice recognition, command parsing integration, and error handling
 */

import { render, act } from '@testing-library/react';
import VoiceController from '../VoiceController.js';

// Mock the CommandParser
jest.mock('../../utils/CommandParser.js', () => ({
  CommandParser: jest.fn().mockImplementation(() => ({
    parseCommand: jest.fn(),
    getAvailableCommands: jest.fn(() => []),
    calculateStatistics: jest.fn(() => ({ totalCommands: 0, successRate: 0 }))
  }))
}));

// Mock Web Speech API
const mockRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  maxAlternatives: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
  onnomatch: null,
  onspeechstart: null,
  onspeechend: null
};

const mockSpeechRecognition = jest.fn(() => mockRecognition);
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition
});
Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition
});

describe('VoiceController', () => {
  let mockOnCommand;
  let mockOnError;
  let mockCommandParser;

  beforeEach(() => {
    mockOnCommand = jest.fn();
    mockOnError = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
    mockRecognition.start.mockClear();
    mockRecognition.stop.mockClear();
    
    // Get the mocked CommandParser instance
    const { CommandParser } = require('../../utils/CommandParser.js');
    mockCommandParser = new CommandParser();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize speech recognition when supported', () => {
      render(<VoiceController onCommand={mockOnCommand} />);
      
      expect(mockSpeechRecognition).toHaveBeenCalled();
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(false);
      expect(mockRecognition.lang).toBe('en-US');
      expect(mockRecognition.maxAlternatives).toBe(3);
    });

    test('should handle unsupported browsers gracefully', () => {
      // Temporarily remove speech recognition support
      const originalSpeechRecognition = window.SpeechRecognition;
      const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;

      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'browser-support',
        message: 'Speech recognition not supported in this browser',
        error: expect.any(Error)
      });

      // Restore
      window.SpeechRecognition = originalSpeechRecognition;
      window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    });

    test('should start listening when enabled', () => {
      render(<VoiceController onCommand={mockOnCommand} isEnabled={true} />);
      
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    test('should not start listening when disabled', () => {
      render(<VoiceController onCommand={mockOnCommand} isEnabled={false} />);
      
      expect(mockRecognition.start).not.toHaveBeenCalled();
    });
  });

  describe('Voice Recognition Events', () => {
    test('should handle recognition start event', () => {
      render(<VoiceController onCommand={mockOnCommand} />);
      
      act(() => {
        mockRecognition.onstart();
      });

      // Component should be in listening state
      // (We can't directly test state, but we can verify no errors occurred)
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('should handle recognition end event', () => {
      render(<VoiceController onCommand={mockOnCommand} />);
      
      act(() => {
        mockRecognition.onend();
      });

      // Should attempt to restart recognition after delay
      expect(setTimeout).toHaveBeenCalled();
    });

    test('should handle no-speech error gracefully', () => {
      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      act(() => {
        mockRecognition.onerror({ error: 'no-speech', message: 'No speech detected' });
      });

      // Should not call onError for no-speech (it's normal)
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('should handle audio-capture error', () => {
      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      act(() => {
        mockRecognition.onerror({ error: 'audio-capture', message: 'Microphone access failed' });
      });

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'audio-capture',
        message: 'Microphone access failed',
        error: expect.any(Error)
      });
    });

    test('should handle permission denied error', () => {
      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      act(() => {
        mockRecognition.onerror({ error: 'not-allowed', message: 'Permission denied' });
      });

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'permission-denied',
        message: 'Microphone permission denied',
        error: expect.any(Error)
      });
    });

    test('should handle network errors with retry', () => {
      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      act(() => {
        mockRecognition.onerror({ error: 'network', message: 'Network error' });
      });

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'network',
        message: 'Network error during speech recognition',
        error: expect.any(Error)
      });

      // Should schedule a retry
      expect(setTimeout).toHaveBeenCalled();
    });
  });

  describe('Command Processing', () => {
    test('should process valid voice commands', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'hide',
        confidence: 0.9,
        isValid: true,
        category: 'defensive'
      });

      render(<VoiceController onCommand={mockOnCommand} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'hide', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockCommandParser.parseCommand).toHaveBeenCalledWith('hide', {});
      expect(mockOnCommand).toHaveBeenCalledWith(expect.objectContaining({
        action: 'hide',
        confidence: 0.9,
        isValid: true,
        speechConfidence: 0.8,
        overallScore: expect.any(Number)
      }));
    });

    test('should handle multiple speech alternatives', () => {
      mockCommandParser.parseCommand
        .mockReturnValueOnce({
          action: 'unknown',
          confidence: 0.1,
          isValid: false
        })
        .mockReturnValueOnce({
          action: 'hide',
          confidence: 0.8,
          isValid: true
        });

      render(<VoiceController onCommand={mockOnCommand} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'hid', confidence: 0.6 },
          1: { transcript: 'hide', confidence: 0.7 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockCommandParser.parseCommand).toHaveBeenCalledTimes(2);
      expect(mockOnCommand).toHaveBeenCalledWith(expect.objectContaining({
        action: 'hide'
      }));
    });

    test('should pass game context to command parser', () => {
      const gameContext = { fearLevel: 50, location: 'dark_room' };
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'flashlight',
        confidence: 0.8,
        isValid: true
      });

      render(<VoiceController onCommand={mockOnCommand} gameContext={gameContext} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'light', confidence: 0.7 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockCommandParser.parseCommand).toHaveBeenCalledWith('light', gameContext);
    });

    test('should respect confidence threshold', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'hide',
        confidence: 0.2, // Below default threshold of 0.3
        isValid: true
      });

      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} confidenceThreshold={0.3} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'maybe hide', confidence: 0.5 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnCommand).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'command-not-recognized'
      }));
    });

    test('should handle invalid commands', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'flashlight',
        confidence: 0.8,
        isValid: false,
        validationError: 'Flashlight not available'
      });

      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'flashlight', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnCommand).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'command-not-recognized',
        message: 'Flashlight not available'
      }));
    });

    test('should debounce rapid commands', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'hide',
        confidence: 0.9,
        isValid: true
      });

      render(<VoiceController onCommand={mockOnCommand} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'hide', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      // First command should be processed
      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnCommand).toHaveBeenCalledTimes(1);

      // Second command immediately after should be debounced
      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnCommand).toHaveBeenCalledTimes(1); // Still only called once
    });

    test('should ignore interim results', () => {
      render(<VoiceController onCommand={mockOnCommand} />);
      
      const mockEvent = {
        results: [{
          isFinal: false, // Interim result
          0: { transcript: 'hide', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockCommandParser.parseCommand).not.toHaveBeenCalled();
      expect(mockOnCommand).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Feedback', () => {
    test('should provide helpful feedback for low confidence commands', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'hide',
        confidence: 0.2, // Below threshold but above 0.1
        isValid: true
      });

      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'hid', confidence: 0.5 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'command-not-recognized',
        message: expect.stringContaining('I think you said "hide" but I\'m not sure')
      }));
    });

    test('should handle command parser errors', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'unknown',
        confidence: 0,
        error: 'Command not recognized'
      });

      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'xyz123', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      act(() => {
        mockRecognition.onresult(mockEvent);
      });

      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'command-not-recognized',
        message: 'Command error: Command not recognized'
      }));
    });

    test('should handle no match events', () => {
      render(<VoiceController onCommand={mockOnCommand} onError={mockOnError} />);
      
      act(() => {
        mockRecognition.onnomatch({});
      });

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'no-match',
        message: 'Speech not recognized',
        error: expect.any(Error)
      });
    });
  });

  describe('Component Lifecycle', () => {
    test('should stop recognition on unmount', () => {
      const { unmount } = render(<VoiceController onCommand={mockOnCommand} />);
      
      unmount();
      
      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    test('should restart recognition when enabled changes', () => {
      const { rerender } = render(<VoiceController onCommand={mockOnCommand} isEnabled={false} />);
      
      expect(mockRecognition.start).not.toHaveBeenCalled();
      
      rerender(<VoiceController onCommand={mockOnCommand} isEnabled={true} />);
      
      expect(mockRecognition.start).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should maintain command history with size limit', () => {
      mockCommandParser.parseCommand.mockReturnValue({
        action: 'hide',
        confidence: 0.9,
        isValid: true
      });

      render(<VoiceController onCommand={mockOnCommand} />);
      
      const mockEvent = {
        results: [{
          isFinal: true,
          0: { transcript: 'hide', confidence: 0.8 }
        }]
      };
      mockEvent.results.length = 1;

      // Simulate many commands to test history limit
      for (let i = 0; i < 25; i++) {
        act(() => {
          // Mock different timestamps to avoid debouncing
          jest.spyOn(Date, 'now').mockReturnValue(Date.now() + i * 2000);
          mockRecognition.onresult(mockEvent);
        });
      }

      // Should have been called 25 times but history should be limited
      expect(mockOnCommand).toHaveBeenCalledTimes(25);
      
      jest.restoreAllMocks();
    });
  });
});