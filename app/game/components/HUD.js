/**
 * HUD - Main heads-up display component
 * Combines all HUD components (Timer, FearMeter, HealthBar, Inventory, VoiceIndicator)
 * Provides a unified interface for game status display
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import Timer from './Timer';
import FearMeter from './FearMeter';
import HealthBar from './HealthBar';
import Inventory from './Inventory';
import VoiceIndicator from './VoiceIndicator';

const HUD = ({ 
  className = '',
  layout = 'default', // 'default', 'minimal', 'compact', 'debug'
  showAll = true,
  customComponents = {}
}) => {
  const { gameState, gameEngine } = useGame();
  const [hudVisible, setHudVisible] = useState(true);
  const [hudOpacity, setHudOpacity] = useState(1);
  const [isGameActive, setIsGameActive] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  
  const hudRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Layout configurations
  const layoutConfig = {
    default: {
      showTimer: true,
      showFearMeter: true,
      showHealthBar: true,
      showInventory: true,
      showVoiceIndicator: true,
      timerPosition: 'top-center',
      fearMeterPosition: 'top-left',
      healthBarPosition: 'top-left',
      inventoryPosition: 'bottom-center',
      voiceIndicatorPosition: 'bottom-right'
    },
    minimal: {
      showTimer: true,
      showFearMeter: false,
      showHealthBar: false,
      showInventory: false,
      showVoiceIndicator: true,
      timerPosition: 'top-center',
      voiceIndicatorPosition: 'bottom-right'
    },
    compact: {
      showTimer: true,
      showFearMeter: true,
      showHealthBar: true,
      showInventory: true,
      showVoiceIndicator: true,
      timerPosition: 'top-left',
      fearMeterPosition: 'top-left',
      healthBarPosition: 'top-left',
      inventoryPosition: 'top-right',
      voiceIndicatorPosition: 'bottom-right'
    },
    debug: {
      showTimer: true,
      showFearMeter: true,
      showHealthBar: true,
      showInventory: true,
      showVoiceIndicator: true,
      timerPosition: 'top-center',
      fearMeterPosition: 'top-left',
      healthBarPosition: 'top-left',
      inventoryPosition: 'bottom-left',
      voiceIndicatorPosition: 'bottom-right'
    }
  };

  // Detect screen size for responsive design
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Enhanced game state monitoring with smooth transitions
  useEffect(() => {
    if (!gameState) return;

    const gameActive = gameState.gameStarted && gameState.isAlive;
    setIsGameActive(gameActive);

    // Enhanced HUD opacity management with smooth transitions
    const calculateOptimalOpacity = () => {
      let baseOpacity = 1.0;
      
      // Fear-based opacity reduction
      if (gameState.fearLevel > 90) {
        baseOpacity = 0.6; // More dramatic reduction for extreme fear
      } else if (gameState.fearLevel > 70) {
        baseOpacity = 0.8; // Moderate reduction for high fear
      } else if (gameState.fearLevel > 50) {
        baseOpacity = 0.9; // Slight reduction for medium fear
      }
      
      // Health-based opacity (when critically low)
      if (gameState.health < 15) {
        baseOpacity = Math.min(baseOpacity, 0.7); // Reduce visibility when near death
      }
      
      // Time-based adjustments
      if (gameState.currentTime) {
        const hour = parseInt(gameState.currentTime.split(':')[0]);
        if (hour >= 5) {
          // Dawn approaching - increase visibility
          baseOpacity = Math.min(1.0, baseOpacity + 0.1);
        } else if (hour >= 3 && hour < 4) {
          // Witching hour - slight reduction
          baseOpacity = Math.max(0.5, baseOpacity - 0.1);
        }
      }
      
      return baseOpacity;
    };

    const targetOpacity = calculateOptimalOpacity();
    
    // Smooth opacity transition
    if (Math.abs(hudOpacity - targetOpacity) > 0.05) {
      setHudOpacity(targetOpacity);
    }
  }, [gameState, hudOpacity]);

  // Handle HUD visibility toggle
  const toggleHudVisibility = () => {
    setHudVisible(!hudVisible);
  };

  // Auto-hide HUD after inactivity (optional)
  const resetHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    setHudVisible(true);
    
    // Auto-hide after 30 seconds of inactivity (disabled by default)
    // hideTimeoutRef.current = setTimeout(() => {
    //   setHudVisible(false);
    // }, 30000);
  };

  // Handle mouse movement to show HUD
  useEffect(() => {
    const handleMouseMove = () => {
      resetHideTimer();
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Get current layout configuration
  const currentLayout = layoutConfig[layout] || layoutConfig.default;

  // Responsive size adjustments
  const getComponentSize = () => {
    switch (screenSize) {
      case 'mobile':
        return 'small';
      case 'tablet':
        return 'medium';
      default:
        return 'medium';
    }
  };

  // Position style generator
  const getPositionStyle = (position) => {
    const positions = {
      'top-left': { top: '20px', left: '20px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: '20px', right: '20px' },
      'center-left': { top: '50%', left: '20px', transform: 'translateY(-50%)' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'center-right': { top: '50%', right: '20px', transform: 'translateY(-50%)' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: '20px', right: '20px' }
    };
    
    return positions[position] || positions['top-left'];
  };

  // Don't render HUD if game is not active
  if (!isGameActive && layout !== 'debug') {
    return null;
  }

  return (
    <div
      ref={hudRef}
      className={`game-hud ${layout} ${className}`}
      data-high-fear={gameState?.fearLevel > 80}
      data-critical-health={gameState?.health < 20}
      data-witching-hour={gameState?.currentTime && 
        parseInt(gameState.currentTime.split(':')[0]) === 3}
      data-dawn-approaching={gameState?.currentTime && 
        parseInt(gameState.currentTime.split(':')[0]) >= 5}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: hudVisible ? hudOpacity : 0.3,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: "'Courier New', monospace"
      }}
    >
      {/* Timer Component */}
      {(showAll || currentLayout.showTimer) && (customComponents.Timer || (
        <div
          className="hud-timer"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            ...getPositionStyle(currentLayout.timerPosition)
          }}
        >
          <Timer
            size={getComponentSize()}
            showProgress={layout !== 'minimal'}
            showCountdown={layout !== 'minimal'}
          />
        </div>
      ))}

      {/* Fear Meter Component */}
      {(showAll || currentLayout.showFearMeter) && (customComponents.FearMeter || (
        <div
          className="hud-fear-meter"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            ...getPositionStyle(currentLayout.fearMeterPosition),
            ...(currentLayout.fearMeterPosition === currentLayout.healthBarPosition && {
              transform: 'translateY(80px)' // Offset if same position as health bar
            })
          }}
        >
          <FearMeter
            size={getComponentSize()}
            showLabel={layout !== 'minimal'}
            showPercentage={layout === 'debug'}
          />
        </div>
      ))}

      {/* Health Bar Component */}
      {(showAll || currentLayout.showHealthBar) && (customComponents.HealthBar || (
        <div
          className="hud-health-bar"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            ...getPositionStyle(currentLayout.healthBarPosition),
            ...(currentLayout.fearMeterPosition === currentLayout.healthBarPosition && {
              transform: 'translateY(160px)' // Offset below fear meter
            })
          }}
        >
          <HealthBar
            size={getComponentSize()}
            showLabel={layout !== 'minimal'}
            showValue={layout === 'debug'}
            orientation="horizontal"
          />
        </div>
      ))}

      {/* Inventory Component */}
      {(showAll || currentLayout.showInventory) && (customComponents.Inventory || (
        <div
          className="hud-inventory"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            ...getPositionStyle(currentLayout.inventoryPosition)
          }}
        >
          <Inventory
            size={getComponentSize()}
            showLabel={layout !== 'minimal'}
            maxVisible={screenSize === 'mobile' ? 4 : 6}
            layout={screenSize === 'mobile' ? 'vertical' : 'horizontal'}
          />
        </div>
      ))}

      {/* Voice Indicator Component */}
      {(showAll || currentLayout.showVoiceIndicator) && (customComponents.VoiceIndicator || (
        <VoiceIndicator
          size={getComponentSize()}
          showLabel={layout !== 'minimal'}
          showWaveform={layout === 'debug'}
          position={currentLayout.voiceIndicatorPosition}
        />
      ))}

      {/* HUD Toggle Button (Debug mode only) */}
      {layout === 'debug' && (
        <div
          className="hud-toggle"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            pointerEvents: 'auto',
            zIndex: 1001
          }}
        >
          <button
            onClick={toggleHudVisibility}
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace"
            }}
          >
            {hudVisible ? 'Hide HUD' : 'Show HUD'}
          </button>
        </div>
      )}

      {/* Game State Debug Info (Debug mode only) */}
      {layout === 'debug' && gameState && (
        <div
          className="debug-info"
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            pointerEvents: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #00ff00',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '10px',
            color: '#00ff00',
            fontFamily: "'Courier New', monospace",
            maxWidth: '200px'
          }}
        >
          <div>Time: {gameState.currentTime}</div>
          <div>Fear: {Math.round(gameState.fearLevel || 0)}%</div>
          <div>Health: {Math.round(gameState.health || 100)}%</div>
          <div>Items: {gameState.inventory?.length || 0}</div>
          <div>Alive: {gameState.isAlive ? 'Yes' : 'No'}</div>
          <div>Started: {gameState.gameStarted ? 'Yes' : 'No'}</div>
          <div>Screen: {screenSize}</div>
        </div>
      )}

      {/* CSS Styles */}
      <style jsx>{`
        .game-hud {
          user-select: none;
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .game-hud.minimal {
          opacity: 0.8;
        }

        .game-hud.compact .hud-timer,
        .game-hud.compact .hud-fear-meter,
        .game-hud.compact .hud-health-bar {
          transform: scale(0.9);
          transition: transform 0.3s ease;
        }

        /* Enhanced responsive adjustments with smooth scaling */
        @media (max-width: 768px) {
          .game-hud {
            font-size: 12px;
          }
          
          .hud-timer,
          .hud-fear-meter,
          .hud-health-bar,
          .hud-inventory {
            transform: scale(0.8);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        @media (max-width: 480px) {
          .game-hud {
            font-size: 10px;
          }
          
          .hud-timer,
          .hud-fear-meter,
          .hud-health-bar,
          .hud-inventory {
            transform: scale(0.7);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        /* Enhanced animations with smooth transitions */
        .game-hud {
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 0.3s ease;
        }

        /* Enhanced high fear state styling with glitch effects */
        .game-hud[data-high-fear="true"] {
          filter: brightness(0.9) contrast(1.1) saturate(1.2);
          animation: fearGlitch 3s infinite;
        }

        @keyframes fearGlitch {
          0%, 90%, 100% {
            transform: translate(0);
            filter: brightness(0.9) contrast(1.1) saturate(1.2);
          }
          92% {
            transform: translate(-1px, 1px);
            filter: brightness(1.1) contrast(1.3) saturate(0.8) hue-rotate(5deg);
          }
          94% {
            transform: translate(1px, -1px);
            filter: brightness(0.8) contrast(1.4) saturate(1.5) hue-rotate(-3deg);
          }
          96% {
            transform: translate(-1px, -1px);
            filter: brightness(1.0) contrast(1.2) saturate(1.1) hue-rotate(2deg);
          }
        }

        /* Enhanced critical health state styling */
        .game-hud[data-critical-health="true"] {
          animation: criticalHealthPulse 1.5s infinite;
        }

        @keyframes criticalHealthPulse {
          0%, 100% {
            filter: brightness(1) saturate(1);
            border-color: rgba(0, 255, 0, 0.3);
          }
          25% {
            filter: brightness(1.1) saturate(1.2) hue-rotate(10deg);
            border-color: rgba(255, 100, 100, 0.5);
          }
          50% {
            filter: brightness(1.2) saturate(1.4) hue-rotate(15deg);
            border-color: rgba(255, 50, 50, 0.7);
          }
          75% {
            filter: brightness(1.1) saturate(1.2) hue-rotate(10deg);
            border-color: rgba(255, 100, 100, 0.5);
          }
        }

        /* Smooth component transitions */
        .hud-timer,
        .hud-fear-meter,
        .hud-health-bar,
        .hud-inventory,
        .hud-voice-indicator {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced visual polish */
        .hud-timer:hover,
        .hud-fear-meter:hover,
        .hud-health-bar:hover,
        .hud-inventory:hover {
          transform: scale(1.02);
          filter: brightness(1.1);
        }

        /* Witching hour special effects */
        .game-hud[data-witching-hour="true"] {
          animation: witchingHourEffect 4s infinite;
        }

        @keyframes witchingHourEffect {
          0%, 95%, 100% {
            filter: brightness(1) contrast(1) saturate(1);
          }
          97% {
            filter: brightness(0.7) contrast(1.5) saturate(0.5) hue-rotate(180deg);
          }
          98% {
            filter: brightness(1.3) contrast(0.8) saturate(1.8) hue-rotate(-90deg);
          }
        }

        /* Dawn approach relief effect */
        .game-hud[data-dawn-approaching="true"] {
          animation: dawnReliefEffect 3s infinite;
        }

        @keyframes dawnReliefEffect {
          0%, 100% {
            filter: brightness(1) saturate(1);
          }
          50% {
            filter: brightness(1.1) saturate(1.2) hue-rotate(-10deg);
          }
        }
      `}</style>
    </div>
  );
};

export default HUD;