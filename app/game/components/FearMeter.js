/**
 * FearMeter - Visual fear level indicator with pulse effects
 * Displays current fear level with dynamic visual feedback and animations
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

const FearMeter = ({ 
  className = '', 
  showLabel = true, 
  showPercentage = true,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { gameState, gameEngine } = useGame();
  const [fearLevel, setFearLevel] = useState(0);
  const [fearState, setFearState] = useState('calm');
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const meterRef = useRef(null);
  const fillRef = useRef(null);
  const previousFearRef = useRef(0);

  // Fear state configuration
  const fearStates = {
    calm: { 
      color: '#22c55e', 
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      label: 'Calm',
      pulse: false 
    },
    nervous: { 
      color: '#eab308', 
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      label: 'Nervous',
      pulse: true 
    },
    scared: { 
      color: '#f97316', 
      bgColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.3)',
      label: 'Scared',
      pulse: true 
    },
    terrified: { 
      color: '#ef4444', 
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      label: 'Terrified',
      pulse: true 
    },
    panicked: { 
      color: '#dc2626', 
      bgColor: 'rgba(220, 38, 38, 0.1)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
      label: 'Panicked',
      pulse: true 
    },
    overwhelmed: { 
      color: '#991b1b', 
      bgColor: 'rgba(153, 27, 27, 0.1)',
      borderColor: 'rgba(153, 27, 27, 0.3)',
      label: 'Overwhelmed',
      pulse: true 
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      width: '120px',
      height: '20px',
      fontSize: '12px',
      padding: '8px'
    },
    medium: {
      width: '180px',
      height: '24px',
      fontSize: '14px',
      padding: '12px'
    },
    large: {
      width: '240px',
      height: '28px',
      fontSize: '16px',
      padding: '16px'
    }
  };

  // Determine fear state based on level
  const getFearState = (level) => {
    if (level <= 10) return 'calm';
    if (level <= 25) return 'nervous';
    if (level <= 50) return 'scared';
    if (level <= 75) return 'terrified';
    if (level <= 90) return 'panicked';
    return 'overwhelmed';
  };

  // Update fear level and state
  useEffect(() => {
    if (!gameState) return;

    const currentFear = gameState.fearLevel || 0;
    const newFearState = getFearState(currentFear);
    
    // Animate fear level changes
    if (currentFear !== previousFearRef.current) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    
    setFearLevel(currentFear);
    setFearState(newFearState);
    
    // Calculate pulse intensity based on fear level
    const intensity = Math.min(currentFear / 100, 1);
    setPulseIntensity(intensity);
    
    previousFearRef.current = currentFear;
  }, [gameState?.fearLevel]);

  // Apply pulse effect based on fear state
  useEffect(() => {
    if (!meterRef.current) return;

    const config = fearStates[fearState];
    if (config.pulse && pulseIntensity > 0.3) {
      const pulseSpeed = Math.max(0.5, 2 - pulseIntensity);
      meterRef.current.style.animation = `fearPulse ${pulseSpeed}s infinite`;
    } else {
      meterRef.current.style.animation = 'none';
    }
  }, [fearState, pulseIntensity]);

  // Get current fear state configuration
  const currentConfig = fearStates[fearState];
  const currentSize = sizeConfig[size];

  // Calculate fill width with smooth animation
  const fillWidth = `${Math.min(fearLevel, 100)}%`;

  // Handle meter click for debugging (development only)
  const handleMeterClick = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fear Level: ${fearLevel}%, State: ${fearState}`);
    }
  };

  return (
    <div 
      className={`fear-meter-container ${className}`}
      style={{ padding: currentSize.padding }}
    >
      {/* Label */}
      {showLabel && (
        <div 
          className="fear-meter-label"
          style={{
            fontSize: currentSize.fontSize,
            color: currentConfig.color,
            marginBottom: '4px',
            fontWeight: 'bold',
            textShadow: `0 0 8px ${currentConfig.color}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>FEAR</span>
          {showPercentage && (
            <span className="fear-percentage">
              {Math.round(fearLevel)}%
            </span>
          )}
        </div>
      )}

      {/* Fear meter bar */}
      <div
        ref={meterRef}
        className="fear-meter-bar"
        onClick={handleMeterClick}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: `2px solid ${currentConfig.borderColor}`,
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
          cursor: process.env.NODE_ENV === 'development' ? 'pointer' : 'default',
          boxShadow: `0 0 15px ${currentConfig.borderColor}`,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Background glow effect */}
        <div
          className="fear-meter-glow"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: currentConfig.bgColor,
            borderRadius: '10px'
          }}
        />

        {/* Fear level fill */}
        <div
          ref={fillRef}
          className={`fear-meter-fill ${isAnimating ? 'animating' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: fillWidth,
            background: `linear-gradient(90deg, 
              ${currentConfig.color}dd 0%, 
              ${currentConfig.color} 50%, 
              ${currentConfig.color}dd 100%)`,
            borderRadius: '8px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `inset 0 0 10px ${currentConfig.color}aa`,
            transform: isAnimating ? 'scaleY(1.1)' : 'scaleY(1)',
            transformOrigin: 'bottom'
          }}
        />

        {/* Pulse overlay for high fear */}
        {currentConfig.pulse && pulseIntensity > 0.5 && (
          <div
            className="fear-pulse-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle, ${currentConfig.color}33 0%, transparent 70%)`,
              borderRadius: '10px',
              animation: `fearPulseOverlay ${2 - pulseIntensity}s infinite`
            }}
          />
        )}

        {/* Critical warning indicator */}
        {fearLevel >= 90 && (
          <div
            className="fear-critical-warning"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              textShadow: '0 0 5px #000000',
              animation: 'fearCriticalBlink 0.5s infinite'
            }}
          >
            CRITICAL
          </div>
        )}
      </div>

      {/* Fear state label */}
      {showLabel && (
        <div
          className="fear-state-label"
          style={{
            fontSize: `${parseInt(currentSize.fontSize) - 2}px`,
            color: currentConfig.color,
            marginTop: '4px',
            textAlign: 'center',
            opacity: 0.8,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {currentConfig.label}
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fearPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 15px ${currentConfig.borderColor};
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 25px ${currentConfig.color}66;
          }
        }

        @keyframes fearPulseOverlay {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes fearCriticalBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .fear-meter-fill.animating {
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease;
        }

        .fear-meter-container:hover .fear-meter-bar {
          transform: scale(1.02);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .fear-meter-container {
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FearMeter;