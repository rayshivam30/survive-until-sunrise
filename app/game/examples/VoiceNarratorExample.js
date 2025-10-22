"use client";

import React, { useState, useEffect } from 'react';
import { useVoiceNarrator } from '../utils/useVoiceNarrator.js';
import VoiceController from '../components/VoiceController.js';

/**
 * Example component demonstrating VoiceNarrator integration
 * 
 * Shows how to integrate voice narration with voice commands and game state
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export default function VoiceNarratorExample() {
  // Game state
  const [gameState, setGameState] = useState({
    currentTime: '23:00',
    fearLevel: 30,
    health: 100,
    inventory: ['flashlight'],
    location: 'starting_room',
    isAlive: true,
    gameStarted: false
  });

  const [gameEvents, setGameEvents] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);

  // Voice narrator hook
  const {
    isNarrating,
    isSupported,
    queueLength,
    lastError,
    narrate,
    provideCommandFeedback,
    narrateEvent,
    narrateFearLevel,
    narrateTimeUpdate,
    narrateGameStart,
    narrateGameEnd,
    narrateError,
    stopNarration,
    clearQueue,
    testVoice
  } = useVoiceNarrator({
    onNarrationStart: (item) => {
      console.log('Narration started:', item.text);
      addGameEvent(`🎙️ Narrating: ${item.text.substring(0, 50)}...`);
    },
    onNarrationEnd: (item) => {
      console.log('Narration ended:', item.text);
    },
    onNarrationError: (error, item) => {
      console.error('Narration error:', error);
      addGameEvent(`❌ Narration error: ${error.message}`);
    }
  });

  // Add game event to log
  const addGameEvent = (event) => {
    setGameEvents(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${event}`]);
  };

  // Handle voice commands
  const handleVoiceCommand = (parsedCommand) => {
    console.log('Voice command received:', parsedCommand);
    
    // Add to command history
    setCommandHistory(prev => [...prev.slice(-4), parsedCommand]);
    
    // Simulate command processing
    const success = Math.random() > 0.3; // 70% success rate for demo
    
    // Update game state based on command
    if (success) {
      updateGameStateForCommand(parsedCommand);
      addGameEvent(`✅ Command executed: ${parsedCommand.action}`);
    } else {
      addGameEvent(`❌ Command failed: ${parsedCommand.action}`);
    }
    
    // Provide voice feedback
    provideCommandFeedback(parsedCommand, success, gameState);
  };

  // Handle voice recognition errors
  const handleVoiceError = (error) => {
    console.log('Voice error:', error);
    addGameEvent(`🎤 Voice error: ${error.message}`);
    
    // Provide error narration
    if (error.type === 'command-not-recognized') {
      narrateError('commandNotRecognized', error.message);
    } else if (error.type === 'audio-capture' || error.type === 'permission-denied') {
      narrateError('microphoneError', error.message);
    }
  };

  // Update game state based on successful commands
  const updateGameStateForCommand = (command) => {
    setGameState(prev => {
      const newState = { ...prev };
      
      switch (command.action) {
        case 'hide':
          newState.fearLevel = Math.max(0, prev.fearLevel - 10);
          break;
        case 'run':
          newState.fearLevel = Math.min(100, prev.fearLevel + 15);
          newState.location = 'new_location';
          break;
        case 'flashlight':
          newState.fearLevel = Math.max(0, prev.fearLevel - 20);
          break;
        case 'listen':
          // Might trigger random events
          if (Math.random() > 0.7) {
            setTimeout(() => triggerRandomEvent(), 1000);
          }
          break;
      }
      
      return newState;
    });
  };

  // Trigger random game events
  const triggerRandomEvent = () => {
    const events = ['footsteps', 'whispers', 'doorSlam', 'breathing'];
    const eventType = events[Math.floor(Math.random() * events.length)];
    const urgent = Math.random() > 0.6;
    
    addGameEvent(`👻 Event: ${eventType} ${urgent ? '(URGENT)' : ''}`);
    narrateEvent(eventType, { urgent }, gameState);
    
    // Increase fear level for events
    setGameState(prev => ({
      ...prev,
      fearLevel: Math.min(100, prev.fearLevel + (urgent ? 25 : 15))
    }));
  };

  // Start the game
  const startGame = () => {
    setGameState(prev => ({ ...prev, gameStarted: true }));
    narrateGameStart();
    addGameEvent('🎮 Game started');
  };

  // End the game
  const endGame = (victory = false) => {
    setGameState(prev => ({ ...prev, isAlive: victory, gameStarted: false }));
    narrateGameEnd(victory);
    addGameEvent(`🏁 Game ended: ${victory ? 'Victory!' : 'Defeat'}`);
  };

  // Simulate time progression
  const advanceTime = () => {
    const times = ['23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'];
    const currentIndex = times.indexOf(gameState.currentTime);
    
    if (currentIndex < times.length - 1) {
      const newTime = times[currentIndex + 1];
      setGameState(prev => ({ ...prev, currentTime: newTime }));
      narrateTimeUpdate(newTime, gameState);
      addGameEvent(`⏰ Time: ${newTime}`);
      
      // Check for victory at 6 AM
      if (newTime === '06:00') {
        setTimeout(() => endGame(true), 2000);
      }
    }
  };

  // Monitor fear level changes for narration
  useEffect(() => {
    const previousFear = gameState.fearLevel;
    
    // Simulate fear level narration (would normally track previous value)
    if (gameState.gameStarted && Math.abs(previousFear - gameState.fearLevel) >= 20) {
      narrateFearLevel(gameState.fearLevel, previousFear);
    }
  }, [gameState.fearLevel, gameState.gameStarted, narrateFearLevel]);

  // Render component
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 text-green-300 font-mono">
      <h1 className="text-3xl mb-6 text-center">Voice Narrator Integration Demo</h1>
      
      {/* Voice Support Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Voice System Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-400">Narration Supported:</span>
            <span className={`ml-2 ${isSupported ? 'text-green-400' : 'text-red-400'}`}>
              {isSupported ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Currently Narrating:</span>
            <span className={`ml-2 ${isNarrating ? 'text-yellow-400' : 'text-gray-500'}`}>
              {isNarrating ? '🎙️ Speaking' : '🔇 Silent'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Queue Length:</span>
            <span className="ml-2 text-blue-400">{queueLength}</span>
          </div>
          <div>
            <span className="text-gray-400">Last Error:</span>
            <span className={`ml-2 ${lastError ? 'text-red-400' : 'text-gray-500'}`}>
              {lastError ? lastError.message : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Game State */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Game State</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400">Time:</span>
            <span className="ml-2 text-yellow-400">{gameState.currentTime}</span>
          </div>
          <div>
            <span className="text-gray-400">Fear Level:</span>
            <span className={`ml-2 ${
              gameState.fearLevel >= 70 ? 'text-red-400' : 
              gameState.fearLevel >= 40 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {gameState.fearLevel}%
            </span>
          </div>
          <div>
            <span className="text-gray-400">Location:</span>
            <span className="ml-2 text-blue-400">{gameState.location}</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={startGame}
          disabled={gameState.gameStarted}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
        >
          Start Game
        </button>
        <button
          onClick={() => endGame(false)}
          disabled={!gameState.gameStarted}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded"
        >
          End Game (Defeat)
        </button>
        <button
          onClick={advanceTime}
          disabled={!gameState.gameStarted || gameState.currentTime === '06:00'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
        >
          Advance Time
        </button>
        <button
          onClick={triggerRandomEvent}
          disabled={!gameState.gameStarted}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
        >
          Trigger Event
        </button>
        <button
          onClick={testVoice}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
        >
          Test Voice
        </button>
        <button
          onClick={stopNarration}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
        >
          Stop Narration
        </button>
        <button
          onClick={clearQueue}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
        >
          Clear Queue
        </button>
      </div>

      {/* Manual Narration */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Manual Narration</h2>
        <div className="flex gap-2">
          <button
            onClick={() => narrate('This is a test narration with normal priority.')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Normal Priority
          </button>
          <button
            onClick={() => narrate('This is urgent!', { priority: 'high', interrupt: true })}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            High Priority
          </button>
          <button
            onClick={() => narrate('Whispered message...', { 
              voiceSettings: { rate: 0.6, pitch: 0.8, volume: 0.7 } 
            })}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
          >
            Whisper
          </button>
        </div>
      </div>

      {/* Voice Controller Integration */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Voice Commands</h2>
        <p className="text-gray-400 mb-2">
          Say: "hide", "run", "open door", "flashlight", "listen"
        </p>
        <VoiceController
          onCommand={handleVoiceCommand}
          onError={handleVoiceError}
          gameContext={gameState}
          isEnabled={gameState.gameStarted}
        />
      </div>

      {/* Command History */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Recent Commands</h2>
        <div className="space-y-1">
          {commandHistory.length === 0 ? (
            <p className="text-gray-500">No commands yet</p>
          ) : (
            commandHistory.map((cmd, index) => (
              <div key={index} className="text-sm">
                <span className="text-blue-400">{cmd.action}</span>
                {cmd.target && <span className="text-yellow-400"> → {cmd.target}</span>}
                <span className="text-gray-500"> (confidence: {(cmd.confidence * 100).toFixed(0)}%)</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Game Events Log */}
      <div className="p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Game Events</h2>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {gameEvents.length === 0 ? (
            <p className="text-gray-500">No events yet</p>
          ) : (
            gameEvents.map((event, index) => (
              <div key={index} className="text-sm text-gray-300">
                {event}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-900 rounded">
        <h3 className="text-lg mb-2">How to Use</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Start Game" to begin</li>
          <li>Use voice commands or buttons to interact</li>
          <li>Listen to the voice narration responses</li>
          <li>Watch how fear level affects voice tone</li>
          <li>Advance time to hear time-based narration</li>
          <li>Trigger events to hear event narration</li>
        </ol>
      </div>
    </div>
  );
}