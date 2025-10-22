/**
 * useVoiceNarrator Hook Tests
 * 
 * Tests for the React hook that integrates VoiceNarrator with components
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { renderHook, act } from '@testing-library/react';
import { useVoiceNarrator } from '../useVoiceNarrator.js';

// Mock VoiceNarrator
jest.mock('../VoiceNarrator.js', () => ({
  VoiceNarrator: jest.fn().mockImplementation((options) => ({
    isSupported: true,
    narrate: jest.fn(() => true),
    provideCommandFeedback: jest.fn(),
    narrateEvent: jest.fn(),
    narrateFearLevel: jest.fn(),
    narrateTimeUpdate: jest.fn(),
    narrateGameStart: jest.fn(),
    narrateGameEnd: jest.fn(),
    narrateError: jest.fn(),
    stopCurrentNarration: jest.fn(),
    clearQueue: jest.fn(),
    updateVoiceSettings: jest.fn(),
    testVoice: jest.fn(),
    getQueueStatus: jest.fn(() => ({
      isNarrating: false,
      queueLength: 0,
      currentText: null,
      isSupported: true
    })),
    onNarrationStart: options?.onNarrationStart,
    onNarrationEnd: options?.onNarrationEnd,
    onNarrationError: options?.onNarrationError
  }))
}));

describe('useVoiceNarrator Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      expect(result.current.isNarrating).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.queueLength).toBe(0);
      expect(result.current.lastError).toBeNull();
    });

    test('should initialize with custom options', () => {
      const mockCallbacks = {
        onNarrationStart: jest.fn(),
        onNarrationEnd: jest.fn(),
        onNarrationError: jest.fn()
      };

      const { result } = renderHook(() => useVoiceNarrator(mockCallbacks));

      expect(result.current.narrator).toBeDefined();
    });

    test('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useVoiceNarrator());

      const clearQueueSpy = jest.spyOn(result.current.narrator, 'clearQueue');
      
      unmount();

      expect(clearQueueSpy).toHaveBeenCalled();
    });
  });

  describe('Narration Methods', () => {
    test('should call narrate method', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        const success = result.current.narrate('Test narration');
        expect(success).toBe(true);
      });

      expect(result.current.narrator.narrate).toHaveBeenCalledWith('Test narration', {});
    });

    test('should call provideCommandFeedback', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.provideCommandFeedback({ action: 'hide' }, true, { fearLevel: 30 });
      });

      expect(result.current.narrator.provideCommandFeedback).toHaveBeenCalledWith(
        { action: 'hide' }, 
        true, 
        { fearLevel: 30 }
      );
    });

    test('should call narrateEvent', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateEvent('footsteps', { urgent: true }, { fearLevel: 50 });
      });

      expect(result.current.narrator.narrateEvent).toHaveBeenCalledWith(
        'footsteps',
        { urgent: true },
        { fearLevel: 50 }
      );
    });

    test('should call narrateFearLevel', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateFearLevel(70, 30);
      });

      expect(result.current.narrator.narrateFearLevel).toHaveBeenCalledWith(70, 30);
    });

    test('should call narrateTimeUpdate', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateTimeUpdate('01:00', { fearLevel: 40 });
      });

      expect(result.current.narrator.narrateTimeUpdate).toHaveBeenCalledWith('01:00', { fearLevel: 40 });
    });

    test('should call narrateGameStart', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateGameStart();
      });

      expect(result.current.narrator.narrateGameStart).toHaveBeenCalled();
    });

    test('should call narrateGameEnd', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateGameEnd(true, 'survived');
      });

      expect(result.current.narrator.narrateGameEnd).toHaveBeenCalledWith(true, 'survived');
    });

    test('should call narrateError', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.narrateError('commandNotRecognized', 'Custom error message');
      });

      expect(result.current.narrator.narrateError).toHaveBeenCalledWith(
        'commandNotRecognized',
        'Custom error message'
      );
    });
  });

  describe('Control Methods', () => {
    test('should call stopNarration', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.stopNarration();
      });

      expect(result.current.narrator.stopCurrentNarration).toHaveBeenCalled();
      expect(result.current.isNarrating).toBe(false);
    });

    test('should call clearQueue', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.narrator.clearQueue).toHaveBeenCalled();
      expect(result.current.queueLength).toBe(0);
      expect(result.current.isNarrating).toBe(false);
    });

    test('should call updateVoiceSettings', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      const newSettings = { rate: 1.2, pitch: 1.1 };

      act(() => {
        result.current.updateVoiceSettings(newSettings);
      });

      expect(result.current.narrator.updateVoiceSettings).toHaveBeenCalledWith(newSettings);
    });

    test('should call testVoice', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      act(() => {
        result.current.testVoice();
      });

      expect(result.current.narrator.testVoice).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    test('should update state on narration start', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Simulate narration start callback
      act(() => {
        if (result.current.narrator.onNarrationStart) {
          result.current.narrator.onNarrationStart({ text: 'Test' });
        }
      });

      expect(result.current.isNarrating).toBe(true);
    });

    test('should update state on narration end', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // First start narration
      act(() => {
        if (result.current.narrator.onNarrationStart) {
          result.current.narrator.onNarrationStart({ text: 'Test' });
        }
      });

      expect(result.current.isNarrating).toBe(true);

      // Then end narration
      act(() => {
        if (result.current.narrator.onNarrationEnd) {
          result.current.narrator.onNarrationEnd({ text: 'Test' });
        }
      });

      expect(result.current.isNarrating).toBe(false);
    });

    test('should update state on narration error', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      const error = { type: 'synthesis-error', message: 'Test error' };

      act(() => {
        if (result.current.narrator.onNarrationError) {
          result.current.narrator.onNarrationError(error, { text: 'Test' });
        }
      });

      expect(result.current.isNarrating).toBe(false);
      expect(result.current.lastError).toEqual(error);
    });

    test('should clear error when new narration starts', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Set error first
      act(() => {
        if (result.current.narrator.onNarrationError) {
          result.current.narrator.onNarrationError(
            { type: 'error', message: 'Test error' },
            { text: 'Test' }
          );
        }
      });

      expect(result.current.lastError).toBeTruthy();

      // Start new narration
      act(() => {
        if (result.current.narrator.onNarrationStart) {
          result.current.narrator.onNarrationStart({ text: 'New test' });
        }
      });

      expect(result.current.lastError).toBeNull();
    });
  });

  describe('Queue Length Management', () => {
    test('should update queue length when narrations are added', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Mock getQueueStatus to return updated length
      result.current.narrator.getQueueStatus.mockReturnValue({
        isNarrating: false,
        queueLength: 2,
        currentText: null,
        isSupported: true
      });

      act(() => {
        result.current.narrate('Test 1');
        result.current.narrate('Test 2');
      });

      expect(result.current.queueLength).toBe(2);
    });

    test('should decrease queue length on narration start', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Set initial queue length
      act(() => {
        result.current.narrator.getQueueStatus.mockReturnValue({
          isNarrating: false,
          queueLength: 3,
          currentText: null,
          isSupported: true
        });
        result.current.narrate('Test');
      });

      expect(result.current.queueLength).toBe(3);

      // Simulate narration start (should decrease queue length)
      act(() => {
        if (result.current.narrator.onNarrationStart) {
          result.current.narrator.onNarrationStart({ text: 'Test' });
        }
      });

      expect(result.current.queueLength).toBe(2);
    });
  });

  describe('Callback Integration', () => {
    test('should call custom callbacks', () => {
      const mockCallbacks = {
        onNarrationStart: jest.fn(),
        onNarrationEnd: jest.fn(),
        onNarrationError: jest.fn()
      };

      const { result } = renderHook(() => useVoiceNarrator(mockCallbacks));

      const testItem = { text: 'Test narration' };

      // Test start callback
      act(() => {
        if (result.current.narrator.onNarrationStart) {
          result.current.narrator.onNarrationStart(testItem);
        }
      });

      expect(mockCallbacks.onNarrationStart).toHaveBeenCalledWith(testItem);

      // Test end callback
      act(() => {
        if (result.current.narrator.onNarrationEnd) {
          result.current.narrator.onNarrationEnd(testItem);
        }
      });

      expect(mockCallbacks.onNarrationEnd).toHaveBeenCalledWith(testItem);

      // Test error callback
      const error = { type: 'test-error', message: 'Test error' };
      act(() => {
        if (result.current.narrator.onNarrationError) {
          result.current.narrator.onNarrationError(error, testItem);
        }
      });

      expect(mockCallbacks.onNarrationError).toHaveBeenCalledWith(error, testItem);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing narrator gracefully', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Simulate narrator not being initialized
      result.current.narrator = null;

      act(() => {
        const success = result.current.narrate('Test');
        expect(success).toBe(false);
      });

      // Should not throw errors
      expect(() => {
        result.current.provideCommandFeedback({ action: 'hide' }, true);
        result.current.narrateEvent('footsteps');
        result.current.stopNarration();
        result.current.clearQueue();
      }).not.toThrow();
    });

    test('should return default status when narrator is missing', () => {
      const { result } = renderHook(() => useVoiceNarrator());

      // Simulate narrator not being initialized
      result.current.narrator = null;

      const status = result.current.getQueueStatus();

      expect(status).toEqual({
        isNarrating: false,
        queueLength: 0,
        currentText: null,
        isSupported: false
      });
    });
  });

  describe('Memoization', () => {
    test('should memoize callback functions', () => {
      const { result, rerender } = renderHook(() => useVoiceNarrator());

      const firstNarrate = result.current.narrate;
      const firstProvideCommandFeedback = result.current.provideCommandFeedback;

      rerender();

      expect(result.current.narrate).toBe(firstNarrate);
      expect(result.current.provideCommandFeedback).toBe(firstProvideCommandFeedback);
    });
  });
});