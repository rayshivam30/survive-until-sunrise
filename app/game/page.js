"use client";

import { useState, useEffect } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import VoiceController from "./components/VoiceController";
import GameDemo from "./components/GameDemo";
import GameWorld from "./components/GameWorld";
import Timer from "./components/Timer";
import DemoStats from "./components/DemoStats";
import { initializeAudio, playAmbient, playWhisper, updateAudioForGameState } from "./utils/soundManager";

// Game component that uses the game context
function Game() {
  const { 
    gameState, 
    isEngineReady, 
    initializationProgress,
    initializationError,
    startGame, 
    handleCommand, 
    isGameRunning,
    gameProgress 
  } = useGame();
  
  const [messages, setMessages] = useState([
    "🌙 Welcome to Survive Until Sunrise",
    "You find yourself in a dark room. You need to survive until 6:00 AM.",
    "💡 Try using the demo panel on the left to add a flashlight, then use it!"
  ]);
  const [showDemoStats, setShowDemoStats] = useState(process.env.NODE_ENV === 'development');

  // Get background color based on active items and game state
  const getBackgroundColor = () => {
    if (!gameState) return '#000000';
    
    // Check for active light sources
    const hasActiveFlashlight = gameState.inventory?.some(item => 
      item.id === 'flashlight' && item.isActive && item.durability > 0
    );
    const hasActiveCandle = gameState.inventory?.some(item => 
      item.id === 'candle' && item.isActive && item.durability > 0
    );
    const hasActivePhone = gameState.inventory?.some(item => 
      item.id === 'phone' && item.isActive && item.durability > 0
    );

    // Light sources provide significant illumination
    if (hasActiveFlashlight) {
      return '#1a1a2e'; // Much brighter blue tint for flashlight
    } else if (hasActiveCandle) {
      return '#2e1a0a'; // Warm orange tint for candle
    } else if (hasActivePhone) {
      return '#1a1a1a'; // Gray tint for phone
    }
    
    // Fear level affects visibility
    if (gameState.fearLevel > 80) {
      return '#0a0005'; // Very dark when scared
    }
    
    return '#000000'; // Complete darkness
  };

  // Get CSS class for game area based on active items
  const getGameAreaClass = () => {
    if (!gameState) return '';
    
    const hasActiveFlashlight = gameState.inventory?.some(item => 
      item.id === 'flashlight' && item.isActive && item.durability > 0
    );
    const hasActiveCandle = gameState.inventory?.some(item => 
      item.id === 'candle' && item.isActive && item.durability > 0
    );
    
    if (hasActiveFlashlight) return 'flashlight-active';
    if (hasActiveCandle) return 'candle-active';
    return '';
  };

  // Get environment description based on game state
  const getEnvironmentDescription = () => {
    if (!gameState) return "You are in complete darkness...";
    
    const hasActiveFlashlight = gameState.inventory?.some(item => 
      item.id === 'flashlight' && item.isActive && item.durability > 0
    );
    const hasActiveCandle = gameState.inventory?.some(item => 
      item.id === 'candle' && item.isActive && item.durability > 0
    );
    const hasActivePhone = gameState.inventory?.some(item => 
      item.id === 'phone' && item.isActive && item.durability > 0
    );

    if (hasActiveFlashlight) {
      return `🔦 Your flashlight beam cuts through the darkness, revealing a small room with old furniture. Shadows dance at the edges of the light. You can see a door to the north and a window to the east. The floorboards creak under your feet.`;
    } else if (hasActiveCandle) {
      return `🕯️ The candle's warm glow illuminates your immediate surroundings. You can make out the outline of furniture and walls, but the corners remain shrouded in darkness. The flame flickers occasionally, casting moving shadows.`;
    } else if (hasActivePhone) {
      return `📱 Your phone's dim screen provides minimal light. You can barely make out shapes in the darkness. The battery indicator shows it won't last much longer.`;
    } else {
      if (gameState.fearLevel > 70) {
        return `🌑 Complete darkness surrounds you. Every sound makes you jump. You feel like something is watching you from the shadows. Your heart pounds in your chest.`;
      } else if (gameState.fearLevel > 40) {
        return `🌑 You are in total darkness. You can hear your own breathing and the occasional creak of the building. Something doesn't feel right.`;
      } else {
        return `🌑 You stand in darkness. It's quiet, but you remain alert. You need to find a light source or navigate carefully.`;
      }
    }
  };

  useEffect(() => {
    if (isEngineReady) {
      // Game systems are already initialized by GameInitializer
      // Just start the game
      startGame();
    }
  }, [isEngineReady, startGame]);

  // Update audio based on game state changes
  useEffect(() => {
    if (gameState && isEngineReady) {
      updateAudioForGameState(gameState);
    }
  }, [gameState, isEngineReady]);

  const onCommand = (command) => {
    if (!command || typeof command !== 'string') return;
    
    // Handle command through game engine
    const handled = handleCommand(command);
    
    // Add message to display
    setMessages(prev => [...prev, `> ${command}`]);

    if (handled) {
      setMessages(prev => [...prev, "✓ Command executed"]);
    } else {
      setMessages(prev => [...prev, "? I don't understand that command. Try: 'hide', 'run', 'use flashlight', 'search'"]);
    }

    // Dynamic response based on game state
    if (gameState) {
      if (gameState.fearLevel > 70) {
        setMessages(prev => [...prev, "⚠ Your heart pounds as terror grips you!"]);
        if (playWhisper) playWhisper();
      } else if (gameState.fearLevel > 40) {
        setMessages(prev => [...prev, "⚡ You feel uneasy but maintain composure."]);
      } else {
        setMessages(prev => [...prev, "✨ You remain calm and focused."]);
      }
    }
  };

  // Show initialization progress
  if (!isEngineReady) {
    return (
      <div className="w-screen h-screen bg-black text-green-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Survive Until Sunrise</h1>
          
          {initializationError ? (
            <div className="text-red-400">
              <p className="text-xl mb-2">Initialization Failed</p>
              <p className="text-sm mb-2">Step: {initializationError.step}</p>
              <p className="text-sm">{initializationError.error}</p>
              <button 
                className="mt-4 px-4 py-2 border border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : initializationProgress ? (
            <div>
              <p className="text-xl mb-2">Initializing game systems...</p>
              <p className="text-sm mb-2">{initializationProgress.name}</p>
              <div className="w-64 bg-gray-800 rounded-full h-2 mx-auto">
                <div 
                  className="bg-green-300 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${initializationProgress.progress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-2">
                Step {initializationProgress.step} of {initializationProgress.total}
              </p>
            </div>
          ) : (
            <p className="text-xl">Starting initialization...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black text-green-300 flex">
      {/* Game Demo Panel */}
      <div className="w-1/4 overflow-y-auto border-r border-green-500">
        <GameDemo />
      </div>
      
      {/* Main Game World */}
      <div className="w-3/4 overflow-y-auto">
        <div className="flex">
          {/* Game HUD - Top */}
          <div className="w-full p-4 border-b border-green-500">
            <div className="flex justify-between items-center">
              <div className="flex gap-6">
                {gameState && (
                  <>
                    <div className={`font-mono text-sm ${
                      gameState.fearLevel < 25 ? 'text-green-400' : 
                      gameState.fearLevel < 50 ? 'text-yellow-400' : 
                      gameState.fearLevel < 75 ? 'text-orange-400' : 'text-red-400 animate-pulse'
                    }`}>
                      😰 Fear: {Math.round(gameState.fearLevel)}%
                    </div>
                    <div className={`font-mono text-sm ${
                      gameState.health > 75 ? 'text-green-400' : 
                      gameState.health > 50 ? 'text-yellow-400' : 
                      gameState.health > 25 ? 'text-orange-400' : 'text-red-400 animate-pulse'
                    }`}>
                      ❤️ Health: {Math.round(gameState.health)}%
                    </div>
                    
                    {/* Active Items */}
                    {gameState.inventory && gameState.inventory.filter(item => item.isActive).length > 0 && (
                      <div className="flex gap-2">
                        {gameState.inventory.filter(item => item.isActive).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-yellow-900 bg-opacity-30 rounded border border-yellow-400 border-opacity-50">
                            <span>{item.icon || '🔧'}</span>
                            <span className="text-xs text-yellow-300">{item.name}</span>
                            {item.durability !== undefined && (
                              <span className={`text-xs ${
                                item.durability > 50 ? 'text-green-400' : 
                                item.durability > 20 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {Math.round(item.durability)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <Timer />
            </div>
          </div>
        </div>

        {/* Game World Component */}
        <GameWorld />

        {/* Game Messages */}
        <div className="p-4 border-t border-green-500 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {messages.slice(-5).map((msg, idx) => (
              <div key={idx} className={`p-2 rounded font-mono text-sm ${
                idx === messages.length - 1 ? 
                'bg-green-900 bg-opacity-30 border border-green-400 text-green-300' : 
                'bg-gray-900 bg-opacity-50 text-gray-300'
              }`}>
                {msg}
              </div>
            ))}
            
            {/* Game Status Messages */}
            {gameState && !isGameRunning && gameState.isAlive === false && (
              <div className="p-3 bg-red-900 bg-opacity-50 border border-red-400 rounded text-center">
                <div className="text-red-400 text-lg font-bold">💀 GAME OVER 💀</div>
                <div className="text-red-300 text-sm">You did not survive the night.</div>
              </div>
            )}
            
            {gameState && gameState.currentTime === "06:00" && gameState.isAlive && (
              <div className="p-3 bg-yellow-900 bg-opacity-50 border border-yellow-400 rounded text-center">
                <div className="text-yellow-400 text-lg font-bold">🌅 VICTORY! 🌅</div>
                <div className="text-yellow-300 text-sm">You survived until sunrise!</div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Controller (hidden) */}
        <VoiceController onCommand={onCommand} />
      </div>
      
      {/* Demo Statistics for Hackathon */}
      <DemoStats visible={showDemoStats} position="bottom-right" />
      
      {/* Demo Toggle (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setShowDemoStats(!showDemoStats)}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #00ff00',
            color: '#00ff00',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'Courier New', monospace",
            zIndex: 2001
          }}
        >
          {showDemoStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      )}
    </div>
  );
}

// Main page component with GameProvider
export default function GamePage() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
