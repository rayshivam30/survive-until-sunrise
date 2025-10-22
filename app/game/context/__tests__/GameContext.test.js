/**
 * GameContext Integration Tests
 * Tests for React Context integration with game engine
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../GameContext';

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

// Test component that uses the game context
function TestComponent() {
  const { 
    gameState, 
    isEngineReady, 
    startGame, 
    handleCommand,
    updateFear,
    addToInventory 
  } = useGame();

  React.useEffect(() => {
    if (isEngineReady) {
      startGame();
    }
  }, [isEngineReady, startGame]);

  if (!isEngineReady || !gameState) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="time">{gameState.currentTime}</div>
      <div data-testid="fear">{gameState.fearLevel}</div>
      <div data-testid="health">{gameState.health}</div>
      <div data-testid="alive">{gameState.isAlive ? 'alive' : 'dead'}</div>
      <button 
        data-testid="fear-button" 
        onClick={() => updateFear(10)}
      >
        Increase Fear
      </button>
      <button 
        data-testid="command-button" 
        onClick={() => handleCommand('test command')}
      >
        Send Command
      </button>
      <button 
        data-testid="item-button" 
        onClick={() => addToInventory({ id: 'test', name: 'Test Item' })}
      >
        Add Item
      </button>
    </div>
  );
}

describe('GameContext', () => {
  test('should provide game state to components', async () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // Wait for engine to initialize
    await waitFor(() => {
      expect(getByTestId('time')).toHaveTextContent('23:00');
    });

    expect(getByTestId('fear')).toHaveTextContent('0');
    expect(getByTestId('health')).toHaveTextContent('100');
    expect(getByTestId('alive')).toHaveTextContent('alive');
  });

  test('should handle fear updates through context', async () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(getByTestId('time')).toHaveTextContent('23:00');
    });

    // Click fear button
    act(() => {
      getByTestId('fear-button').click();
    });

    await waitFor(() => {
      expect(getByTestId('fear')).toHaveTextContent('10');
    });
  });

  test('should handle commands through context', async () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(getByTestId('time')).toHaveTextContent('23:00');
    });

    // Send command
    act(() => {
      getByTestId('command-button').click();
    });

    // Command should be processed (we can't easily test the internal state here,
    // but we can verify no errors occurred)
    expect(getByTestId('alive')).toHaveTextContent('alive');
  });

  test('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useGame must be used within a GameProvider');

    console.error = originalError;
  });
});