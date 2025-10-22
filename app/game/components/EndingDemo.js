/**
 * EndingDemo - Demonstrates the ending system functionality
 * Shows different ending scenarios and achievement tracking
 */

import React, { useState, useEffect } from 'react';
import { GameEngine } from '../engine/GameEngine.js';
import EndingScreen from './EndingScreen.js';
import AchievementViewer from './AchievementViewer.js';

const EndingDemo = () => {
  const [gameEngine, setGameEngine] = useState(null);
  const [currentEnding, setCurrentEnding] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    // Initialize game engine
    const engine = new GameEngine();
    setGameEngine(engine);
    setGameState(engine.getGameState());

    // Set up ending callback
    engine.getEndingSystem().onEnding((ending, content) => {
      setCurrentEnding({ ending, content, canRestart: true });
    });

    return () => {
      if (engine) {
        engine.stop();
      }
    };
  }, []);

  const triggerEnding = async (endingType) => {
    if (!gameEngine) return;

    const gameState = gameEngine.getGameState();
    
    // Set up different ending scenarios
    switch (endingType) {
      case 'perfect_survivor':
        gameState.isAlive = true;
        gameState.currentTime = "06:00";
        gameState.fearLevel = 20;
        gameState.health = 90;
        gameState.inventory = [
          { id: 'hidden_key', type: 'secret' },
          { id: 'secret_note', type: 'secret' },
          { id: 'flashlight', type: 'tool', durability: 80 }
        ];
        break;
        
      case 'brave_survivor':
        gameState.isAlive = true;
        gameState.currentTime = "06:00";
        gameState.fearLevel = 80;
        gameState.health = 60;
        gameState.commandsIssued = new Array(20).fill('test_command');
        break;
        
      case 'fear_death':
        gameState.isAlive = false;
        gameState.fearLevel = 100;
        gameState.health = 50;
        gameState.commandsIssued = new Array(10).fill('test_command');
        break;
        
      case 'health_death':
        gameState.isAlive = false;
        gameState.fearLevel = 60;
        gameState.health = 0;
        break;
        
      case 'basic_survivor':
      default:
        gameState.isAlive = true;
        gameState.currentTime = "06:00";
        gameState.fearLevel = 50;
        gameState.health = 50;
        break;
    }

    // Trigger the ending
    await gameEngine.getEndingSystem().triggerEnding();
  };

  const handleRestart = () => {
    setCurrentEnding(null);
    if (gameEngine) {
      gameEngine.reset();
      setGameState(gameEngine.getGameState());
    }
  };

  const handleViewAchievements = () => {
    setShowAchievements(true);
  };

  const resetAchievements = () => {
    if (gameEngine) {
      gameEngine.getEndingSystem().resetAchievements();
    }
  };

  if (!gameEngine) {
    return <div className="p-8 text-white">Loading ending system...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Ending System Demo</h1>
        
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Current Game State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Status</div>
              <div className={gameState?.isAlive ? 'text-green-400' : 'text-red-400'}>
                {gameState?.isAlive ? 'Alive' : 'Dead'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Time</div>
              <div>{gameState?.currentTime}</div>
            </div>
            <div>
              <div className="text-gray-400">Fear</div>
              <div>{gameState?.fearLevel?.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Health</div>
              <div>{gameState?.health?.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Trigger Endings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => triggerEnding('perfect_survivor')}
              className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-200"
            >
              <div className="font-semibold">Perfect Survivor</div>
              <div className="text-sm text-purple-200">Legendary Victory</div>
            </button>
            
            <button
              onClick={() => triggerEnding('brave_survivor')}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
            >
              <div className="font-semibold">Brave Survivor</div>
              <div className="text-sm text-blue-200">Rare Victory</div>
            </button>
            
            <button
              onClick={() => triggerEnding('basic_survivor')}
              className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200"
            >
              <div className="font-semibold">Basic Survivor</div>
              <div className="text-sm text-green-200">Common Victory</div>
            </button>
            
            <button
              onClick={() => triggerEnding('fear_death')}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
            >
              <div className="font-semibold">Fear Death</div>
              <div className="text-sm text-red-200">Common Death</div>
            </button>
            
            <button
              onClick={() => triggerEnding('health_death')}
              className="p-4 bg-red-700 hover:bg-red-800 rounded-lg transition-colors duration-200"
            >
              <div className="font-semibold">Health Death</div>
              <div className="text-sm text-red-200">Common Death</div>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Achievement System</h2>
          <div className="flex gap-4">
            <button
              onClick={handleViewAchievements}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors duration-200"
            >
              View All Achievements
            </button>
            
            <button
              onClick={resetAchievements}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Reset Achievements
            </button>
          </div>
        </div>

        <div className="text-center text-gray-400">
          <p>This demo shows the multiple endings system with achievement tracking.</p>
          <p>Try different endings to see how achievements are recorded and displayed.</p>
        </div>
      </div>

      {/* Ending Screen */}
      <EndingScreen
        endingResult={currentEnding}
        onRestart={handleRestart}
        onViewAchievements={handleViewAchievements}
        isVisible={!!currentEnding}
      />

      {/* Achievement Viewer */}
      <AchievementViewer
        endingSystem={gameEngine?.getEndingSystem()}
        isVisible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
    </div>
  );
};

export default EndingDemo;