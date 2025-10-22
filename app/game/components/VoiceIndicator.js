/**
 * VoiceIndicator - Component to show listening status and command feedback
 * Displays voice recognition state, command feedback, and audio levels
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

const VoiceIndicator = ({ 
  className = '', 
  showLabel = true, 
  showWaveform = true,
  position = 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { gameState, gameEngine } = useGame();
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [lastCommand, setLastCommand] = useState(null);
  const [commandFeedback, setCommandFeedback] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected', 'connecting', 'disconnected', 'error'
  const [isSupported, setIsSupported] = useState(true);
  
  const indicatorRef = useRef(null);
  const waveformRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Status configurations
  const statusConfig = {
    connected: {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      label: 'Connected',
      pulse: false
    },
    connecting: {
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      label: 'Connecting',
      pulse: true
    },
    listening: {
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      label: 'Listening',
      pulse: true
    },
    processing: {
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      label: 'Processing',
      pulse: true
    },
    disconnected: {
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      label: 'Disconnected',
      pulse: false
    },
    error: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      label: 'Error',
      pulse: true
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      width: '60px',
      height: '60px',
      fontSize: '10px',
      iconSize: '16px',
      waveformHeight: '20px'
    },
    medium: {
      width: '80px',
      height: '80px',
      fontSize: '12px',
      iconSize: '20px',
      waveformHeight: '30px'
    },
    large: {
      width: '100px',
      height: '100px',
      fontSize: '14px',
      iconSize: '24px',
      waveformHeight: '40px'
    }
  };

  // Position configurations
  const positionConfig = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  // Initialize audio context for voice level detection
  useEffect(() => {
    const initializeAudioContext = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsSupported(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateVoiceLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          const normalizedLevel = Math.min(average / 128, 1);
          
          setVoiceLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateVoiceLevel);
        };
        
        updateVoiceLevel();
        setConnectionStatus('connected');
        
      } catch (error) {
        console.warn('Failed to initialize audio context:', error);
        setIsSupported(false);
        setConnectionStatus('error');
      }
    };

    initializeAudioContext();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Listen for voice controller events from game engine
  useEffect(() => {
    if (!gameEngine?.voiceController) return;

    const voiceController = gameEngine.voiceController;
    
    // Set up event listeners
    const handleListeningStart = () => {
      setIsListening(true);
      setConnectionStatus('listening');
    };
    
    const handleListeningEnd = () => {
      setIsListening(false);
      setConnectionStatus('connected');
    };
    
    const handleCommand = (command) => {
      setLastCommand(command);
      setCommandFeedback({
        type: 'success',
        message: `Command: ${command.action}`,
        timestamp: Date.now()
      });
      
      // Clear feedback after delay
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setCommandFeedback(null);
      }, 3000);
    };
    
    const handleError = (error) => {
      setCommandFeedback({
        type: 'error',
        message: error.message || 'Voice error',
        timestamp: Date.now()
      });
      setConnectionStatus('error');
      
      // Clear error feedback after delay
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setCommandFeedback(null);
        setConnectionStatus('connected');
      }, 5000);
    };

    // Note: These would need to be implemented in the actual VoiceController
    // For now, we'll simulate based on game state changes
    const checkVoiceState = () => {
      if (gameState?.isListening !== undefined) {
        setIsListening(gameState.isListening);
        setConnectionStatus(gameState.isListening ? 'listening' : 'connected');
      }
    };

    checkVoiceState();
    
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [gameEngine, gameState?.isListening]);

  // Get current status configuration
  const getCurrentStatus = () => {
    if (!isSupported) return 'error';
    if (isListening) return 'listening';
    return connectionStatus;
  };

  const currentStatus = getCurrentStatus();
  const currentConfig = statusConfig[currentStatus];
  const currentSize = sizeConfig[size];
  const currentPosition = positionConfig[position];

  // Render waveform visualization
  const renderWaveform = () => {
    if (!showWaveform) return null;

    const bars = 5;
    const barWidth = 3;
    const maxHeight = parseInt(currentSize.waveformHeight);
    
    return (
      <div
        ref={waveformRef}
        className="voice-waveform"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          height: currentSize.waveformHeight,
          gap: '2px',
          marginTop: '4px'
        }}
      >
        {Array.from({ length: bars }).map((_, index) => {
          const height = isListening 
            ? Math.max(2, (voiceLevel + Math.random() * 0.3) * maxHeight)
            : 2;
          
          return (
            <div
              key={index}
              className="waveform-bar"
              style={{
                width: `${barWidth}px`,
                height: `${height}px`,
                backgroundColor: currentConfig.color,
                borderRadius: '1px',
                transition: 'height 0.1s ease',
                opacity: isListening ? 0.8 + (voiceLevel * 0.2) : 0.3,
                animation: isListening ? `waveformPulse ${0.5 + index * 0.1}s infinite alternate` : 'none'
              }}
            />
          );
        })}
      </div>
    );
  };

  // Get microphone icon based on status
  const getMicrophoneIcon = () => {
    switch (currentStatus) {
      case 'listening':
        return '🎤';
      case 'processing':
        return '⚡';
      case 'error':
        return '❌';
      case 'disconnected':
        return '🔇';
      default:
        return '🎙️';
    }
  };

  return (
    <div
      className={`voice-indicator ${className}`}
      style={{
        position: 'fixed',
        zIndex: 1000,
        ...currentPosition
      }}
    >
      {/* Main indicator circle */}
      <div
        ref={indicatorRef}
        className={`voice-indicator-main ${currentStatus}`}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          backgroundColor: currentConfig.bgColor,
          border: `3px solid ${currentConfig.borderColor}`,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: `0 0 20px ${currentConfig.borderColor}`,
          animation: currentConfig.pulse ? `voiceIndicatorPulse 1.5s infinite` : 'none',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Voice Indicator Status:', currentStatus, { isListening, voiceLevel, lastCommand });
          }
        }}
      >
        {/* Microphone icon */}
        <div
          className="microphone-icon"
          style={{
            fontSize: currentSize.iconSize,
            marginBottom: '2px',
            filter: isListening ? 'brightness(1.2)' : 'brightness(0.8)'
          }}
        >
          {getMicrophoneIcon()}
        </div>

        {/* Status label */}
        {showLabel && (
          <div
            className="status-label"
            style={{
              fontSize: currentSize.fontSize,
              color: currentConfig.color,
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: `0 0 3px ${currentConfig.color}`,
              lineHeight: '1'
            }}
          >
            {currentConfig.label}
          </div>
        )}
      </div>

      {/* Waveform visualization */}
      {renderWaveform()}

      {/* Command feedback */}
      {commandFeedback && (
        <div
          className={`command-feedback ${commandFeedback.type}`}
          style={{
            position: 'absolute',
            top: position.includes('bottom') ? 'auto' : '100%',
            bottom: position.includes('top') ? 'auto' : '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: position.includes('bottom') ? '0' : '8px',
            marginBottom: position.includes('top') ? '0' : '8px',
            padding: '6px 12px',
            backgroundColor: commandFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            color: '#ffffff',
            borderRadius: '16px',
            fontSize: currentSize.fontSize,
            fontWeight: 'bold',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'feedbackSlideIn 0.3s ease-out',
            zIndex: 1001
          }}
        >
          {commandFeedback.message}
        </div>
      )}

      {/* Voice level indicator */}
      {isListening && voiceLevel > 0.1 && (
        <div
          className="voice-level-ring"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${parseInt(currentSize.width) + 20 + (voiceLevel * 30)}px`,
            height: `${parseInt(currentSize.height) + 20 + (voiceLevel * 30)}px`,
            border: `2px solid ${currentConfig.color}`,
            borderRadius: '50%',
            opacity: voiceLevel * 0.6,
            animation: 'voiceLevelPulse 0.5s ease-out',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes voiceIndicatorPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px ${currentConfig.borderColor};
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 30px ${currentConfig.color}66;
          }
        }

        @keyframes waveformPulse {
          0% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes feedbackSlideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes voiceLevelPulse {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: ${voiceLevel * 0.6};
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .voice-indicator-main:hover {
          transform: scale(1.02);
        }

        .voice-indicator-main.listening {
          box-shadow: 0 0 30px ${statusConfig.listening.color}66;
        }

        .voice-indicator-main.error {
          animation: errorShake 0.5s ease-in-out;
        }

        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .voice-indicator {
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceIndicator;