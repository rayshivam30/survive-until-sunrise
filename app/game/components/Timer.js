/**
 * Timer - Visual countdown component showing current time and progress to sunrise
 * Displays game time, countdown to sunrise, and visual progress indicators
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const Timer = ({ className = '', showProgress = true, showCountdown = true }) => {
  const { gameState, gameEngine } = useGame();
  const [timeUntilSunrise, setTimeUntilSunrise] = useState({ hours: 7, minutes: 0, percentage: 0 });
  const [isNearSunrise, setIsNearSunrise] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  // Update countdown and visual effects
  useEffect(() => {
    if (!gameEngine?.gameTimer || !gameState?.gameStarted) return;

    const updateTimer = () => {
      const sunriseData = gameEngine.gameTimer.getTimeUntilSunrise();
      setTimeUntilSunrise(sunriseData);
      
      // Determine if we're near sunrise (last hour)
      const nearSunrise = sunriseData.totalMinutes <= 60;
      setIsNearSunrise(nearSunrise);
      
      // Calculate pulse intensity based on proximity to sunrise
      if (nearSunrise) {
        const intensity = Math.max(0, 1 - (sunriseData.totalMinutes / 60));
        setPulseIntensity(intensity);
      } else {
        setPulseIntensity(0);
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval for smooth updates
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [gameEngine, gameState?.gameStarted]);

  // Format time for display
  const formatDisplayTime = (time) => {
    if (!time) return "23:00";
    
    // Add visual emphasis for certain times
    const hour = parseInt(time.split(':')[0]);
    const isSpecialHour = [0, 1, 2, 3, 4, 5].includes(hour); // Midnight to 5 AM
    
    return (
      <span className={isSpecialHour ? 'text-yellow-300' : 'text-green-300'}>
        {time}
      </span>
    );
  };

  // Calculate progress bar width
  const progressWidth = timeUntilSunrise.percentage || 0;

  // Dynamic styling based on game state
  const getTimerStyles = () => {
    let baseClasses = 'timer-display transition-all duration-300';
    
    if (isNearSunrise) {
      baseClasses += ' timer-near-sunrise';
    }
    
    if (gameState?.fearLevel > 70) {
      baseClasses += ' timer-high-fear';
    }
    
    return baseClasses;
  };

  // Pulse animation style for near-sunrise effect
  const pulseStyle = {
    animation: pulseIntensity > 0 ? `pulse ${2 - pulseIntensity}s infinite` : 'none',
    opacity: 1 + (pulseIntensity * 0.3)
  };

  if (!gameState) {
    return (
      <div className={`timer-container ${className}`}>
        <div className="timer-display">
          <div className="time-text">23:00</div>
          <div className="sunrise-label">Until Sunrise</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`timer-container ${className}`}>
      <div className={getTimerStyles()} style={pulseStyle}>
        {/* Main time display */}
        <div className="time-text text-4xl font-bold mb-2">
          {formatDisplayTime(gameState.currentTime)}
        </div>
        
        {/* Sunrise countdown */}
        {showCountdown && (
          <div className="countdown-section mb-3">
            <div className="sunrise-label text-sm opacity-75 mb-1">
              Until Sunrise
            </div>
            <div className={`countdown-time text-lg ${isNearSunrise ? 'text-yellow-400' : 'text-green-400'}`}>
              {timeUntilSunrise.hours}h {timeUntilSunrise.minutes}m
            </div>
          </div>
        )}
        
        {/* Progress bar */}
        {showProgress && (
          <div className="progress-section">
            <div className="progress-bar-container bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className={`progress-bar h-full transition-all duration-1000 ${
                  isNearSunrise ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <div className="progress-text text-xs opacity-60 text-center">
              {Math.round(progressWidth)}% through the night
            </div>
          </div>
        )}
        
        {/* Special time indicators */}
        {gameState.currentTime === "00:00" && (
          <div className="special-time-indicator text-purple-400 text-sm mt-2 animate-pulse">
            Midnight Hour
          </div>
        )}
        
        {gameState.currentTime === "03:00" && (
          <div className="special-time-indicator text-red-400 text-sm mt-2 animate-pulse">
            The Witching Hour
          </div>
        )}
        
        {isNearSunrise && timeUntilSunrise.totalMinutes <= 30 && (
          <div className="special-time-indicator text-yellow-400 text-sm mt-2 animate-pulse">
            Dawn Approaches
          </div>
        )}
      </div>
      
      {/* CSS Styles */}
      <style jsx>{`
        .timer-container {
          user-select: none;
        }
        
        .timer-display {
          text-align: center;
          padding: 1rem;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(34, 197, 94, 0.3);
          backdrop-filter: blur(4px);
        }
        
        .timer-near-sunrise {
          border-color: rgba(251, 191, 36, 0.5);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
        }
        
        .timer-high-fear {
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }
        
        .time-text {
          font-family: 'Courier New', monospace;
          text-shadow: 0 0 10px currentColor;
        }
        
        .countdown-time {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .progress-bar {
          box-shadow: 0 0 10px currentColor;
        }
        
        .special-time-indicator {
          font-weight: 600;
          text-shadow: 0 0 8px currentColor;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .timer-display {
            padding: 0.75rem;
          }
          
          .time-text {
            font-size: 2rem;
          }
          
          .countdown-time {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Timer;