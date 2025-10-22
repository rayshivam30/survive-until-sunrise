/**
 * GameState Tests
 * Unit tests for game state management
 */

import { GameState } from '../GameState.js';

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  test('should initialize with correct default values', () => {
    expect(gameState.currentTime).toBe('23:00');
    expect(gameState.fearLevel).toBe(0);
    expect(gameState.health).toBe(100);
    expect(gameState.isAlive).toBe(true);
    expect(gameState.gameStarted).toBe(false);
    expect(gameState.inventory).toEqual([]);
  });

  test('should start game correctly', () => {
    gameState.startGame();
    expect(gameState.gameStarted).toBe(true);
    expect(gameState.gameStartTime).toBeTruthy();
  });

  test('should update fear level within bounds', () => {
    gameState.updateFear(50);
    expect(gameState.fearLevel).toBe(50);

    gameState.updateFear(60); // Should cap at 100
    expect(gameState.fearLevel).toBe(100);

    gameState.updateFear(-150); // Should floor at 0
    expect(gameState.fearLevel).toBe(0);
  });

  test('should update health level within bounds', () => {
    gameState.updateHealth(-30);
    expect(gameState.health).toBe(70);

    gameState.updateHealth(50); // Should cap at 100
    expect(gameState.health).toBe(100);

    gameState.updateHealth(-150); // Should trigger death
    expect(gameState.health).toBe(0);
    expect(gameState.isAlive).toBe(false);
  });

  test('should manage inventory correctly', () => {
    const item = {
      id: 'flashlight',
      name: 'Flashlight',
      type: 'tool',
      durability: 100
    };

    // Add item
    const added = gameState.addToInventory(item);
    expect(added).toBe(true);
    expect(gameState.inventory).toHaveLength(1);
    expect(gameState.inventory[0].name).toBe('Flashlight');

    // Try to add same item again
    const addedAgain = gameState.addToInventory(item);
    expect(addedAgain).toBe(false);
    expect(gameState.inventory).toHaveLength(1);

    // Use item
    const used = gameState.useItem('flashlight');
    expect(used).toBe(true);
    expect(gameState.inventory[0].durability).toBe(90);

    // Remove item
    const removed = gameState.removeFromInventory('flashlight');
    expect(removed).toBeTruthy();
    expect(gameState.inventory).toHaveLength(0);
  });

  test('should track commands and events', () => {
    gameState.addCommand('hide');
    gameState.addEvent('scary-noise');

    expect(gameState.commandsIssued).toHaveLength(1);
    expect(gameState.commandsIssued[0].command).toBe('hide');
    expect(gameState.eventsTriggered).toHaveLength(1);
    expect(gameState.eventsTriggered[0].eventId).toBe('scary-noise');
  });

  test('should calculate action success rate based on fear', () => {
    expect(gameState.getActionSuccessRate()).toBe(100);

    gameState.updateFear(50);
    expect(gameState.getActionSuccessRate()).toBe(75); // 100 - (50 * 0.5)

    gameState.updateFear(50); // Total 100 fear
    expect(gameState.getActionSuccessRate()).toBe(50); // 100 - (100 * 0.5)
  });

  test('should serialize and deserialize correctly', () => {
    gameState.startGame();
    gameState.updateFear(25);
    gameState.updateHealth(-10);
    gameState.addCommand('test');

    const serialized = gameState.serialize();
    const newGameState = new GameState();
    newGameState.deserialize(serialized);

    expect(newGameState.fearLevel).toBe(25);
    expect(newGameState.health).toBe(90);
    expect(newGameState.gameStarted).toBe(true);
    expect(newGameState.commandsIssued).toHaveLength(1);
  });
});