"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CommandParser } from "../utils/CommandParser.js";

/**
 * Enhanced VoiceController with advanced command parsing and error handling
 * Provides voice recognition, command parsing, validation, and fallback mechanisms
 */
export default function VoiceController({ 
  onCommand, 
  onError, 
  gameContext = {}, 
  isEnabled = true,
  confidenceThreshold = 0.3 
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  
  const recognitionRef = useRef(null);
  const commandParserRef = useRef(new CommandParser());
  const retryCountRef = useRef(0);
  const lastCommandTimeRef = useRef(0);
  
  // Debounce settings
  const COMMAND_DEBOUNCE_MS = 1000;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  /**
   * Initialize speech recognition with error handling
   */
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      const error = new Error('Speech recognition not supported in this browser');
      handleError(error, 'browser-support');
      return null;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition settings
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3; // Get multiple alternatives for better parsing
    
    // Event handlers
    recognition.onstart = handleRecognitionStart;
    recognition.onend = handleRecognitionEnd;
    recognition.onerror = handleRecognitionError;
    recognition.onresult = handleRecognitionResult;
    recognition.onnomatch = handleNoMatch;
    recognition.onspeechstart = () => console.log('Speech detected');
    recognition.onspeechend = () => console.log('Speech ended');

    return recognition;
  }, []);

  /**
   * Handle recognition start event
   */
  const handleRecognitionStart = useCallback(() => {
    setIsListening(true);
    setLastError(null);
    retryCountRef.current = 0;
    console.log('Voice recognition started');
  }, []);

  /**
   * Handle recognition end event
   */
  const handleRecognitionEnd = useCallback(() => {
    setIsListening(false);
    console.log('Voice recognition ended');
    
    // Auto-restart if enabled and no critical errors
    if (isEnabled && !lastError && retryCountRef.current < MAX_RETRIES) {
      setTimeout(() => {
        if (recognitionRef.current && isEnabled) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.warn('Failed to restart recognition:', error);
          }
        }
      }, RETRY_DELAY_MS);
    }
  }, [isEnabled, lastError]);

  /**
   * Handle recognition errors with fallback strategies
   */
  const handleRecognitionError = useCallback((event) => {
    const error = event.error;
    const message = event.message || 'Unknown speech recognition error';
    
    console.error('Speech recognition error:', error, message);
    setLastError({ type: error, message });
    
    // Handle different error types
    switch (error) {
      case 'no-speech':
        // User didn't speak - this is normal, just continue
        break;
        
      case 'audio-capture':
        handleError(new Error('Microphone access failed'), 'audio-capture');
        setIsSupported(false);
        break;
        
      case 'not-allowed':
        handleError(new Error('Microphone permission denied'), 'permission-denied');
        setIsSupported(false);
        break;
        
      case 'network':
        handleError(new Error('Network error during speech recognition'), 'network');
        // Try to restart after delay
        retryCountRef.current++;
        if (retryCountRef.current < MAX_RETRIES) {
          setTimeout(() => startListening(), RETRY_DELAY_MS * retryCountRef.current);
        }
        break;
        
      case 'service-not-allowed':
        handleError(new Error('Speech recognition service not allowed'), 'service-denied');
        setIsSupported(false);
        break;
        
      default:
        handleError(new Error(`Speech recognition error: ${error}`), 'unknown');
        retryCountRef.current++;
        break;
    }
  }, []);

  /**
   * Handle recognition results with advanced parsing
   */
  const handleRecognitionResult = useCallback((event) => {
    const now = Date.now();
    
    // Debounce rapid commands
    if (now - lastCommandTimeRef.current < COMMAND_DEBOUNCE_MS) {
      console.log('Command debounced');
      return;
    }
    
    lastCommandTimeRef.current = now;
    
    // Get the most recent result
    const result = event.results[event.results.length - 1];
    
    if (!result.isFinal) return; // Only process final results
    
    // Get all alternatives for better parsing
    const alternatives = Array.from(result).map(alternative => ({
      transcript: alternative.transcript.trim(),
      confidence: alternative.confidence
    }));
    
    console.log('Voice alternatives:', alternatives);
    
    // Process each alternative and find the best parsed command
    let bestParsedCommand = null;
    let bestOverallScore = 0;
    
    for (const alternative of alternatives) {
      if (!alternative.transcript) continue;
      
      // Parse the command using CommandParser
      const parsedCommand = commandParserRef.current.parseCommand(
        alternative.transcript, 
        gameContext
      );
      
      // Calculate overall score (parsing confidence * speech confidence)
      const overallScore = parsedCommand.confidence * (alternative.confidence || 0.5);
      
      if (overallScore > bestOverallScore && overallScore >= confidenceThreshold) {
        bestOverallScore = overallScore;
        bestParsedCommand = {
          ...parsedCommand,
          speechConfidence: alternative.confidence,
          overallScore: overallScore,
          alternatives: alternatives.map(alt => alt.transcript)
        };
      }
    }
    
    // Handle the best command or provide feedback
    if (bestParsedCommand && bestParsedCommand.isValid) {
      handleValidCommand(bestParsedCommand);
    } else {
      const fallbackTranscript = alternatives.length > 0 ? alternatives[0].transcript : '';
      handleInvalidCommand(fallbackTranscript, bestParsedCommand);
    }
  }, [gameContext, confidenceThreshold]);

  /**
   * Handle no match event
   */
  const handleNoMatch = useCallback((event) => {
    console.log('No speech match found');
    handleError(new Error('Speech not recognized'), 'no-match');
  }, []);

  /**
   * Handle valid parsed commands
   */
  const handleValidCommand = useCallback((parsedCommand) => {
    console.log('Valid command processed:', parsedCommand);
    
    // Add to command history
    setCommandHistory(prev => {
      const newHistory = [...prev, parsedCommand];
      // Keep only last 20 commands
      return newHistory.slice(-20);
    });
    
    // Call the command handler
    if (onCommand) {
      onCommand(parsedCommand);
    }
  }, [onCommand]);

  /**
   * Handle invalid or unrecognized commands
   */
  const handleInvalidCommand = useCallback((originalTranscript, parsedCommand) => {
    console.log('Invalid command:', originalTranscript, parsedCommand);
    
    // Provide helpful feedback based on the error
    let feedbackMessage = "I didn't understand that command.";
    
    if (parsedCommand) {
      if (parsedCommand.confidence > 0.1 && parsedCommand.confidence < confidenceThreshold) {
        feedbackMessage = `I think you said "${parsedCommand.action}" but I'm not sure. Try speaking more clearly.`;
      } else if (parsedCommand.validationError) {
        feedbackMessage = parsedCommand.validationError;
      } else if (parsedCommand.error) {
        feedbackMessage = `Command error: ${parsedCommand.error}`;
      }
    }
    
    // Call error handler with feedback
    if (onError) {
      onError({
        type: 'command-not-recognized',
        message: feedbackMessage,
        originalTranscript,
        parsedCommand
      });
    }
  }, [confidenceThreshold, onError]);

  /**
   * Generic error handler
   */
  const handleError = useCallback((error, type) => {
    console.error(`VoiceController error (${type}):`, error);
    
    if (onError) {
      onError({
        type,
        message: error.message,
        error
      });
    }
  }, [onError]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(() => {
    if (!isSupported || !isEnabled) return false;
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        return true;
      }
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      handleError(error, 'start-failed');
      return false;
    }
    
    return false;
  }, [isSupported, isEnabled, handleError]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        return true;
      }
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
      return false;
    }
    
    return false;
  }, []);

  /**
   * Get available commands from parser
   */
  const getAvailableCommands = useCallback(() => {
    return commandParserRef.current.getAvailableCommands();
  }, []);

  /**
   * Get command statistics
   */
  const getCommandStatistics = useCallback(() => {
    return commandParserRef.current.calculateStatistics(commandHistory);
  }, [commandHistory]);

  // Initialize speech recognition on mount
  useEffect(() => {
    recognitionRef.current = initializeSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping recognition on cleanup:', error);
        }
      }
    };
  }, [initializeSpeechRecognition]);

  // Start/stop listening based on isEnabled prop
  useEffect(() => {
    if (isEnabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }
  }, [isEnabled, isSupported, startListening, stopListening]);

  // Expose methods and state through ref or return object if needed
  // For now, this component manages everything internally
  
  return null; // This is a headless component
}
