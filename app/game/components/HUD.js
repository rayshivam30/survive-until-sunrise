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

  // Monitor game state for HUD visibility
  useEffect(() => {
    if (!gameState) return;

    const gameActive = gameState.gameStarted && gameState.isAlive;
    setIsGameActive(gameActive);

    // Auto-hide HUD in certain conditions
    if (gameState.fearLevel > 90) {
      // Reduce HUD opacity when fear is very high
      setHudOpacity(0.7);
    } else {
      setHudOpacity(1);
    }
  }, [gameState]);

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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: hudVisible ? hudOpacity : 0.3,
        transition: 'opacity 0.3s ease',
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
        }

        .game-hud.minimal {
          opacity: 0.8;
        }

        .game-hud.compact .hud-timer,
        .game-hud.compact .hud-fear-meter,
        .game-hud.compact .hud-health-bar {
          transform: scale(0.9);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .game-hud {
            font-size: 12px;
          }
          
          .hud-timer,
          .hud-fear-meter,
          .hud-health-bar,
          .hud-inventory {
            transform: scale(0.8);
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
          }
        }

        /* Animation for HUD visibility */
        .game-hud {
          transition: opacity 0.3s ease;
        }

        /* High fear state styling */
        .game-hud[data-high-fear="true"] {
          filter: brightness(0.9) contrast(1.1);
        }

        /* Critical health state styling */
        .game-hud[data-critical-health="true"] {
          animation: criticalHealthPulse 2s infinite;
        }

        @keyframes criticalHealthPulse {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.1) hue-rotate(10deg);
          }
        }
      `}</style>
    </div>
  );
};

export default HUD;