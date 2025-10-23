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
    addItem,
    toggleItemActive,
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
    <div className="demo-panel p-4 h-full overflow-y-auto bg-gray-900">
      <h2 className="text-lg mb-4 text-green-400 font-bold border-b border-green-400 pb-2">Game Controls</h2>
      
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
      <div className="demo-section">
        <h3>Command Testing</h3>
        <div className="demo-controls">
          <button 
            onClick={() => handleCommand('hide')}
            className="demo-button border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Hide
          </button>
          <button 
            onClick={() => handleCommand('run')}
            className="demo-button border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Run
          </button>
          <button 
            onClick={() => handleCommand('listen')}
            className="demo-button border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Listen
          </button>
          <button 
            onClick={() => handleCommand('search')}
            className="demo-button border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Search
          </button>
          <button 
            onClick={() => handleCommand('use flashlight')}
            className="demo-button border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Use Flashlight
          </button>
          <button 
            onClick={() => handleCommand('invalid')}
            className="demo-button border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
            disabled={!isGameRunning}
          >
            Invalid Command
          </button>
        </div>
      </div>

      {/* Inventory Testing */}
      <div className="demo-section">
        <h3>Inventory Testing</h3>
        <div className="demo-controls">
          <button 
            onClick={() => addItem('flashlight')}
            className="demo-button border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            Add Flashlight
          </button>
          <button 
            onClick={() => addItem('key_basement')}
            className="demo-button border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            Add Key
          </button>
          <button 
            onClick={() => addItem('matches')}
            className="demo-button border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            Add Matches
          </button>
          <button 
            onClick={() => useItem('flashlight')}
            className="demo-button border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black"
            disabled={!gameState?.inventory?.some(item => item.id === 'flashlight')}
          >
            Use Flashlight
          </button>
          <button 
            onClick={() => toggleItemActive('flashlight')}
            className="demo-button border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black"
            disabled={!gameState?.inventory?.some(item => item.id === 'flashlight')}
          >
            Toggle Flashlight
          </button>
        </div>
        
        {/* Display Inventory */}
        {gameState?.inventory && gameState.inventory.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-1">Current Inventory:</h4>
            <div className="text-xs space-y-1">
              {gameState.inventory.map((item, index) => (
                <div key={index} className={`flex items-center gap-2 p-1 rounded ${
                  item.isActive ? 'bg-yellow-900 bg-opacity-30 border border-yellow-500' : 'bg-gray-800'
                }`}>
                  <span>{item.icon || '📦'}</span>
                  <span className="flex-1">{item.name}</span>
                  <span className="text-gray-400">({item.type})</span>
                  {item.durability !== undefined && (
                    <span className={`text-xs ${
                      item.durability > 50 ? 'text-green-400' : 
                      item.durability > 20 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {Math.round(item.durability)}%
                    </span>
                  )}
                  {item.isActive && (
                    <span className="text-yellow-400 animate-pulse">●</span>
                  )}
                </div>
              ))}
            </div>
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