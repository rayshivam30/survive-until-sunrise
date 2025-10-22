/**
 * FearSystem unit tests
 */

import { FearSystem } from '../FearSystem.js';
import { GameState } from '../GameState.js';

describe('FearSystem', () => {
  let gameState;
  let fearSystem;

  beforeEach(() => {
    gameState = new GameState();
    fearSystem = new FearSystem(gameState);
  });

  describe('Fear Event Triggering', () => {
    test('should trigger fear events and increase fear level', () => {
      const initialFear = gameState.fearLevel;
      
      fearSystem.triggerFearEvent('jump_scare', { intensity: 1.0 });
      
      expect(gameState.fearLevel).toBeGreaterThan(initialFear);
    });

    test('should handle different fear event types', () => {
      const eventTypes = ['ambient', 'jump_scare', 'whisper', 'footsteps'];
      
      eventTypes.forEach(eventType => {
        const initialFear = gameState.fearLevel;
        fearSystem.triggerFearEvent(eventType, { intensity: 0.5 });
        expect(gameState.fearLevel).toBeGreaterThan(initialFear);
      });
    });

    test('should apply intensity modifiers correctly', () => {
      const lowIntensityFear = gameState.fearLevel;
      fearSystem.triggerFearEvent('ambient', { intensity: 0.5 });
      const afterLowIntensity = gameState.fearLevel;
      
      gameState.fearLevel = 0; // Reset
      fearSystem.triggerFearEvent('ambient', { intensity: 2.0 });
      const afterHighIntensity = gameState.fearLevel;
      
      expect(afterHighIntensity).toBeGreaterThan(afterLowIntensity);
    });
  });

  describe('Fear State Management', () => {
    test('should update fear state based on fear level', () => {
      expect(fearSystem.currentFearState).toBe('calm');
      
      gameState.fearLevel = 25;
      fearSystem.updateFearState();
      expect(fearSystem.currentFearState).toBe('nervous');
      
      gameState.fearLevel = 65;
      fearSystem.updateFearState();
      expect(fearSystem.currentFearState).toBe('terrified');
      
      gameState.fearLevel = 95;
      fearSystem.updateFearState();
      expect(fearSystem.currentFearState).toBe('overwhelmed');
    });

    test('should notify callbacks on fear state changes', () => {
      const callback = jest.fn();
      fearSystem.onFearChange(callback);
      
      gameState.fearLevel = 50;
      fearSystem.updateFearState();
      
      expect(callback).toHaveBeenCalledWith(
        'state',
        expect.objectContaining({
          current: 'scared',
          fearLevel: 50
        }),
        50,
        'scared'
      );
    });
  });

  describe('Action Success Rate Calculation', () => {
    test('should calculate action success rate based on fear level', () => {
      gameState.fearLevel = 0;
      const calmRate = fearSystem.getActionSuccessRate();
      expect(calmRate).toBeGreaterThan(90);
      
      gameState.fearLevel = 50;
      const scaredRate = fearSystem.getActionSuccessRate();
      expect(scaredRate).toBeLessThan(calmRate);
      
      gameState.fearLevel = 100;
      const panickedRate = fearSystem.getActionSuccessRate();
      expect(panickedRate).toBeLessThan(scaredRate);
      expect(panickedRate).toBeGreaterThanOrEqual(5); // Minimum success rate
    });

    test('should apply fear state modifiers to success rate', () => {
      gameState.fearLevel = 85; // Panicked state
      fearSystem.updateFearState();
      const panickedRate = fearSystem.getActionSuccessRate();
      
      gameState.fearLevel = 5; // Calm state
      fearSystem.updateFearState();
      const calmRate = fearSystem.getActionSuccessRate();
      
      expect(calmRate).toBeGreaterThan(panickedRate);
    });
  });

  describe('Fear Decay', () => {
    test('should apply fear decay over time when no events are active', () => {
      gameState.fearLevel = 50;
      const initialFear = gameState.fearLevel;
      
      // Simulate time passing with no active events
      fearSystem.update(5000); // 5 seconds
      
      expect(gameState.fearLevel).toBeLessThan(initialFear);
    });

    test('should not decay fear when events are active', () => {
      gameState.fearLevel = 50;
      fearSystem.triggerFearEvent('darkness', { duration: 10000 }); // Long duration event
      
      const fearAfterEvent = gameState.fearLevel;
      fearSystem.update(1000); // 1 second
      
      // Fear should not decay significantly due to active event
      expect(gameState.fearLevel).toBeGreaterThanOrEqual(fearAfterEvent - 1);
    });
  });

  describe('Environmental Modifiers', () => {
    test('should apply location-based fear modifiers', () => {
      gameState.location = 'basement';
      const basementModifier = fearSystem.getLocationFearModifier();
      
      gameState.location = 'safe_room';
      const safeRoomModifier = fearSystem.getLocationFearModifier();
      
      expect(basementModifier).toBeGreaterThan(safeRoomModifier);
    });

    test('should apply time-based fear modifiers', () => {
      gameState.currentTime = '03:00'; // Witching hour
      const witchingHourModifier = fearSystem.getTimeFearModifier();
      
      gameState.currentTime = '05:30'; // Dawn approaches
      const dawnModifier = fearSystem.getTimeFearModifier();
      
      expect(witchingHourModifier).toBeGreaterThan(dawnModifier);
    });

    test('should apply health-based fear modifiers', () => {
      gameState.health = 100;
      const healthyModifier = fearSystem.getHealthFearModifier();
      
      gameState.health = 20;
      const injuredModifier = fearSystem.getHealthFearModifier();
      
      expect(injuredModifier).toBeGreaterThan(healthyModifier);
    });
  });

  describe('Fear Modifiers', () => {
    test('should add and remove temporary fear modifiers', () => {
      fearSystem.addFearModifier('test_modifier', 0.5, 1000);
      expect(fearSystem.fearModifiers.has('test_modifier')).toBe(true);
      
      fearSystem.removeFearModifier('test_modifier');
      expect(fearSystem.fearModifiers.has('test_modifier')).toBe(false);
    });

    test('should store fear modifiers with duration info', () => {
      fearSystem.addFearModifier('temp_modifier', 0.5, 100);
      expect(fearSystem.fearModifiers.has('temp_modifier')).toBe(true);
      
      const modifier = fearSystem.fearModifiers.get('temp_modifier');
      expect(modifier.multiplier).toBe(0.5);
      expect(modifier.duration).toBe(100);
    });
  });

  describe('System Reset', () => {
    test('should reset to initial state', () => {
      fearSystem.triggerFearEvent('jump_scare');
      fearSystem.addFearModifier('test', 1.0, 5000);
      gameState.fearLevel = 75;
      fearSystem.updateFearState();
      
      fearSystem.reset();
      
      expect(fearSystem.fearEvents.size).toBe(0);
      expect(fearSystem.fearModifiers.size).toBe(0);
      expect(fearSystem.currentFearState).toBe('calm');
    });
  });

  describe('Integration with GameState', () => {
    test('should update gameState action success rate', () => {
      gameState.fearLevel = 60;
      fearSystem.update(100);
      
      expect(gameState.currentActionSuccessRate).toBeDefined();
      expect(gameState.currentActionSuccessRate).toBeLessThan(95);
    });

    test('should respect canPerformActions based on fear level', () => {
      gameState.fearLevel = 95;
      expect(gameState.canPerformActions()).toBe(false);
      
      gameState.fearLevel = 50;
      expect(gameState.canPerformActions()).toBe(true);
    });
  });
});