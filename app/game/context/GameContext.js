/**
 * GameContext - React Context for global game state access
 * Provides game engine and state to all components in the application
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine.js';

// Create the context
const GameContext = createContext(null);

/**
 * Custom hook to use the game context
 * @returns {Object} Game context value with engine, state, and actions
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

/**
 * GameProvider component that wraps the application and provides game state
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const GameProvider = ({ children }) => {
  // Game engine instance (persistent across re-renders)
  const gameEngineRef = useRef(null);
  
  // Game state that triggers re-renders
  const [gameState, setGameState] = useState(null);
  const [isEngineReady, setIsEngineReady] = useState(false);

  // Initialize game engine
  useEffect(() => {
    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine();
      
      // Subscribe to game state updates
      const unsubscribe = gameEngineRef.current.onUpdate((deltaTime, currentGameState) => {
        // Update React state to trigger re-renders
        setGameState({ ...currentGameState.serialize() });
      });

      setIsEngineReady(true);
      console.log('GameEngine initialized and ready');

      // Cleanup on unmount
      return () => {
        unsubscribe();
        if (gameEngineRef.current) {
          gameEngineRef.current.stop();
        }
      };
    }
  }, []);

  // Initialize game state when engine is ready
  useEffect(() => {
    if (isEngineReady && gameEngineRef.current && !gameState) {
      setGameState({ ...gameEngineRef.current.getGameState().serialize() });
    }
  }, [isEngineReady, gameState]);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start();
    }
  }, []);

  /**
   * Stop the game
   */
  const stopGame = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.stop();
    }
  }, []);

  /**
   * Reset the game to initial state
   */
  const resetGame = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.reset();
      setGameState({ ...gameEngineRef.current.getGameState().serialize() });
    }
  }, []);

  /**
   * Handle player command
   * @param {string} command - Command to process
   */
  const handleCommand = useCallback((command) => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.handleCommand(command);
    }
    return false;
  }, []);

  /**
   * Register a command handler
   * @param {string} pattern - Command pattern to match
   * @param {Function} handler - Handler function
   */
  const registerCommandHandler = useCallback((pattern, handler) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.registerCommandHandler(pattern, handler);
    }
  }, []);

  /**
   * Unregister a command handler
   * @param {string} pattern - Command pattern to remove
   */
  const unregisterCommandHandler = useCallback((pattern) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.unregisterCommandHandler(pattern);
    }
  }, []);

  /**
   * Trigger a game event
   * @param {Object} eventData - Event data to process
   */
  const triggerEvent = useCallback((eventData) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.triggerEvent(eventData);
    }
  }, []);

  /**
   * Update fear level
   * @param {number} delta - Amount to change fear level
   */
  const updateFear = useCallback((delta) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.getGameState().updateFear(delta);
    }
  }, []);

  /**
   * Update health level
   * @param {number} delta - Amount to change health level
   */
  const updateHealth = useCallback((delta) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.getGameState().updateHealth(delta);
    }
  }, []);

  /**
   * Add item to inventory
   * @param {Object} item - Item to add
   */
  const addToInventory = useCallback((item) => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.getGameState().addToInventory(item);
    }
    return false;
  }, []);

  /**
   * Use item from inventory
   * @param {string} itemId - ID of item to use
   */
  const useItem = useCallback((itemId) => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.getGameState().useItem(itemId);
    }
    return false;
  }, []);

  /**
   * Set player location
   * @param {string} location - New location
   */
  const setLocation = useCallback((location) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.getGameState().setLocation(location);
    }
  }, []);

  /**
   * Subscribe to game updates
   * @param {Function} callback - Callback function to call on updates
   * @returns {Function} Unsubscribe function
   */
  const onGameUpdate = useCallback((callback) => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.onUpdate(callback);
    }
    return () => {}; // No-op unsubscribe
  }, []);

  // Context value
  const contextValue = {
    // Game state (read-only)
    gameState,
    isEngineReady,
    
    // Game engine reference (for advanced usage)
    gameEngine: gameEngineRef.current,
    
    // Game control actions
    startGame,
    stopGame,
    resetGame,
    
    // Command handling
    handleCommand,
    registerCommandHandler,
    unregisterCommandHandler,
    
    // Game events
    triggerEvent,
    
    // State mutations
    updateFear,
    updateHealth,
    addToInventory,
    useItem,
    setLocation,
    
    // Subscriptions
    onGameUpdate,
    
    // Computed properties
    isGameRunning: gameState?.gameStarted && gameState?.isAlive,
    canPerformActions: gameState?.isAlive && (gameState?.fearLevel || 0) < 90,
    gameProgress: gameState ? 
      Math.min(100, ((gameState.realTimeElapsed || 0) / (7 * 60 * 1000)) * 100) : 0,
    actionSuccessRate: gameState?.isAlive ? 
      Math.max(10, 100 - (gameState.fearLevel || 0) * 0.5) : 0
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

/**
 * Higher-order component to wrap components with game context
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component
 */
export const withGame = (Component) => {
  return function GameWrappedComponent(props) {
    return (
      <GameProvider>
        <Component {...props} />
      </GameProvider>
    );
  };
};

export default GameContext;