/**
 * HealthBar - Dynamic health visualization component
 * Displays current health level with visual feedback and damage indicators
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

const HealthBar = ({ 
  className = '', 
  showLabel = true, 
  showValue = true,
  orientation = 'horizontal', // 'horizontal' or 'vertical'
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { gameState, gameEngine } = useGame();
  const [health, setHealth] = useState(100);
  const [healthState, setHealthState] = useState('excellent');
  const [damageFlash, setDamageFlash] = useState(false);
  const [healingGlow, setHealingGlow] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const barRef = useRef(null);
  const fillRef = useRef(null);
  const previousHealthRef = useRef(100);
  const damageTimeoutRef = useRef(null);

  // Health state configuration
  const healthStates = {
    excellent: { 
      color: '#22c55e', 
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      label: 'Excellent',
      pulse: false,
      warning: false
    },
    good: { 
      color: '#84cc16', 
      bgColor: 'rgba(132, 204, 22, 0.1)',
      borderColor: 'rgba(132, 204, 22, 0.3)',
      label: 'Good',
      pulse: false,
      warning: false
    },
    injured: { 
      color: '#eab308', 
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      label: 'Injured',
      pulse: false,
      warning: false
    },
    wounded: { 
      color: '#f97316', 
      bgColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.3)',
      label: 'Wounded',
      pulse: true,
      warning: true
    },
    critical: { 
      color: '#ef4444', 
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      label: 'Critical',
      pulse: true,
      warning: true
    },
    dying: { 
      color: '#991b1b', 
      bgColor: 'rgba(153, 27, 27, 0.1)',
      borderColor: 'rgba(153, 27, 27, 0.3)',
      label: 'Dying',
      pulse: true,
      warning: true
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      width: orientation === 'horizontal' ? '120px' : '20px',
      height: orientation === 'horizontal' ? '16px' : '120px',
      fontSize: '12px',
      padding: '8px'
    },
    medium: {
      width: orientation === 'horizontal' ? '180px' : '24px',
      height: orientation === 'horizontal' ? '20px' : '180px',
      fontSize: '14px',
      padding: '12px'
    },
    large: {
      width: orientation === 'horizontal' ? '240px' : '28px',
      height: orientation === 'horizontal' ? '24px' : '240px',
      fontSize: '16px',
      padding: '16px'
    }
  };

  // Determine health state based on level
  const getHealthState = (level) => {
    if (level >= 90) return 'excellent';
    if (level >= 75) return 'good';
    if (level >= 50) return 'injured';
    if (level >= 25) return 'wounded';
    if (level >= 10) return 'critical';
    return 'dying';
  };

  // Update health level and state
  useEffect(() => {
    if (!gameState) return;

    const currentHealth = gameState.health !== undefined ? gameState.health : 100;
    const newHealthState = getHealthState(currentHealth);
    const previousHealth = previousHealthRef.current;
    
    // Detect damage or healing
    if (currentHealth < previousHealth) {
      // Damage taken
      setDamageFlash(true);
      setIsAnimating(true);
      
      // Clear existing timeout
      if (damageTimeoutRef.current) {
        clearTimeout(damageTimeoutRef.current);
      }
      
      // Reset damage flash after animation
      damageTimeoutRef.current = setTimeout(() => {
        setDamageFlash(false);
        setIsAnimating(false);
      }, 600);
      
    } else if (currentHealth > previousHealth) {
      // Healing received
      setHealingGlow(true);
      setIsAnimating(true);
      
      // Clear existing timeout
      if (damageTimeoutRef.current) {
        clearTimeout(damageTimeoutRef.current);
      }
      
      // Reset healing glow after animation
      damageTimeoutRef.current = setTimeout(() => {
        setHealingGlow(false);
        setIsAnimating(false);
      }, 800);
    }
    
    setHealth(currentHealth);
    setHealthState(newHealthState);
    previousHealthRef.current = currentHealth;
  }, [gameState?.health]);

  // Apply pulse effect for critical health
  useEffect(() => {
    if (!barRef.current) return;

    const config = healthStates[healthState];
    if (config.pulse && health <= 25) {
      const pulseSpeed = Math.max(0.5, health / 25);
      barRef.current.style.animation = `healthPulse ${2 - pulseSpeed}s infinite`;
    } else {
      barRef.current.style.animation = 'none';
    }
  }, [healthState, health]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (damageTimeoutRef.current) {
        clearTimeout(damageTimeoutRef.current);
      }
    };
  }, []);

  // Get current health state configuration
  const currentConfig = healthStates[healthState];
  const currentSize = sizeConfig[size];

  // Calculate fill dimensions
  const fillPercentage = Math.max(0, Math.min(health, 100));
  const fillStyle = orientation === 'horizontal' 
    ? { width: `${fillPercentage}%`, height: '100%' }
    : { width: '100%', height: `${fillPercentage}%` };

  // Handle bar click for debugging (development only)
  const handleBarClick = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Health: ${health}%, State: ${healthState}`);
    }
  };

  return (
    <div 
      className={`health-bar-container ${className}`}
      style={{ padding: currentSize.padding }}
    >
      {/* Label */}
      {showLabel && (
        <div 
          className="health-bar-label"
          style={{
            fontSize: currentSize.fontSize,
            color: currentConfig.color,
            marginBottom: orientation === 'horizontal' ? '4px' : '0',
            marginRight: orientation === 'vertical' ? '8px' : '0',
            fontWeight: 'bold',
            textShadow: `0 0 8px ${currentConfig.color}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: orientation === 'vertical' ? 'column' : 'row'
          }}
        >
          <span>HEALTH</span>
          {showValue && (
            <span className="health-value">
              {Math.round(health)}%
            </span>
          )}
        </div>
      )}

      {/* Health bar container */}
      <div
        className={`health-bar-wrapper ${orientation}`}
        style={{
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          alignItems: 'center'
        }}
      >
        {/* Health bar */}
        <div
          ref={barRef}
          className={`health-bar ${damageFlash ? 'damage-flash' : ''} ${healingGlow ? 'healing-glow' : ''}`}
          onClick={handleBarClick}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: orientation === 'vertical' ? 'flex-end' : 'center',
            justifyContent: orientation === 'horizontal' ? 'flex-start' : 'center'
          }}
        >
          {/* Background glow effect */}
          <div
            className="health-bar-glow"
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

          {/* Health level fill */}
          <div
            ref={fillRef}
            className={`health-bar-fill ${isAnimating ? 'animating' : ''}`}
            style={{
              position: 'absolute',
              [orientation === 'horizontal' ? 'left' : 'bottom']: 0,
              [orientation === 'horizontal' ? 'top' : 'left']: 0,
              [orientation === 'horizontal' ? 'bottom' : 'right']: 0,
              ...fillStyle,
              background: `linear-gradient(${orientation === 'horizontal' ? '90deg' : '0deg'}, 
                ${currentConfig.color}dd 0%, 
                ${currentConfig.color} 50%, 
                ${currentConfig.color}dd 100%)`,
              borderRadius: '8px',
              transition: `${orientation === 'horizontal' ? 'width' : 'height'} 0.8s cubic-bezier(0.4, 0, 0.2, 1)`,
              boxShadow: `inset 0 0 10px ${currentConfig.color}aa`,
              transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: orientation === 'horizontal' ? 'left' : 'bottom'
            }}
          />

          {/* Damage overlay */}
          {damageFlash && (
            <div
              className="damage-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 0, 0, 0.4)',
                borderRadius: '10px',
                animation: 'damageFlash 0.6s ease-out'
              }}
            />
          )}

          {/* Healing overlay */}
          {healingGlow && (
            <div
              className="healing-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                animation: 'healingGlow 0.8s ease-out'
              }}
            />
          )}

          {/* Critical warning indicator */}
          {health <= 10 && (
            <div
              className="health-critical-warning"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                textShadow: '0 0 5px #000000',
                animation: 'healthCriticalBlink 0.5s infinite'
              }}
            >
              CRITICAL
            </div>
          )}

          {/* Health segments for visual reference */}
          {orientation === 'horizontal' && (
            <>
              <div className="health-segment" style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <div className="health-segment" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <div className="health-segment" style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
            </>
          )}
          
          {orientation === 'vertical' && (
            <>
              <div className="health-segment" style={{ position: 'absolute', bottom: '25%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <div className="health-segment" style={{ position: 'absolute', bottom: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <div className="health-segment" style={{ position: 'absolute', bottom: '75%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
            </>
          )}
        </div>

        {/* Health state label */}
        {showLabel && orientation === 'horizontal' && (
          <div
            className="health-state-label"
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
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes healthPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 15px ${currentConfig.borderColor};
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 25px ${currentConfig.color}66;
          }
        }

        @keyframes damageFlash {
          0% {
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes healingGlow {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes healthCriticalBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .health-bar-fill.animating {
          transition: ${orientation === 'horizontal' ? 'width' : 'height'} 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease;
        }

        .health-bar-container:hover .health-bar {
          transform: scale(1.02);
        }

        .health-bar.damage-flash {
          box-shadow: 0 0 30px #ff0000aa;
        }

        .health-bar.healing-glow {
          box-shadow: 0 0 30px #22c55eaa;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .health-bar-container {
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HealthBar;