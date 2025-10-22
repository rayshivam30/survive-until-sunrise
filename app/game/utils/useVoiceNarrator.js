"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { VoiceNarrator } from './VoiceNarrator.js';

/**
 * React hook for integrating VoiceNarrator with game components
 * 
 * Provides easy access to voice narration functionality with React lifecycle management
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export function useVoiceNarrator(options = {}) {
  const narratorRef = useRef(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Initialize narrator
  useEffect(() => {
    const narratorOptions = {
      ...options,
      onNarrationStart: (narrationItem) => {
        setIsNarrating(true);
        setQueueLength(prev => Math.max(0, prev - 1));
        if (options.onNarrationStart) {
          options.onNarrationStart(narrationItem);
        }
      },
      onNarrationEnd: (narrationItem) => {
        setIsNarrating(false);
        if (options.onNarrationEnd) {
          options.onNarrationEnd(narrationItem);
        }
      },
      onNarrationError: (error, narrationItem) => {
        setIsNarrating(false);
        setLastError(error);
        if (options.onNarrationError) {
          options.onNarrationError(error, narrationItem);
        }
      }
    };

    narratorRef.current = new VoiceNarrator(narratorOptions);
    setIsSupported(narratorRef.current.isSupported);

    return () => {
      if (narratorRef.current) {
        narratorRef.current.clearQueue();
      }
    };
  }, []); // Empty dependency array - initialize once

  // Update queue length when narrations are added
  const updateQueueLength = useCallback(() => {
    if (narratorRef.current) {
      const status = narratorRef.current.getQueueStatus();
      setQueueLength(status.queueLength);
    }
  }, []);

  // Narration methods
  const narrate = useCallback((text, options = {}) => {
    if (!narratorRef.current) return false;
    
    const result = narratorRef.current.narrate(text, options);
    updateQueueLength();
    return result;
  }, [updateQueueLength]);

  const provideCommandFeedback = useCallback((command, success, gameState = {}) => {
    if (!narratorRef.current) return;
    
    narratorRef.current.provideCommandFeedback(command, success, gameState);
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateEvent = useCallback((eventType, eventData = {}, gameState = {}) => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateEvent(eventType, eventData, gameState);
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateFearLevel = useCallback((fearLevel, previousLevel = 0) => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateFearLevel(fearLevel, previousLevel);
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateTimeUpdate = useCallback((currentTime, gameState = {}) => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateTimeUpdate(currentTime, gameState);
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateGameStart = useCallback(() => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateGameStart();
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateGameEnd = useCallback((victory = false, cause = '') => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateGameEnd(victory, cause);
    updateQueueLength();
  }, [updateQueueLength]);

  const narrateError = useCallback((errorType, errorMessage = '') => {
    if (!narratorRef.current) return;
    
    narratorRef.current.narrateError(errorType, errorMessage);
    updateQueueLength();
  }, [updateQueueLength]);

  // Control methods
  const stopNarration = useCallback(() => {
    if (!narratorRef.current) return;
    
    narratorRef.current.stopCurrentNarration();
    setIsNarrating(false);
  }, []);

  const clearQueue = useCallback(() => {
    if (!narratorRef.current) return;
    
    narratorRef.current.clearQueue();
    setQueueLength(0);
    setIsNarrating(false);
  }, []);

  const updateVoiceSettings = useCallback((newSettings) => {
    if (!narratorRef.current) return;
    
    narratorRef.current.updateVoiceSettings(newSettings);
  }, []);

  const testVoice = useCallback(() => {
    if (!narratorRef.current) return;
    
    narratorRef.current.testVoice();
    updateQueueLength();
  }, [updateQueueLength]);

  // Status methods
  const getQueueStatus = useCallback(() => {
    if (!narratorRef.current) {
      return {
        isNarrating: false,
        queueLength: 0,
        currentText: null,
        isSupported: false
      };
    }
    
    return narratorRef.current.getQueueStatus();
  }, []);

  // Clear error when new narration starts
  useEffect(() => {
    if (isNarrating && lastError) {
      setLastError(null);
    }
  }, [isNarrating, lastError]);

  return {
    // State
    isNarrating,
    isSupported,
    queueLength,
    lastError,
    
    // Narration methods
    narrate,
    provideCommandFeedback,
    narrateEvent,
    narrateFearLevel,
    narrateTimeUpdate,
    narrateGameStart,
    narrateGameEnd,
    narrateError,
    
    // Control methods
    stopNarration,
    clearQueue,
    updateVoiceSettings,
    testVoice,
    
    // Status methods
    getQueueStatus,
    
    // Direct access to narrator instance (for advanced usage)
    narrator: narratorRef.current
  };
}

export default useVoiceNarrator;