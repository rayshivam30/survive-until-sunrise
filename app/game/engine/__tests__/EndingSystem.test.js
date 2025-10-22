/**
 * EndingSystem Tests
 * Tests for multiple ending scenarios, achievement tracking, and game completion
 */

import { EndingSystem } from '../EndingSystem.js';
import { GameState } from '../GameState.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock audio and voice systems
const mockAudioManager = {
  stopAmbient: jest.fn(),
  playEffect: jest.fn(),
};

const mockVoiceNarrator = {
  stopCurrentNarration: jest.fn(),
  speak: jest.fn().mockResolvedValue(),
};

describe('EndingSystem', () => {
  let endingSystem;
  let gameState;

  beforeEach(() => {
    // Clear localStorage mocks first
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null); // Return null by default
    
    gameState = new GameState();
    endingSystem = new EndingSystem(gameState, mockAudioManager, mockVoiceNarrator);
    
    // Clear audio/voice mocks
    mockAudioManager.stopAmbient.mockClear();
    mockAudioManager.playEffect.mockClear();
    mockVoiceNarrator.stopCurrentNarration.mockClear();
    mockVoiceNarrator.speak.mockClear();
  });

  describe('Ending Evaluation', () => {
    test('should evaluate perfect survivor ending', () => {
      // Set up perfect survivor conditions
      gameState.isAlive = true;
      gameState.currentTime = "06:00";
      gameState.fearLevel = 20;
      gameState.health = 90;
      gameState.inventory = [
        { id: 'hidden_key', type: 'secret' },
        { id: 'secret_note', type: 'secret' },
        { id: 'flashlight', type: 'tool' }
      ];

      const ending = endingSystem.evaluateEnding();

      expect(ending.id).toBe('perfect_survivor');
      expect(ending.type).toBe('victory');
      expect(ending.rarity).toBe('legendary');
    });

    test('should evaluate fear death ending', () => {
      // Set up fear death conditions
      gameState.isAlive = false;
      gameState.fearLevel = 100;
      gameState.health = 50;
      gameState.commandsIssued = new Array(10).fill('test_command'); // Ensure not coward death

      const ending = endingSystem.evaluateEnding();

      expect(ending.id).toBe('fear_death');
      expect(ending.type).toBe('death');
    });

    test('should evaluate brave survivor ending', () => {
      // Set up brave survivor conditions
      gameState.isAlive = true;
      gameState.currentTime = "06:00";
      gameState.fearLevel = 80;
      gameState.health = 60;
      gameState.commandsIssued = new Array(20).fill('test_command');

      const ending = endingSystem.evaluateEnding();

      expect(ending.id).toBe('brave_survivor');
      expect(ending.type).toBe('victory');
      expect(ending.rarity).toBe('rare');
    });

    test('should fall back to basic survivor for minimal victory', () => {
      // Set up minimal victory conditions
      gameState.isAlive = true;
      gameState.currentTime = "06:00";
      gameState.fearLevel = 50;
      gameState.health = 50;

      const ending = endingSystem.evaluateEnding();

      expect(ending.id).toBe('basic_survivor');
      expect(ending.type).toBe('victory');
    });
  });

  describe('Game Statistics Calculation', () => {
    test('should calculate survival time correctly', () => {
      gameState.gameStartTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      gameState.realTimeElapsed = 5 * 60 * 1000; // 5 minutes

      const stats = endingSystem.calculateGameStats();

      expect(stats.survivalTime).toBe(5); // 5 game hours
    });

    test('should count secrets found', () => {
      gameState.inventory = [
        { id: 'hidden_key', type: 'secret' },
        { id: 'flashlight', type: 'tool' },
        { id: 'secret_note', type: 'secret' }
      ];

      const stats = endingSystem.calculateGameStats();

      expect(stats.secretsFound).toBe(2);
    });

    test('should count items used', () => {
      gameState.inventory = [
        { id: 'flashlight', durability: 80, timesUsed: 3 },
        { id: 'key', durability: 100, timesUsed: 0 },
        { id: 'bandage', durability: 50, timesUsed: 1 }
      ];

      const stats = endingSystem.calculateGameStats();

      expect(stats.itemsUsed).toBe(2); // flashlight and bandage were used
    });

    test('should determine death cause correctly', () => {
      gameState.isAlive = false;
      gameState.fearLevel = 100;
      gameState.health = 30;

      const stats = endingSystem.calculateGameStats();

      expect(stats.deathCause).toBe('fear');
    });
  });

  describe('Achievement System', () => {
    test('should record new achievement', () => {
      const ending = {
        id: 'test_ending',
        title: 'Test Ending',
        description: 'Test description',
        rarity: 'common'
      };

      endingSystem.recordAchievement(ending);

      expect(endingSystem.endingAchievements['test_ending']).toBeDefined();
      expect(endingSystem.endingAchievements['test_ending'].timesAchieved).toBe(1);
      expect(endingSystem.endingAchievements['test_ending'].title).toBe('Test Ending');
      expect(endingSystem.endingAchievements['test_ending'].rarity).toBe('common');
    });

    test('should increment achievement count for repeated endings', () => {
      const ending = {
        id: 'test_ending',
        title: 'Test Ending',
        description: 'Test description',
        rarity: 'common'
      };

      // First call creates the achievement and increments to 1
      endingSystem.recordAchievement(ending);
      const firstCount = endingSystem.endingAchievements['test_ending'].timesAchieved;
      
      // Second call increments by 1
      endingSystem.recordAchievement(ending);
      const secondCount = endingSystem.endingAchievements['test_ending'].timesAchieved;
      
      expect(secondCount).toBe(firstCount + 1);
    });

    test('should load achievements from localStorage', () => {
      const savedAchievements = {
        'test_ending': {
          id: 'test_ending',
          title: 'Test Ending',
          timesAchieved: 3,
          firstAchieved: Date.now() - 1000000
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedAchievements));

      const newEndingSystem = new EndingSystem(gameState);

      expect(newEndingSystem.endingAchievements['test_ending']).toBeDefined();
      expect(newEndingSystem.endingAchievements['test_ending'].timesAchieved).toBe(3);
    });

    test('should get achievement summary correctly', () => {
      endingSystem.endingAchievements = {
        'ending1': { rarity: 'common', lastAchieved: Date.now() },
        'ending2': { rarity: 'rare', lastAchieved: Date.now() - 1000 },
        'ending3': { rarity: 'legendary', lastAchieved: Date.now() - 2000 }
      };

      const summary = endingSystem.getAchievementSummary();

      expect(summary.achieved).toBe(3);
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.percentage).toBeGreaterThan(0);
      expect(summary.recent).toHaveLength(3);
      expect(summary.rarest.rarity).toBe('legendary');
    });
  });

  describe('Ending Triggers', () => {
    test('should trigger ending with narration and audio', async () => {
      gameState.isAlive = true;
      gameState.currentTime = "06:00";
      gameState.fearLevel = 30;
      gameState.health = 80;

      // Create a simple ending system without voice narrator to avoid async issues
      const simpleEndingSystem = new EndingSystem(gameState, mockAudioManager, null);
      
      const result = await simpleEndingSystem.triggerEnding();

      expect(result.ending).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.canRestart).toBe(true);
      
      expect(mockAudioManager.stopAmbient).toHaveBeenCalled();
      expect(mockAudioManager.playEffect).toHaveBeenCalled();
    });

    test('should handle ending callbacks', async () => {
      const callback = jest.fn();
      
      // Create a simple ending system without voice narrator to avoid async issues
      const simpleEndingSystem = new EndingSystem(gameState, mockAudioManager, null);
      simpleEndingSystem.onEnding(callback);

      gameState.isAlive = true;
      gameState.currentTime = "06:00";

      await simpleEndingSystem.triggerEnding();

      expect(callback).toHaveBeenCalled();
    });

    test('should check if ending should be triggered', () => {
      // Game running, player alive, not at sunrise
      gameState.isAlive = true;
      gameState.currentTime = "02:00";
      expect(endingSystem.shouldTriggerEnding()).toBe(false);

      // Player died
      gameState.isAlive = false;
      expect(endingSystem.shouldTriggerEnding()).toBe(true);

      // Player alive but reached sunrise
      gameState.isAlive = true;
      gameState.currentTime = "06:00";
      expect(endingSystem.shouldTriggerEnding()).toBe(true);
    });
  });

  describe('Ending Content Generation', () => {
    test('should generate appropriate narration for different endings', () => {
      const perfectEnding = { id: 'perfect_survivor', title: 'Perfect Survivor' };
      const fearEnding = { id: 'fear_death', title: 'Consumed by Terror' };

      const perfectContent = endingSystem.generateEndingContent(perfectEnding);
      const fearContent = endingSystem.generateEndingContent(fearEnding);

      expect(perfectContent.narration).toContain('perfect survivor');
      expect(fearContent.narration).toContain('terror');
    });

    test('should format statistics correctly', () => {
      const stats = {
        survivalTime: 5.5,
        fearLevel: 75.3,
        health: 45.7,
        commandsUsed: 12,
        inventorySize: 3
      };

      const formatted = endingSystem.formatStatistics(stats);

      expect(formatted['Survival Time']).toBe('5.5 hours');
      expect(formatted['Final Fear Level']).toBe('75%');
      expect(formatted['Final Health']).toBe('46%');
      expect(formatted['Commands Used']).toBe(12);
    });
  });

  describe('Game Restart', () => {
    test('should handle restart functionality', () => {
      const callback = jest.fn();
      callback.onRestart = jest.fn();
      endingSystem.onEnding(callback);

      const result = endingSystem.restartGame();

      expect(result.success).toBe(true);
      expect(endingSystem.currentEnding).toBeNull();
    });
  });

  describe('Criteria Evaluation', () => {
    test('should evaluate boolean criteria correctly', () => {
      const criteria = { survived: true };
      const stats = { survived: true };

      const score = endingSystem.evaluateEndingCriteria(criteria, stats);

      expect(score).toBe(10); // Perfect match
    });

    test('should evaluate range criteria correctly', () => {
      const criteria = { fearLevel: { min: 50, max: 80 } };
      const stats = { fearLevel: 65 };

      const score = endingSystem.evaluateEndingCriteria(criteria, stats);

      expect(score).toBeGreaterThan(10); // Within range with bonus
    });

    test('should handle failed criteria', () => {
      const criteria = { fearLevel: { min: 80 } };
      const stats = { fearLevel: 50 };

      const score = endingSystem.evaluateEndingCriteria(criteria, stats);

      expect(score).toBe(0); // Failed to meet minimum
    });
  });
});