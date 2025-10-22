/**
 * HUDDemo - Demonstration component showing all HUD components
 * Used for testing and showcasing the HUD system
 */

"use client";

import React, { useState, useEffect } from 'react';
import Timer from './Timer';
import FearMeter from './FearMeter';
import HealthBar from './HealthBar';
import Inventory from './Inventory';
import VoiceIndicator from './VoiceIndicator';
import HUD from './HUD';

// Mock game context for demo
const mockGameContext = {
  gameState: {
    currentTime: '02:15',
    fearLevel: 65,
    health: 45,
    inventory: [
      { id: '1', name: 'Flashlight', type: 'light', durability: 30, isActive: true, icon: '🔦' },
      { id: '2', name: 'Old Key', type: 'key', quantity: 1, icon: '🗝️' },
      { id: '3', name: 'Bandage', type: 'consumable', quantity: 3, icon: '🩹' },
      { id: '4', name: 'Knife', type: 'weapon', durability: 85, icon: '🔪' },
      { id: '5', name: 'Map', type: 'document', icon: '🗺️' }
    ],
    gameStarted: true,
    isAlive: true,
    isListening: false
  },
  gameEngine: {
    gameTimer: {
      getTimeUntilSunrise: () => ({
        hours: 3,
        minutes: 45,
        totalMinutes: 225,
        percentage: 62.5
      })
    },
    voiceController: {},
    useItem: (itemId) => console.log(`Using item: ${itemId}`)
  }
};

// Mock the useGame hook for this demo
const GameContextProvider = ({ children, gameState }) => {
  return (
    <div data-mock-game-context={JSON.stringify(gameState)}>
      {children}
    </div>
  );
};

const HUDDemo = () => {
  const [demoState, setDemoState] = useState(mockGameContext.gameState);
  const [selectedLayout, setSelectedLayout] = useState('default');
  const [animationRunning, setAnimationRunning] = useState(false);

  // Mock the useGame hook for components
  React.useEffect(() => {
    // Override the useGame hook for demo purposes
    const originalModule = require('../../context/GameContext');
    originalModule.useGame = () => ({
      gameState: demoState,
      gameEngine: mockGameContext.gameEngine
    });
  }, [demoState]);

  // Simulate dynamic changes for demo
  useEffect(() => {
    if (!animationRunning) return;

    const interval = setInterval(() => {
      setDemoState(prev => {
        // Simulate time progression
        const [hours, minutes] = prev.currentTime.split(':').map(Number);
        let newMinutes = minutes + 5;
        let newHours = hours;
        
        if (newMinutes >= 60) {
          newMinutes = 0;
          newHours = (newHours + 1) % 24;
        }
        
        const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        
        // Simulate fear and health changes
        const fearChange = (Math.random() - 0.5) * 10;
        const healthChange = (Math.random() - 0.6) * 5; // Slight bias toward losing health
        
        return {
          ...prev,
          currentTime: newTime,
          fearLevel: Math.max(0, Math.min(100, prev.fearLevel + fearChange)),
          health: Math.max(0, Math.min(100, prev.health + healthChange)),
          isListening: Math.random() > 0.7 // Randomly listening
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [animationRunning]);

  // Control functions
  const resetDemo = () => {
    setDemoState(mockGameContext.gameState);
    setAnimationRunning(false);
  };

  const toggleAnimation = () => {
    setAnimationRunning(!animationRunning);
  };

  const adjustFear = (delta) => {
    setDemoState(prev => ({
      ...prev,
      fearLevel: Math.max(0, Math.min(100, prev.fearLevel + delta))
    }));
  };

  const adjustHealth = (delta) => {
    setDemoState(prev => ({
      ...prev,
      health: Math.max(0, Math.min(100, prev.health + delta))
    }));
  };

  const toggleListening = () => {
    setDemoState(prev => ({
      ...prev,
      isListening: !prev.isListening
    }));
  };

  return (
    <div className="hud-demo" style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#000000',
      position: 'relative',
      fontFamily: "'Courier New', monospace"
    }}>
      {/* Demo Controls */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #00ff00',
        borderRadius: '8px',
        padding: '16px',
        color: '#00ff00',
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#00ff00' }}>HUD Demo Controls</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Layout:</label>
          <select 
            value={selectedLayout} 
            onChange={(e) => setSelectedLayout(e.target.value)}
            style={{
              backgroundColor: '#000000',
              border: '1px solid #00ff00',
              color: '#00ff00',
              padding: '4px',
              width: '100%'
            }}
          >
            <option value="default">Default</option>
            <option value="minimal">Minimal</option>
            <option value="compact">Compact</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <button 
            onClick={toggleAnimation}
            style={{
              backgroundColor: animationRunning ? '#ff6600' : '#00ff00',
              color: '#000000',
              border: 'none',
              padding: '6px 12px',
              marginRight: '8px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {animationRunning ? 'Stop Animation' : 'Start Animation'}
          </button>
          
          <button 
            onClick={resetDemo}
            style={{
              backgroundColor: '#666666',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Fear Level: {Math.round(demoState.fearLevel)}%</label>
          <div>
            <button onClick={() => adjustFear(-10)} style={{ backgroundColor: '#22c55e', color: '#000', border: 'none', padding: '2px 6px', marginRight: '4px', fontSize: '10px' }}>-10</button>
            <button onClick={() => adjustFear(10)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '2px 6px', fontSize: '10px' }}>+10</button>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Health: {Math.round(demoState.health)}%</label>
          <div>
            <button onClick={() => adjustHealth(10)} style={{ backgroundColor: '#22c55e', color: '#000', border: 'none', padding: '2px 6px', marginRight: '4px', fontSize: '10px' }}>+10</button>
            <button onClick={() => adjustHealth(-10)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '2px 6px', fontSize: '10px' }}>-10</button>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <button 
            onClick={toggleListening}
            style={{
              backgroundColor: demoState.isListening ? '#3b82f6' : '#6b7280',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              width: '100%'
            }}
          >
            {demoState.isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        </div>

        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          <div>Time: {demoState.currentTime}</div>
          <div>Items: {demoState.inventory.length}</div>
          <div>Status: {demoState.isAlive ? 'Alive' : 'Dead'}</div>
        </div>
      </div>

      {/* Individual Component Showcase */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #00ff00',
        borderRadius: '8px',
        padding: '16px',
        color: '#00ff00',
        fontSize: '12px',
        maxWidth: '250px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#00ff00' }}>Individual Components</h3>
        
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px' }}>Timer (Small)</h4>
          <Timer size="small" showProgress={true} showCountdown={true} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px' }}>Fear Meter</h4>
          <FearMeter size="small" showLabel={true} showPercentage={true} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px' }}>Health Bar</h4>
          <HealthBar size="small" showLabel={true} showValue={true} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px' }}>Inventory</h4>
          <Inventory size="small" showLabel={true} maxVisible={3} layout="grid" />
        </div>
      </div>

      {/* Background for atmosphere */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at center, rgba(0, 50, 0, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%)',
        zIndex: 1
      }} />

      {/* Main HUD Display */}
      <GameContextProvider gameState={demoState}>
        <HUD layout={selectedLayout} />
      </GameContextProvider>

      {/* Demo Info */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #00ff00',
        borderRadius: '20px',
        padding: '8px 16px',
        color: '#00ff00',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        HUD Components Demo - Layout: {selectedLayout.toUpperCase()}
      </div>
    </div>
  );
};

export default HUDDemo;