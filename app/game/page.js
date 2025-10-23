"use client";

import { useState, useEffect } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import VoiceController from "./components/VoiceController";
import GameDemo from "./components/GameDemo";
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
  
  const [messages, setMessages] = useState(["Survive until sunrise."]);
  const [showDemoStats, setShowDemoStats] = useState(process.env.NODE_ENV === 'development');

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
    // Handle command through game engine
    const handled = handleCommand(command);
    
    // Add message to display
    setMessages(prev => [...prev, `You said: "${command}"`]);

    if (handled) {
      setMessages(prev => [...prev, "Command processed..."]);
    } else {
      setMessages(prev => [...prev, "I don't understand that command."]);
    }

    // Example: AI response intensity based on fear level
    if (gameState && gameState.fearLevel > 50) {
      setMessages(prev => [...prev, "The monster senses your fear! It gets closer."]);
      playWhisper();
    } else if (gameState) {
      setMessages(prev => [...prev, "You stay calm... for now."]);
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
      <div className="w-1/3 overflow-y-auto">
        <GameDemo />
      </div>
      
      {/* Main Game Area */}
      <div className="w-2/3 p-4 relative">
        {/* Game HUD */}
        {gameState && (
          <div className="game-hud fixed top-4 right-4 text-right">
            {/* Timer Component */}
            <Timer className="mb-4" />
            
            {/* Other HUD Elements */}
            <div className="hud-stats p-4 rounded bg-black bg-opacity-70 border border-green-300 border-opacity-30">
              <div className={`text-sm mb-2 ${
                gameState.fearLevel < 25 ? 'fear-low' : 
                gameState.fearLevel < 50 ? 'fear-medium' : 
                gameState.fearLevel < 75 ? 'fear-high' : 'fear-critical pulse'
              }`}>
                Fear: {Math.round(gameState.fearLevel)}%
              </div>
              <div className={`text-sm mb-2 ${
                gameState.health > 75 ? 'health-full' : 
                gameState.health > 50 ? 'health-good' : 
                gameState.health > 25 ? 'health-medium' : 
                gameState.health > 10 ? 'health-low' : 'health-critical pulse'
              }`}>
                Health: {Math.round(gameState.health)}%
              </div>
              {gameState.inventory && gameState.inventory.length > 0 && (
                <div className="text-sm opacity-75">
                  Items: {gameState.inventory.length}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Controller */}
        <VoiceController onCommand={onCommand} />
        
        {/* Game Messages */}
        <div className="message-log h-full flex flex-col justify-end overflow-y-auto pt-20">
          {messages.map((msg, idx) => (
            <p key={idx} className={`mb-1 ${idx === messages.length - 1 ? 'terminal-text' : ''}`}>
              {msg}
            </p>
          ))}
          
          {/* Game Status */}
          {gameState && !isGameRunning && gameState.isAlive === false && (
            <div className="text-red-400 text-xl mt-4 glitch">
              Game Over - You did not survive the night.
            </div>
          )}
          
          {gameState && gameState.currentTime === "06:00" && gameState.isAlive && (
            <div className="text-yellow-400 text-xl mt-4 terminal-text">
              Victory! You survived until sunrise!
            </div>
          )}
        </div>
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
