/**
 * EventSystem Demo Component
 * Demonstrates the random event generation and management system
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import EventSystem from '../engine/EventSystem.js';
import { GameState } from '../engine/GameState.js';

const EventSystemDemo = () => {
  const [gameState] = useState(() => new GameState());
  const [eventSystem] = useState(() => new EventSystem(gameState, mockAudioManager, mockVoiceController));
  const [events, setEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef();

  // Mock audio manager
  const mockAudioManager = {
    playEffect: (soundKey) => {
      addLog(`🔊 Playing sound: ${soundKey}`);
    }
  };

  // Mock voice controller
  const mockVoiceController = {
    speak: (text) => {
      addLog(`🗣️ Narration: "${text}"`);
    }
  };

  const addLog = (message) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Start the game
    gameState.startGame();
    
    // Simulate time progression and event generation
    intervalRef.current = setInterval(() => {
      // Update event system
      eventSystem.update();
      
      // Update display
      setEvents([...eventSystem.getEventHistory()]);
      setActiveEvents([...eventSystem.getActiveEvents()]);
      
      // Advance time slightly for demo purposes
      const currentMinutes = gameState.currentTime.split(':').map(Number);
      const totalMinutes = currentMinutes[0] * 60 + currentMinutes[1] + 1;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      gameState.currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }, 2000); // Update every 2 seconds for demo

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [eventSystem, gameState]);

  const handleCommand = () => {
    if (!command.trim()) return;
    
    addLog(`👤 Player command: "${command}"`);
    
    // Try to handle command with active events
    const activeEventsList = eventSystem.getActiveEvents();
    let handled = false;
    
    for (const event of activeEventsList) {
      const response = eventSystem.evaluatePlayerResponse(command, event);
      if (response) {
        addLog(`✅ Command handled by event: ${event.id}`);
        handled = true;
        break;
      }
    }
    
    if (!handled) {
      addLog(`❌ Command not recognized or no active events`);
    }
    
    setCommand('');
    
    // Update displays
    setEvents([...eventSystem.getEventHistory()]);
    setActiveEvents([...eventSystem.getActiveEvents()]);
  };

  const generateEvent = () => {
    const event = eventSystem.generateRandomEvent();
    if (event) {
      eventSystem.processEvent(event);
      addLog(`🎲 Generated event: ${event.id}`);
    } else {
      addLog(`🎲 No eligible events at this time`);
    }
    
    setEvents([...eventSystem.getEventHistory()]);
    setActiveEvents([...eventSystem.getActiveEvents()]);
  };

  const adjustFear = (delta) => {
    gameState.updateFear(delta);
    addLog(`😰 Fear level: ${gameState.fearLevel}`);
  };

  const resetDemo = () => {
    eventSystem.clearEventHistory();
    gameState.fearLevel = 0;
    gameState.health = 100;
    gameState.currentTime = '23:00';
    setEvents([]);
    setActiveEvents([]);
    setLogs([]);
    addLog('🔄 Demo reset');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">EventSystem Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game State Panel */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Game State</h2>
          <div className="space-y-2">
            <div>Time: <span className="font-mono text-green-400">{gameState.currentTime}</span></div>
            <div>Fear Level: <span className="font-mono text-red-400">{gameState.fearLevel}/100</span></div>
            <div>Health: <span className="font-mono text-blue-400">{gameState.health}/100</span></div>
            <div>Alive: <span className="font-mono">{gameState.isAlive ? '✅' : '❌'}</span></div>
          </div>
          
          <div className="mt-4 space-x-2">
            <button 
              onClick={() => adjustFear(10)}
              className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
            >
              +10 Fear
            </button>
            <button 
              onClick={() => adjustFear(-10)}
              className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
            >
              -10 Fear
            </button>
            <button 
              onClick={generateEvent}
              className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700"
            >
              Generate Event
            </button>
            <button 
              onClick={resetDemo}
              className="px-3 py-1 bg-gray-600 rounded text-sm hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Command Input Panel */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Command Input</h2>
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="Enter command (hide, run, listen, etc.)"
              className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
            />
            <button 
              onClick={handleCommand}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Send
            </button>
          </div>
          
          <div className="text-sm text-gray-400">
            <p>Try commands like: hide, run, listen, answer, ignore, take</p>
          </div>
        </div>

        {/* Active Events Panel */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Active Events ({activeEvents.length})</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeEvents.length === 0 ? (
              <p className="text-gray-400 italic">No active events</p>
            ) : (
              activeEvents.map((event, index) => (
                <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                  <div className="font-semibold text-yellow-400">{event.id}</div>
                  <div className="text-xs text-gray-300">{event.type}</div>
                  {event.responses && (
                    <div className="text-xs text-blue-300 mt-1">
                      Accepts: {event.responses.map(r => r.command).join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event History Panel */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Event History ({events.length})</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-400 italic">No events triggered yet</p>
            ) : (
              events.slice(-5).map((event, index) => (
                <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                  <div className="font-semibold text-green-400">{event.id}</div>
                  <div className="text-xs text-gray-300">
                    {event.type} at {event.gameTime} (Fear: {event.fearLevelAtTrigger})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Log Panel */}
        <div className="bg-gray-800 p-4 rounded-lg lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="bg-black p-3 rounded font-mono text-sm max-h-60 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 italic">No activity yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-400">
        <p>This demo shows the EventSystem generating random events based on time and fear level.</p>
        <p>Events may require player responses within 15 seconds or will timeout.</p>
      </div>
    </div>
  );
};

export default EventSystemDemo;