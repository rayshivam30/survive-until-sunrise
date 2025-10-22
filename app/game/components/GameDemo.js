/**
 * GameDemo - Simple demo component to test game engine integration
 */

"use client";

import React from 'react';
import { useGame } from '../context/GameContext';

export default function GameDemo() {
  const {
    gameState,
    isEngineReady,
    startGame,
    stopGame,
    resetGame,
    handleCommand,
    updateFear,
    updateHealth,
    addToInventory,
    useItem,
    isGameRunning,
    canPerformActions,
    gameProgress,
    actionSuccessRate
  } = useGame();

  if (!isEngineReady) {
    return (
      <div className="p-4 bg-gray-800 text-white">
        <h2 className="text-xl mb-4">Game Engine Demo</h2>
        <p>Initializing game engine...</p>
      </div>
    );
  }

  return (
    <div className="demo-panel p-4 h-full overflow-y-auto">
      <h2 className="text-xl mb-4 terminal-text">Game Engine Demo</h2>
      
      {/* Game Status */}
      <div className="demo-section">
        <h3>Game Status</h3>
        <div className="demo-grid">
          <div>Time: {gameState?.currentTime || 'N/A'}</div>
          <div>Running: {isGameRunning ? 'Yes' : 'No'}</div>
          <div>Fear: {Math.round(gameState?.fearLevel || 0)}%</div>
          <div>Health: {Math.round(gameState?.health || 0)}%</div>
          <div>Alive: {gameState?.isAlive ? 'Yes' : 'No'}</div>
          <div>Progress: {Math.round(gameProgress)}%</div>
          <div>Can Act: {canPerformActions ? 'Yes' : 'No'}</div>
          <div>Success Rate: {Math.round(actionSuccessRate)}%</div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="demo-section">
        <h3>Game Controls</h3>
        <div className="demo-controls">
          <button 
            onClick={startGame}
            className="demo-button border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
            disabled={isGameRunning}
          >
            Start Game
          </button>
          <button 
            onClick={stopGame}
            className="demo-button border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Stop Game
          </button>
          <button 
            onClick={resetGame}
            className="demo-button border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black"
          >
            Reset Game
          </button>
        </div>
      </div>

      {/* State Manipulation */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <h3 className="font-bold mb-2">State Manipulation</h3>
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => updateFear(10)}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            +10 Fear
          </button>
          <button 
            onClick={() => updateFear(-10)}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            -10 Fear
          </button>
          <button 
            onClick={() => updateHealth(-10)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            -10 Health
          </button>
          <button 
            onClick={() => updateHealth(10)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            +10 Health
          </button>
        </div>
      </div>

      {/* Command Testing */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <h3 className="font-bold mb-2">Command Testing</h3>
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => handleCommand('hide')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            Command: Hide
          </button>
          <button 
            onClick={() => handleCommand('run')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            Command: Run
          </button>
          <button 
            onClick={() => handleCommand('unknown command')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            disabled={!isGameRunning}
          >
            Unknown Command
          </button>
        </div>
      </div>

      {/* Inventory Testing */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <h3 className="font-bold mb-2">Inventory Testing</h3>
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => addToInventory({ 
              id: 'flashlight', 
              name: 'Flashlight', 
              type: 'tool', 
              durability: 100 
            })}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          >
            Add Flashlight
          </button>
          <button 
            onClick={() => addToInventory({ 
              id: 'key', 
              name: 'Rusty Key', 
              type: 'key' 
            })}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          >
            Add Key
          </button>
          <button 
            onClick={() => useItem('flashlight')}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          >
            Use Flashlight
          </button>
        </div>
        
        {/* Display Inventory */}
        {gameState?.inventory && gameState.inventory.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold">Current Inventory:</h4>
            <ul className="text-xs">
              {gameState.inventory.map((item, index) => (
                <li key={index}>
                  {item.name} ({item.type})
                  {item.durability !== undefined && ` - ${item.durability}% durability`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Command History */}
      {gameState?.commandsIssued && gameState.commandsIssued.length > 0 && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <h3 className="font-bold mb-2">Recent Commands</h3>
          <div className="text-xs max-h-20 overflow-y-auto">
            {gameState.commandsIssued.slice(-5).map((cmd, index) => (
              <div key={index}>
                [{cmd.timestamp}] {cmd.command}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}