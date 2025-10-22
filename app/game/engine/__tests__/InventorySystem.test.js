/**
 * InventorySystem Tests
 * Tests for inventory management, item usage, durability tracking, and voice commands
 */

import { InventorySystem } from '../InventorySystem.js';
import { GameState } from '../GameState.js';

// Mock dependencies
const mockAudioManager = {
  playEffect: jest.fn(),
  playAmbient: jest.fn(),
  stopAmbient: jest.fn()
};

const mockVoiceNarrator = {
  speak: jest.fn()
};

describe('InventorySystem', () => {
  let inventorySystem;
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    inventorySystem = new InventorySystem(gameState, mockAudioManager, mockVoiceNarrator);
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('Item Management', () => {
    test('should add items to inventory with full properties', () => {
      const success = inventorySystem.addItem('flashlight');
      
      expect(success).toBe(true);
      expect(gameState.inventory).toHaveLength(1);
      
      const item = gameState.inventory[0];
      expect(item.id).toBe('flashlight');
      expect(item.name).toBe('Flashlight');
      expect(item.type).toBe('tool');
      expect(item.durability).toBe(100);
      expect(item.voiceCommands).toContain('flashlight');
      expect(item.effects.fearReduction).toBe(10);
    });

    test('should not add duplicate items', () => {
      inventorySystem.addItem('flashlight');
      const success = inventorySystem.addItem('flashlight');
      
      expect(success).toBe(false);
      expect(gameState.inventory).toHaveLength(1);
    });

    test('should add items with property overrides', () => {
      inventorySystem.addItem('flashlight', { durability: 50 });
      
      const item = gameState.inventory[0];
      expect(item.durability).toBe(50);
      expect(item.maxDurability).toBe(100); // Should keep original max
    });

    test('should handle unknown item IDs', () => {
      const success = inventorySystem.addItem('unknown_item');
      
      expect(success).toBe(false);
      expect(gameState.inventory).toHaveLength(0);
    });
  });

  describe('Item Usage', () => {
    beforeEach(() => {
      inventorySystem.addItem('flashlight');
      inventorySystem.addItem('matches');
      inventorySystem.addItem('bandage');
    });

    test('should use items and apply effects', () => {
      // Set initial fear level so reduction can be observed
      gameState.updateFear(20);
      const initialFear = gameState.fearLevel;
      
      const result = inventorySystem.useItem('flashlight');
      
      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual({ type: 'fear', value: -10 });
      expect(gameState.fearLevel).toBe(initialFear - 10);
      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('flashlight_click');
    });

    test('should reduce durability on usage', () => {
      const item = gameState.getInventoryItem('flashlight');
      const initialDurability = item.durability;
      
      inventorySystem.useItem('flashlight');
      
      expect(item.durability).toBe(initialDurability - 15); // usageRate is 15
    });

    test('should remove consumable items when durability reaches zero', () => {
      const item = gameState.getInventoryItem('matches');
      item.durability = 20; // One use left
      
      const result = inventorySystem.useItem('matches');
      
      expect(result.success).toBe(true);
      expect(result.consumed).toBe(true);
      expect(gameState.getInventoryItem('matches')).toBeNull();
    });

    test('should handle broken items', () => {
      const item = gameState.getInventoryItem('flashlight');
      item.durability = 0;
      
      const result = inventorySystem.useItem('flashlight');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('broken');
    });

    test('should handle missing items', () => {
      const result = inventorySystem.useItem('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("don't have");
    });

    test('should apply health restoration effects', () => {
      // Reduce health first so restoration can be observed
      gameState.updateHealth(-50); // Reduce by more so we can see the +30 effect
      const currentHealth = gameState.health;
      
      const result = inventorySystem.useItem('bandage');
      
      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual({ type: 'health', value: 30 });
      expect(gameState.health).toBe(currentHealth + 30);
    });
  });

  describe('Active Item Management', () => {
    beforeEach(() => {
      inventorySystem.addItem('flashlight');
      inventorySystem.addItem('phone');
      inventorySystem.addItem('knife');
    });

    test('should toggle item active state', () => {
      const item = gameState.getInventoryItem('flashlight');
      
      const isActive = inventorySystem.toggleItemActive('flashlight');
      
      expect(isActive).toBe(true);
      expect(item.isActive).toBe(true);
      expect(inventorySystem.activeItems.has('flashlight')).toBe(true);
      expect(mockAudioManager.playAmbient).toHaveBeenCalledWith('flashlight_hum', { loop: true, volume: 0.3 });
    });

    test('should deactivate other tools when activating a new one', () => {
      const flashlight = gameState.getInventoryItem('flashlight');
      const phone = gameState.getInventoryItem('phone');
      
      // Activate flashlight first
      inventorySystem.toggleItemActive('flashlight');
      expect(flashlight.isActive).toBe(true);
      
      // Activate phone - should deactivate flashlight
      inventorySystem.toggleItemActive('phone');
      expect(phone.isActive).toBe(true);
      expect(flashlight.isActive).toBe(false);
    });

    test('should not toggle non-activatable items', () => {
      inventorySystem.addItem('key_basement');
      
      const result = inventorySystem.toggleItemActive('key_basement');
      
      expect(result).toBe(false);
    });
  });

  describe('Voice Command Processing', () => {
    beforeEach(() => {
      inventorySystem.addItem('flashlight');
      inventorySystem.addItem('matches');
      inventorySystem.addItem('key_basement');
      inventorySystem.addItem('knife');
    });

    test('should process item usage voice commands', () => {
      const result = inventorySystem.processVoiceCommand('use flashlight');
      
      expect(result.success).toBe(true);
      expect(mockVoiceNarrator.speak).toHaveBeenCalled();
    });

    test('should handle item aliases in voice commands', () => {
      const result = inventorySystem.processVoiceCommand('turn on light');
      
      expect(result.success).toBe(true);
      // Should use flashlight via alias
    });

    test('should process search commands', () => {
      const context = { location: 'kitchen' };
      const result = inventorySystem.processVoiceCommand('search for items', context);
      
      // Should attempt to discover items in kitchen
      expect(result.success).toBeDefined();
    });

    test('should handle combination commands', () => {
      inventorySystem.addItem('candle');
      
      const result = inventorySystem.processVoiceCommand('light candle with matches');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('candle');
    });

    test('should validate contextual usage', () => {
      const context = { location: 'living_room', fearLevel: 95 };
      const result = inventorySystem.processVoiceCommand('use knife', context);
      
      expect(result.success).toBe(false);
      expect(result.narration).toContain('terrified');
    });
  });

  describe('Item Discovery', () => {
    test('should discover items based on location', () => {
      const context = { location: 'kitchen' };
      
      // Mock random to ensure discovery
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Low value to trigger discovery
      
      const result = inventorySystem.processDiscoveryCommand(context);
      
      expect(result.success).toBe(true);
      expect(result.itemsFound.length).toBeGreaterThan(0);
      
      Math.random = originalRandom;
    });

    test('should not discover items already in inventory', () => {
      inventorySystem.addItem('flashlight');
      const context = { location: 'starting_room' };
      
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1);
      
      const result = inventorySystem.processDiscoveryCommand(context);
      
      // Should not find flashlight again
      expect(result.itemsFound).not.toContain('flashlight');
      
      Math.random = originalRandom;
    });
  });

  describe('Item Validation', () => {
    beforeEach(() => {
      inventorySystem.addItem('key_basement');
      inventorySystem.addItem('candle');
    });

    test('should validate key usage at correct location', () => {
      const context = { location: 'basement_door' };
      const item = gameState.getInventoryItem('key_basement');
      
      const validation = inventorySystem.validateItemUsage(item, context);
      
      expect(validation.valid).toBe(true);
    });

    test('should invalidate key usage at wrong location', () => {
      const context = { location: 'kitchen' };
      const item = gameState.getInventoryItem('key_basement');
      
      const validation = inventorySystem.validateItemUsage(item, context);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('unlock');
    });

    test('should validate candle usage with matches', () => {
      inventorySystem.addItem('matches');
      const context = {};
      const item = gameState.getInventoryItem('candle');
      
      const validation = inventorySystem.validateItemUsage(item, context);
      
      expect(validation.valid).toBe(true);
    });

    test('should invalidate candle usage without matches', () => {
      const context = {};
      const item = gameState.getInventoryItem('candle');
      
      const validation = inventorySystem.validateItemUsage(item, context);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('matches');
    });
  });

  describe('System Updates', () => {
    beforeEach(() => {
      inventorySystem.addItem('candle');
      const candle = gameState.getInventoryItem('candle');
      candle.isActive = true;
      candle.durability = 10; // Low durability
    });

    test('should update active consumable items over time', () => {
      const candle = gameState.getInventoryItem('candle');
      const initialDurability = candle.durability;
      
      inventorySystem.update(5000); // 5 seconds
      
      expect(candle.durability).toBeLessThan(initialDurability);
    });

    test('should deactivate items when durability reaches zero', () => {
      const candle = gameState.getInventoryItem('candle');
      candle.durability = 1; // Very low
      
      inventorySystem.update(1000); // 1 second
      
      expect(candle.isActive).toBe(false);
      expect(inventorySystem.activeItems.has('candle')).toBe(false);
      expect(mockVoiceNarrator.speak).toHaveBeenCalledWith(expect.stringContaining('burned out'));
    });

    test('should clean up expired cooldowns', () => {
      // Manually add a cooldown
      inventorySystem.usageCooldowns.set('test_item', Date.now() - 1000);
      
      inventorySystem.update(100);
      
      expect(inventorySystem.usageCooldowns.has('test_item')).toBe(false);
    });
  });

  describe('Starting Inventory', () => {
    test('should initialize starting inventory', () => {
      inventorySystem.initializeStartingInventory();
      
      expect(gameState.inventory.length).toBeGreaterThan(0);
      expect(gameState.inventory.some(item => item.id === 'phone')).toBe(true);
    });

    test('should randomly include flashlight in starting inventory', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.3); // 30% - should include flashlight
      
      inventorySystem.initializeStartingInventory();
      
      expect(gameState.inventory.some(item => item.id === 'flashlight')).toBe(true);
      
      Math.random = originalRandom;
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      inventorySystem.addItem('flashlight');
      inventorySystem.addItem('matches');
      inventorySystem.addItem('phone');
    });

    test('should get available item commands', () => {
      const commands = inventorySystem.getAvailableItemCommands();
      
      expect(commands).toContain('flashlight');
      expect(commands).toContain('matches');
      expect(commands).toContain('search');
      expect(commands.length).toBeGreaterThan(10);
    });

    test('should get inventory statistics', () => {
      inventorySystem.toggleItemActive('flashlight');
      
      const stats = inventorySystem.getInventoryStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.activeItems).toBe(1);
      expect(stats.itemsByType.tool).toBe(2); // flashlight and phone
      expect(stats.itemsByType.consumable).toBe(1); // matches
      expect(stats.averageDurability).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle audio manager errors gracefully', () => {
      mockAudioManager.playEffect.mockImplementation(() => {
        throw new Error('Audio error');
      });
      
      inventorySystem.addItem('flashlight');
      
      // Should not throw error
      expect(() => {
        inventorySystem.useItem('flashlight');
      }).not.toThrow();
    });

    test('should handle voice narrator errors gracefully', () => {
      mockVoiceNarrator.speak.mockImplementation(() => {
        throw new Error('Voice error');
      });
      
      inventorySystem.addItem('flashlight');
      
      // Should not throw error
      expect(() => {
        inventorySystem.useItem('flashlight');
      }).not.toThrow();
    });
  });
});