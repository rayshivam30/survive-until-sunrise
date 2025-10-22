/**
 * HealthSystem unit tests
 */

import { HealthSystem } from '../HealthSystem.js';
import { GameState } from '../GameState.js';

describe('HealthSystem', () => {
  let gameState;
  let healthSystem;

  beforeEach(() => {
    gameState = new GameState();
    healthSystem = new HealthSystem(gameState);
  });

  describe('Damage Application', () => {
    test('should apply instant damage correctly', () => {
      const initialHealth = gameState.health;
      
      healthSystem.applyDamage('physical', { amount: 20 });
      
      expect(gameState.health).toBe(initialHealth - 20);
    });

    test('should handle different damage types', () => {
      const damageTypes = ['physical', 'supernatural', 'fear_induced', 'exhaustion'];
      
      damageTypes.forEach(damageType => {
        const initialHealth = gameState.health;
        healthSystem.applyDamage(damageType, { amount: 10 });
        expect(gameState.health).toBeLessThan(initialHealth);
      });
    });

    test('should create damage over time events', () => {
      const initialHealth = gameState.health;
      
      healthSystem.applyDamage('supernatural', { 
        amount: 20, 
        duration: 1000 
      });
      
      // Should have some immediate effect
      expect(gameState.health).toBeLessThan(initialHealth);
      
      // Should create a damage event
      expect(healthSystem.damageEvents.size).toBe(1);
    });

    test('should calculate damage based on modifiers', () => {
      // Test location modifier
      gameState.location = 'safe_room';
      const safeRoomHealth = gameState.health;
      healthSystem.applyDamage('physical', { amount: 20 });
      const safeRoomDamage = safeRoomHealth - gameState.health;
      
      // Reset and test dangerous location
      gameState.health = 100;
      gameState.location = 'basement';
      const basementHealth = gameState.health;
      healthSystem.applyDamage('physical', { amount: 20 });
      const basementDamage = basementHealth - gameState.health;
      
      expect(basementDamage).toBeGreaterThan(safeRoomDamage);
    });
  });

  describe('Health State Management', () => {
    test('should update health state based on health level', () => {
      expect(healthSystem.currentHealthState).toBe('excellent');
      
      gameState.health = 60;
      healthSystem.updateHealthState();
      expect(healthSystem.currentHealthState).toBe('injured');
      
      gameState.health = 25;
      healthSystem.updateHealthState();
      expect(healthSystem.currentHealthState).toBe('wounded');
      
      gameState.health = 5;
      healthSystem.updateHealthState();
      expect(healthSystem.currentHealthState).toBe('critical');
    });

    test('should notify callbacks on health state changes', () => {
      const callback = jest.fn();
      healthSystem.onHealthChange(callback);
      
      gameState.health = 40;
      healthSystem.updateHealthState();
      
      expect(callback).toHaveBeenCalledWith(
        'state',
        expect.objectContaining({
          current: 'wounded',
          healthLevel: 40
        }),
        40,
        'wounded'
      );
    });
  });

  describe('Health Regeneration', () => {
    test('should enable regeneration after delay when not taking damage', () => {
      gameState.health = 50;
      healthSystem.lastDamageTime = Date.now() - 11000; // 11 seconds ago
      
      healthSystem.update(1000); // 1 second update
      
      expect(healthSystem.isRegenerating).toBe(true);
    });

    test('should not regenerate immediately after taking damage', () => {
      gameState.health = 50;
      healthSystem.applyDamage('physical', { amount: 10 });
      
      const healthAfterDamage = gameState.health;
      healthSystem.update(1000); // 1 second update
      
      // Should not regenerate yet
      expect(gameState.health).toBe(healthAfterDamage);
    });

    test('should apply fear-based regeneration penalty', () => {
      gameState.health = 50;
      gameState.fearLevel = 80; // High fear
      healthSystem.lastDamageTime = Date.now() - 11000; // Allow regen
      
      const highFearRegen = healthSystem.getFearRegenPenalty();
      
      gameState.fearLevel = 10; // Low fear
      const lowFearRegen = healthSystem.getFearRegenPenalty();
      
      expect(lowFearRegen).toBeGreaterThan(highFearRegen);
    });
  });

  describe('Healing', () => {
    test('should heal player correctly', () => {
      gameState.health = 50;
      const initialHealth = gameState.health;
      
      healthSystem.heal(20, 'test_healing');
      
      expect(gameState.health).toBe(initialHealth + 20);
    });

    test('should not heal above maximum health', () => {
      gameState.health = 95;
      
      healthSystem.heal(20, 'test_healing');
      
      expect(gameState.health).toBe(100);
    });

    test('should notify callbacks on healing', () => {
      const callback = jest.fn();
      healthSystem.onHealthChange(callback);
      
      gameState.health = 50;
      healthSystem.heal(20, 'test_source');
      
      expect(callback).toHaveBeenCalledWith(
        'heal',
        expect.objectContaining({
          amount: 20,
          source: 'test_source'
        }),
        70,
        expect.any(String)
      );
    });
  });

  describe('Health Modifiers', () => {
    test('should add and remove health modifiers', () => {
      healthSystem.addHealthModifier('test_modifier', 'damage_resistance', 0.5, 1000);
      expect(healthSystem.healthModifiers.has('test_modifier')).toBe(true);
      
      healthSystem.removeHealthModifier('test_modifier');
      expect(healthSystem.healthModifiers.has('test_modifier')).toBe(false);
    });

    test('should store health modifiers with duration info', () => {
      healthSystem.addHealthModifier('temp_modifier', 'regen_boost', 2.0, 100);
      expect(healthSystem.healthModifiers.has('temp_modifier')).toBe(true);
      
      const modifier = healthSystem.healthModifiers.get('temp_modifier');
      expect(modifier.type).toBe('regen_boost');
      expect(modifier.multiplier).toBe(2.0);
      expect(modifier.duration).toBe(100);
    });
  });

  describe('Damage Over Time Processing', () => {
    test('should process multiple damage over time effects', () => {
      const initialHealth = gameState.health;
      
      healthSystem.applyDamage('supernatural', { amount: 10, duration: 2000 });
      healthSystem.applyDamage('psychological', { amount: 15, duration: 3000 });
      
      expect(healthSystem.damageEvents.size).toBe(2);
      expect(gameState.health).toBeLessThan(initialHealth);
    });

    test('should track damage events with expiration info', () => {
      healthSystem.applyDamage('exhaustion', { amount: 10, duration: 100 });
      expect(healthSystem.damageEvents.size).toBe(1);
      
      const damageEvent = Array.from(healthSystem.damageEvents.values())[0];
      expect(damageEvent.duration).toBe(100);
      expect(damageEvent.totalDamage).toBe(7.5); // 75% of original damage (25% applied immediately)
    });
  });

  describe('Survival Checks', () => {
    test('should check if player can survive damage', () => {
      gameState.health = 50;
      
      expect(healthSystem.canSurviveDamage(30)).toBe(true);
      expect(healthSystem.canSurviveDamage(60)).toBe(false);
    });

    test('should trigger death when health reaches zero', () => {
      gameState.health = 10;
      
      healthSystem.applyDamage('physical', { amount: 15 });
      
      expect(gameState.isAlive).toBe(false);
    });
  });

  describe('Integration with GameState', () => {
    test('should update gameState fear resistance based on health', () => {
      gameState.health = 30; // Wounded state
      healthSystem.update(100);
      
      expect(gameState.currentFearResistance).toBeDefined();
      expect(gameState.currentFearResistance).toBeLessThan(1.0);
    });

    test('should apply movement penalties for low health', () => {
      gameState.health = 25; // Low health
      healthSystem.update(100);
      
      expect(gameState.movementPenalty).toBeDefined();
      expect(gameState.movementPenalty).toBeLessThan(1.0);
    });
  });

  describe('System State Information', () => {
    test('should provide current health state information', () => {
      gameState.health = 60;
      healthSystem.updateHealthState();
      
      const healthState = healthSystem.getHealthState();
      
      expect(healthState).toEqual({
        level: 60,
        state: 'injured',
        isRegenerating: expect.any(Boolean),
        activeDamageEvents: expect.any(Number),
        regenRate: expect.any(Number),
        fearResistance: expect.any(Number)
      });
    });

    test('should calculate time until regeneration', () => {
      healthSystem.lastDamageTime = Date.now() - 5000; // 5 seconds ago
      const timeUntilRegen = healthSystem.getTimeUntilRegen();
      
      expect(timeUntilRegen).toBeGreaterThan(0);
      expect(timeUntilRegen).toBeLessThanOrEqual(healthSystem.regenDelay);
    });
  });

  describe('System Reset', () => {
    test('should reset to initial state', () => {
      healthSystem.applyDamage('physical', { amount: 20, duration: 5000 });
      healthSystem.addHealthModifier('test', 'damage_resistance', 0.5, 5000);
      gameState.health = 30;
      healthSystem.updateHealthState();
      
      healthSystem.reset();
      
      expect(healthSystem.damageEvents.size).toBe(0);
      expect(healthSystem.healthModifiers.size).toBe(0);
      expect(healthSystem.currentHealthState).toBe('excellent');
      expect(healthSystem.isRegenerating).toBe(false);
    });
  });
});