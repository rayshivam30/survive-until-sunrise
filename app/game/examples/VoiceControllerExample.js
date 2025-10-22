/**
 * Example integration of enhanced VoiceController with GameEngine
 * Shows how to use the advanced voice command system in the game
 */

"use client";

import { useState, useCallback, useEffect } from 'react';
import VoiceController from '../components/VoiceController.js';
import { GameEngine } from '../engine/GameEngine.js';

export default function VoiceControllerExample() {
  const [gameEngine] = useState(() => new GameEngine());
  const [gameState, setGameState] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('initializing');
  const [lastCommand, setLastCommand] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Update game state when engine updates
  useEffect(() => {
    const unsubscribe = gameEngine.onUpdate((deltaTime, state) => {
      setGameState(state);
    });

    // Start the game engine
    gameEngine.start();

    return () => {
      unsubscribe();
      gameEngine.stop();
    };
  }, [gameEngine]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((parsedCommand) => {
    console.log('Voice command received:', parsedCommand);
    setLastCommand(parsedCommand);
    setErrorMessage(null);

    // Process the command through the game engine
    const success = gameEngine.handleCommand(parsedCommand.originalText);
    
    if (success) {
      // Provide audio feedback for successful commands
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(
          `Executing ${parsedCommand.action} command`
        );
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.warn('Command not handled by game engine:', parsedCommand);
    }
  }, [gameEngine]);

  // Handle voice errors
  const handleVoiceError = useCallback((error) => {
    console.error('Voice error:', error);
    setErrorMessage(error.message);
    
    // Provide helpful feedback based on error type
    if (window.speechSynthesis && error.type !== 'no-speech') {
      const utterance = new SpeechSynthesisUtterance(error.message);
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Register command handlers with the game engine
  useEffect(() => {
    // Register basic command handlers
    gameEngine.registerCommandHandler('hide', (command, state) => {
      console.log('Hide command executed');
      state.updateFear(-5); // Reduce fear when hiding
      return true;
    });

    gameEngine.registerCommandHandler('run', (command, state) => {
      console.log('Run command executed');
      state.updateFear(-10); // Reduce fear when running
      state.updateHealth(-2); // But lose some health from exertion
      return true;
    });

    gameEngine.registerCommandHandler('flashlight', (command, state) => {
      const flashlight = state.getInventoryItem('flashlight');
      if (flashlight) {
        console.log('Flashlight command executed');
        state.useItem('flashlight');
        state.updateFear(-15); // Light reduces fear significantly
        return true;
      }
      return false;
    });

    gameEngine.registerCommandHandler('listen', (command, state) => {
      console.log('Listen command executed');
      // Listening might reveal information but could increase fear
      state.updateFear(2);
      return true;
    });

    gameEngine.registerCommandHandler('help', (command, state) => {
      console.log('Help command executed');
      if (window.speechSynthesis) {
        const helpText = 'Available commands: hide, run, open, flashlight, listen, look, wait';
        const utterance = new SpeechSynthesisUtterance(helpText);
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
      return true;
    });

    // Add a flashlight to inventory for testing
    gameState?.addToInventory({
      id: 'flashlight',
      name: 'flashlight',
      type: 'tool',
      durability: 100
    });

    return () => {
      // Cleanup command handlers
      gameEngine.unregisterCommandHandler('hide');
      gameEngine.unregisterCommandHandler('run');
      gameEngine.unregisterCommandHandler('flashlight');
      gameEngine.unregisterCommandHandler('listen');
      gameEngine.unregisterCommandHandler('help');
    };
  }, [gameEngine, gameState]);

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="voice-controller-example p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Enhanced Voice Controller Demo</h1>
      
      {/* Voice Controller Component */}
      <VoiceController
        onCommand={handleVoiceCommand}
        onError={handleVoiceError}
        gameContext={{
          fearLevel: gameState.fearLevel,
          health: gameState.health,
          location: gameState.location,
          inventory: gameState.inventory
        }}
        isEnabled={true}
        confidenceThreshold={0.3}
      />

      {/* Game Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-white">Game Status</h2>
          <div className="space-y-2 text-gray-300">
            <div>Time: {gameState.currentTime}</div>
            <div>Fear Level: {gameState.fearLevel.toFixed(1)}/100</div>
            <div>Health: {gameState.health.toFixed(1)}/100</div>
            <div>Location: {gameState.location}</div>
            <div>Alive: {gameState.isAlive ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-white">Voice Status</h2>
          <div className="space-y-2 text-gray-300">
            <div>Status: {voiceStatus}</div>
            <div>Last Command: {lastCommand?.action || 'None'}</div>
            <div>Confidence: {lastCommand?.confidence ? (lastCommand.confidence * 100).toFixed(1) + '%' : 'N/A'}</div>
            <div>Match Type: {lastCommand?.matchType || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Inventory Display */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3 text-white">Inventory</h2>
        <div className="space-y-2">
          {gameState.inventory.length > 0 ? (
            gameState.inventory.map((item, index) => (
              <div key={index} className="text-gray-300">
                {item.name} ({item.type}) - Durability: {item.durability}%
              </div>
            ))
          ) : (
            <div className="text-gray-500">No items</div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6">
          <h3 className="text-red-300 font-semibold">Voice Error</h3>
          <p className="text-red-200">{errorMessage}</p>
        </div>
      )}

      {/* Command History */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3 text-white">Recent Commands</h2>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {gameState.commandsIssued.slice(-10).reverse().map((cmd, index) => (
            <div key={index} className="text-gray-300 text-sm">
              [{cmd.timestamp}] {cmd.command}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900 border border-blue-700 p-4 rounded-lg">
        <h3 className="text-blue-300 font-semibold mb-2">Voice Commands</h3>
        <div className="text-blue-200 text-sm space-y-1">
          <div><strong>Hide:</strong> "hide", "duck", "take cover", "get down"</div>
          <div><strong>Run:</strong> "run", "flee", "escape", "sprint"</div>
          <div><strong>Flashlight:</strong> "flashlight", "light", "turn on light"</div>
          <div><strong>Listen:</strong> "listen", "hear", "pay attention"</div>
          <div><strong>Help:</strong> "help", "commands", "what can I do"</div>
          <div className="mt-2 text-blue-300">
            Try speaking naturally! The system understands variations and context.
          </div>
        </div>
      </div>
    </div>
  );
}