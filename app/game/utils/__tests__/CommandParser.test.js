/**
 * Unit tests for CommandParser class
 * Tests command parsing, aliases, confidence scoring, and validation
 */

import { CommandParser } from '../CommandParser.js';

describe('CommandParser', () => {
  let parser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('Basic Command Parsing', () => {
    test('should parse exact command matches', () => {
      const result = parser.parseCommand('hide');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.category).toBe('defensive');
      expect(result.isValid).toBe(true);
    });

    test('should parse multiple exact commands', () => {
      const commands = ['run', 'open', 'listen', 'flashlight'];
      
      commands.forEach(command => {
        const result = parser.parseCommand(command);
        expect(result.action).toBe(command);
        expect(result.confidence).toBe(1.0);
        expect(result.matchType).toBe('exact');
      });
    });

    test('should handle case insensitive input', () => {
      const result = parser.parseCommand('HIDE');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(1.0);
    });

    test('should handle input with extra whitespace', () => {
      const result = parser.parseCommand('  hide  ');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Alias Matching', () => {
    test('should parse exact alias matches', () => {
      const result = parser.parseCommand('duck');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(0.9);
      expect(result.matchType).toBe('alias');
      expect(result.matchedAlias).toBe('duck');
    });

    test('should parse multi-word aliases', () => {
      const result = parser.parseCommand('take cover');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(0.9);
      expect(result.matchType).toBe('alias');
      expect(result.matchedAlias).toBe('take cover');
    });

    test('should parse partial alias matches', () => {
      const result = parser.parseCommand('i want to take cover now');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBeLessThanOrEqual(0.9);
      expect(result.matchType).toBe('alias');
    });

    test('should handle multiple aliases for same command', () => {
      const aliases = ['flee', 'escape', 'sprint'];
      
      aliases.forEach(alias => {
        const result = parser.parseCommand(alias);
        expect(result.action).toBe('run');
        expect(result.matchType).toBe('alias');
      });
    });
  });

  describe('Partial Matching', () => {
    test('should parse commands within longer phrases', () => {
      const result = parser.parseCommand('i need to hide right now');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBe(0.7);
      expect(result.matchType).toBe('partial');
    });

    test('should parse multi-word alias tokens', () => {
      const result = parser.parseCommand('please turn on light');
      
      expect(result.action).toBe('flashlight');
      expect(['alias', 'partial-alias']).toContain(result.matchType);
    });

    test('should filter out filler words', () => {
      const result = parser.parseCommand('can you please help me hide');
      
      expect(result.action).toBe('hide');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Contextual Matching', () => {
    test('should infer hide command when fear is high', () => {
      const gameContext = { fearLevel: 80 };
      const result = parser.parseCommand('get behind something', gameContext);
      
      expect(result.action).toBe('hide');
      expect(result.matchType).toBe('contextual');
      expect(result.contextReason).toBe('high fear level');
    });

    test('should infer flashlight command in dark room', () => {
      const gameContext = { location: 'dark_room' };
      const result = parser.parseCommand('i need to illuminate this place', gameContext);
      
      expect(result.action).toBe('flashlight');
      expect(result.matchType).toBe('contextual');
      expect(result.contextReason).toBe('dark environment');
    });

    test('should boost confidence for contextually appropriate commands', () => {
      const gameContext = { fearLevel: 60 };
      const result = parser.parseCommand('hide', gameContext);
      
      expect(result.confidence).toBeGreaterThan(1.0);
    });
  });

  describe('Fuzzy Matching', () => {
    test('should match similar commands with typos', () => {
      const result = parser.parseCommand('hid'); // typo for 'hide'
      
      expect(result.action).toBe('hide');
      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should match similar aliases', () => {
      const result = parser.parseCommand('flee'); // close to 'flee' alias
      
      expect(result.action).toBe('run');
      expect(result.matchType).toBe('alias');
    });

    test('should not match very different words', () => {
      const result = parser.parseCommand('elephant');
      
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should calculate similarity scores correctly', () => {
      const similarity1 = parser.calculateSimilarity('hide', 'hid');
      const similarity2 = parser.calculateSimilarity('hide', 'elephant');
      
      expect(similarity1).toBeGreaterThan(similarity2);
      expect(similarity1).toBeGreaterThan(0.7);
      expect(similarity2).toBeLessThan(0.3);
    });
  });

  describe('Command Validation', () => {
    test('should validate commands based on fear level', () => {
      const gameContext = { fearLevel: 95 };
      const result = parser.parseCommand('run', gameContext);
      
      expect(result.isValid).toBe(false);
      expect(result.validationError).toBe('Too scared to perform this action');
    });

    test('should allow passive commands when very scared', () => {
      const gameContext = { fearLevel: 95 };
      const result = parser.parseCommand('wait', gameContext);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate tool availability', () => {
      const gameContext = { inventory: [] };
      const result = parser.parseCommand('flashlight', gameContext);
      
      expect(result.isValid).toBe(false);
      expect(result.validationError).toBe('Flashlight not available');
    });

    test('should validate tool availability when present', () => {
      const gameContext = { 
        inventory: [{ type: 'tool', name: 'flashlight', durability: 50 }] 
      };
      const result = parser.parseCommand('flashlight', gameContext);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate location-specific constraints', () => {
      const gameContext = { location: 'locked_room' };
      const result = parser.parseCommand('open', gameContext);
      
      expect(result.isValid).toBe(false);
      expect(result.validationError).toBe('No doors available to open');
    });
  });

  describe('Modifier Extraction', () => {
    test('should extract speed modifiers', () => {
      const result = parser.parseCommand('run quickly');
      
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers[0].type).toBe('quickly');
      expect(result.modifiers[0].urgency).toBe('high');
    });

    test('should extract stealth modifiers', () => {
      const result = parser.parseCommand('hide quietly');
      
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers[0].stealth).toBe(true);
    });

    test('should handle multiple modifiers', () => {
      const result = parser.parseCommand('run quickly and quietly');
      
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle null input', () => {
      const result = parser.parseCommand(null);
      
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Invalid input');
    });

    test('should handle empty string', () => {
      const result = parser.parseCommand('');
      
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should handle non-string input', () => {
      const result = parser.parseCommand(123);
      
      expect(result.action).toBe('unknown');
      expect(result.error).toBe('Invalid input');
    });

    test('should handle unrecognized commands', () => {
      const result = parser.parseCommand('xyzabc123');
      
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Command not recognized');
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign highest confidence to exact matches', () => {
      const result = parser.parseCommand('hide');
      expect(result.confidence).toBe(1.0);
    });

    test('should assign lower confidence to aliases', () => {
      const result = parser.parseCommand('duck');
      expect(result.confidence).toBe(0.9);
    });

    test('should assign even lower confidence to partial matches', () => {
      const result = parser.parseCommand('i want to hide somewhere');
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should assign lowest confidence to fuzzy matches', () => {
      const result = parser.parseCommand('hid');
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should respect minimum confidence threshold', () => {
      const result = parser.parseCommand('completely unrelated words');
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Utility Methods', () => {
    test('should return available commands', () => {
      const commands = parser.getAvailableCommands();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toHaveProperty('command');
      expect(commands[0]).toHaveProperty('action');
      expect(commands[0]).toHaveProperty('aliases');
      expect(commands[0]).toHaveProperty('category');
    });

    test('should filter commands by category', () => {
      const defensiveCommands = parser.getCommandsByCategory('defensive');
      
      expect(Array.isArray(defensiveCommands)).toBe(true);
      defensiveCommands.forEach(cmd => {
        expect(cmd.category).toBe('defensive');
      });
    });

    test('should calculate statistics correctly', () => {
      const mockResults = [
        { confidence: 1.0, matchType: 'exact' },
        { confidence: 0.9, matchType: 'alias' },
        { confidence: 0.2, matchType: 'fuzzy' }, // Below threshold
        { confidence: 0.7, matchType: 'partial' }
      ];
      
      const stats = parser.calculateStatistics(mockResults);
      
      expect(stats.totalCommands).toBe(4);
      expect(stats.successfulCommands).toBe(3); // Only above 0.3 threshold
      expect(stats.successRate).toBe(75);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    test('should handle empty statistics', () => {
      const stats = parser.calculateStatistics([]);
      
      expect(stats.totalCommands).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Levenshtein Distance', () => {
    test('should calculate correct edit distance', () => {
      expect(parser.levenshteinDistance('hide', 'hide')).toBe(0);
      expect(parser.levenshteinDistance('hide', 'hid')).toBe(1);
      expect(parser.levenshteinDistance('hide', 'side')).toBe(1);
      expect(parser.levenshteinDistance('hide', 'elephant')).toBeGreaterThan(4);
    });

    test('should handle empty strings', () => {
      expect(parser.levenshteinDistance('', '')).toBe(0);
      expect(parser.levenshteinDistance('hide', '')).toBe(4);
      expect(parser.levenshteinDistance('', 'hide')).toBe(4);
    });
  });

  describe('Performance', () => {
    test('should parse commands quickly', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        parser.parseCommand('hide behind the door quickly');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(1000); // Should complete 100 parses in under 1 second
    });

    test('should handle complex fuzzy matching efficiently', () => {
      const startTime = performance.now();
      
      // Test with intentionally difficult input
      parser.parseCommand('this is a very long sentence with many words that might confuse the parser');
      
      const endTime = performance.now();
      const parseTime = endTime - startTime;
      
      expect(parseTime).toBeLessThan(100); // Should parse complex input in under 100ms
    });
  });
});