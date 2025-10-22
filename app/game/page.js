"use client";

import { useState, useEffect } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import VoiceController from "./components/VoiceController";
import GameDemo from "./components/GameDemo";
import { playAmbient, playWhisper } from "./utils/soundManager";

// Game component that uses the game context
function Game() {
  const { 
    gameState, 
    isEngineReady, 
    startGame, 
    handleCommand, 
    isGameRunning,
    gameProgress 
  } = useGame();
  
  const [messages, setMessages] = useState(["Survive until sunrise."]);

  useEffect(() => {
    if (isEngineReady) {
      // Start the game when engine is ready
      startGame();
      playAmbient();
    }
  }, [isEngineReady, startGame]);

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

  if (!isEngineReady) {
    return (
      <div className="w-screen h-screen bg-black text-green-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Survive Until Sunrise</h1>
          <p className="text-xl">Initializing game engine...</p>
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
          <div className="game-hud fixed top-4 right-4 text-right p-4 rounded">
            <div className="text-2xl font-bold terminal-text">{gameState.currentTime}</div>
            <div className="text-sm opacity-75">Until Sunrise</div>
            <div className={`text-sm mt-2 ${
              gameState.fearLevel < 25 ? 'fear-low' : 
              gameState.fearLevel < 50 ? 'fear-medium' : 
              gameState.fearLevel < 75 ? 'fear-high' : 'fear-critical pulse'
            }`}>
              Fear: {Math.round(gameState.fearLevel)}%
            </div>
            <div className={`text-sm ${
              gameState.health > 75 ? 'health-full' : 
              gameState.health > 50 ? 'health-good' : 
              gameState.health > 25 ? 'health-medium' : 
              gameState.health > 10 ? 'health-low' : 'health-critical pulse'
            }`}>
              Health: {Math.round(gameState.health)}%
            </div>
            <div className="text-sm opacity-75">Progress: {Math.round(gameProgress)}%</div>
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
