/**
 * Integration tests for VoiceController with CommandParser
 * Tests the complete voice command processing pipeline
 */

import { CommandParser } from '../../utils/CommandParser.js';

describe('VoiceController Integration', () => {
  let commandParser;

  beforeEach(() => {
    commandParser = new CommandParser();
  });

  describe('Command Processing Pipeline', () => {
    test('should process voice commands end-to-end', () => {
      const gameContext = {
        fearLevel: 30,
        health: 80,
        location: 'starting_room',
        inventory: [{ type: 'tool', name: 'flashlight', durability: 75 }]
      };

      // Test various voice inputs
      const testCases = [
        {
          input: 'hide',
          expectedAction: 'hide',
          expectedValid: true
        },
        {
          input: 'turn on flashlight',
          expectedAction: 'flashlight',
          expectedValid: true
        },
        {
          input: 'i want to run away',
          expectedAction: 'run',
          expectedValid: true
        },
        {
          input: 'completely unknown command',
          expectedAction: 'unknown',
          expectedValid: false
        }
      ];

      testCases.forEach(testCase => {
        const result = commandParser.parseCommand(testCase.input, gameContext);
        
        expect(result.action).toBe(testCase.expectedAction);
        expect(result.isValid).toBe(testCase.expectedValid);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.timestamp).toBeDefined();
      });
    });

    test('should handle fear-based command validation', () => {
      const highFearContext = {
        fearLevel: 95,
        health: 50,
        location: 'dark_room',
        inventory: []
      };

      // High fear should prevent most actions
      const result = commandParser.parseCommand('run', highFearContext);
      
      expect(result.action).toBe('run');
      expect(result.isValid).toBe(false);
      expect(result.validationError).toBe('Too scared to perform this action');
    });

    test('should handle inventory-based validation', () => {
      const noFlashlightContext = {
        fearLevel: 20,
        health: 100,
        location: 'dark_room',
        inventory: []
      };

      const result = commandParser.parseCommand('flashlight', noFlashlightContext);
      
      expect(result.action).toBe('flashlight');
      expect(result.isValid).toBe(false);
      expect(result.validationError).toBe('Flashlight not available');
    });

    test('should provide contextual command suggestions', () => {
      const darkRoomContext = {
        fearLevel: 40,
        health: 80,
        location: 'dark_room',
        inventory: [{ type: 'tool', name: 'flashlight', durability: 50 }]
      };

      const result = commandParser.parseCommand('i need to illuminate this place', darkRoomContext);
      
      expect(result.action).toBe('flashlight');
      expect(result.matchType).toBe('contextual');
      expect(result.contextReason).toBe('dark environment');
      expect(result.isValid).toBe(true);
    });

    test('should extract and apply command modifiers', () => {
      const result = commandParser.parseCommand('run quickly');
      
      expect(result.action).toBe('run');
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers[0].type).toBe('quickly');
      expect(result.modifiers[0].urgency).toBe('high');
    });

    test('should calculate accurate confidence scores', () => {
      const testInputs = [
        { input: 'hide', expectedMin: 0.9, expectedMax: 1.0 }, // exact match
        { input: 'duck', expectedMin: 0.8, expectedMax: 1.0 }, // alias match
        { input: 'i want to hide somewhere', expectedMin: 0.6, expectedMax: 0.8 }, // partial match
        { input: 'hid', expectedMin: 0.3, expectedMax: 0.6 } // fuzzy match (approximate)
      ];

      testInputs.forEach(test => {
        const result = commandParser.parseCommand(test.input);
        expect(result.confidence).toBeGreaterThanOrEqual(test.expectedMin);
        expect(result.confidence).toBeLessThanOrEqual(test.expectedMax);
      });
    });

    test('should maintain command statistics', () => {
      const commands = [
        'hide',
        'run',
        'unknown command',
        'flashlight',
        'listen'
      ];

      const results = commands.map(cmd => commandParser.parseCommand(cmd));
      const stats = commandParser.calculateStatistics(results);

      expect(stats.totalCommands).toBe(5);
      expect(stats.successfulCommands).toBe(4); // All except 'unknown command'
      expect(stats.successRate).toBe(80);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    test('should handle performance requirements', () => {
      const startTime = performance.now();
      
      // Process 50 commands to test performance
      for (let i = 0; i < 50; i++) {
        commandParser.parseCommand('hide behind the door quickly and quietly');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should process 50 commands in under 500ms
      expect(totalTime).toBeLessThan(500);
    });

    test('should provide helpful error messages', () => {
      const invalidInputs = [
        null,
        '',
        123,
        'xyzabc123'
      ];

      invalidInputs.forEach(input => {
        const result = commandParser.parseCommand(input);
        
        expect(result.action).toBe('unknown');
        expect(result.confidence).toBe(0);
        expect(result.error).toBeDefined();
        expect(result.isValid).toBe(false);
      });
    });

    test('should support all required command categories', () => {
      const requiredCategories = ['defensive', 'movement', 'interaction', 'tool', 'perception', 'passive', 'meta'];
      const availableCommands = commandParser.getAvailableCommands();
      
      const categoriesFound = new Set(availableCommands.map(cmd => cmd.category));
      
      requiredCategories.forEach(category => {
        expect(categoriesFound.has(category)).toBe(true);
      });
    });

    test('should handle command aliases correctly', () => {
      const aliasTests = [
        { input: 'duck', expectedAction: 'hide' },
        { input: 'flee', expectedAction: 'run' },
        { input: 'unlock', expectedAction: 'open' },
        { input: 'torch', expectedAction: 'flashlight' },
        { input: 'hear', expectedAction: 'listen' }
      ];

      aliasTests.forEach(test => {
        const result = commandParser.parseCommand(test.input);
        expect(result.action).toBe(test.expectedAction);
        expect(result.matchType).toBe('alias');
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should gracefully handle malformed game context', () => {
      const malformedContexts = [
        null,
        undefined,
        {},
        { fearLevel: 'high' }, // wrong type
        { inventory: 'none' } // wrong type
      ];

      malformedContexts.forEach(context => {
        const result = commandParser.parseCommand('hide', context);
        
        // Should still parse the command even with bad context
        expect(result.action).toBe('hide');
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should provide command suggestions for unknown inputs', () => {
      const availableCommands = commandParser.getAvailableCommands();
      
      expect(availableCommands.length).toBeGreaterThan(0);
      expect(availableCommands[0]).toHaveProperty('command');
      expect(availableCommands[0]).toHaveProperty('description');
      expect(availableCommands[0]).toHaveProperty('aliases');
    });

    test('should handle edge cases in similarity calculation', () => {
      const edgeCases = [
        { str1: '', str2: '', expectedSimilarity: 1 },
        { str1: 'hide', str2: '', expectedSimilarity: 0 },
        { str1: '', str2: 'hide', expectedSimilarity: 0 },
        { str1: 'a', str2: 'a', expectedSimilarity: 1 }
      ];

      edgeCases.forEach(test => {
        const similarity = commandParser.calculateSimilarity(test.str1, test.str2);
        expect(similarity).toBe(test.expectedSimilarity);
      });
    });
  });
});