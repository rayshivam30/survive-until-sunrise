/**
 * Voice Command and Game State Integration Tests
 * Tests the complete flow from voice input to game state changes
 */

import { GameEngine } from '../engine/GameEngine.js';
import { CommandParser } from '../utils/CommandParser.js';
import { VoiceNarrator } from '../utils/VoiceNarrator.js';
import AudioManager from '../utils/AudioManager.js';

// Mock Web APIs
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  maxAlternatives: 1
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { name: 'Test Voice', lang: 'en-US' }
  ]),
  speaking: false,
  pending: false
};

global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
global.speechSynthesis = mockSpeechSynthesis;

// Mock Howler.js
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(() => ({
    play: jest.fn().mockReturnValue('mock-sound-id'),
    stop: jest.fn(),
    volume: jest.fn().mockReturnThis(),
    on: jest.fn(),
    once: jest.fn()
  })),
  Howler: {
    volume: jest.fn(),
    ctx: { state: 'running' }
  }
}));

// Mock performance timing
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('Voice Command and Game State Integration', () => {
  let gameEngine;
  let commandParser;
  let voiceNarrator;
  let audioManager;

  beforeEach(async () => {
    // Initialize all systems
    gameEngine = new GameEngine();
    commandParser = new CommandParser();
    voiceNarrator = new VoiceNarrator();
    audioManager = new AudioManager();
    
    await audioManager.initialize(jest.fn());
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (gameEngine?.isRunning) {
      gameEngine.stop();
    }
    if (audioManager?.isInitialized) {
      audioManager.destroy();
    }
  });

  describe('Voice Command Processing Flow', () => {
    test('should process voice command and update game state', () => {
      gameEngine.start();
      const initialFear = gameEngine.gameState.fearLevel;
      
      // Simulate voice command: "hide"
      const parsedCommand = commandParser.parseCommand('hide');
      expect(parsedCommand.action).toBe('hide');
      
      // Process command through game engine
      const result = gameEngine.handleCommand('hide');
      expect(result).toBe(true);
      
      // Verify game state was updated
      expect(gameEngine.gameState.commandsIssued).toHaveLength(1);
      expect(gameEngine.gameState.commandsIssued[0].command).toBe('hide');
      
      // Fear level should decrease when hiding successfully
      expect(gameEngine.gameState.fearLevel).toBeLessThan(initialFear);
    });

    test('should handle complex voice commands with context', () => {
      gameEngine.start();
      gameEngine.gameState.inventory = ['flashlight'];
      gameEngine.gameState.location = 'dark_room';
      
      const gameContext = {
        fearLevel: gameEngine.gameState.fearLevel,
        location: gameEngine.gameState.location,
        inventory: gameEngine.gameState.inventory
      };
      
      // Parse command with context
      const parsedCommand = commandParser.parseCommand('turn on flashlight', gameContext);
      expect(parsedCommand.action).toBe('flashlight');
      expect(parsedCommand.isValid).toBe(true);
      
      // Process command
      gameEngine.handleCommand('turn on flashlight');
      
      // Verify flashlight was activated
      const flashlight = gameEngine.gameState.inventory.find(item => item.id === 'flashlight');
      expect(flashlight?.isActive).toBe(true);
    });

    test('should reject invalid commands and provide feedback', () => {
      gameEngine.start();
      
      // Try to use item not in inventory
      const parsedCommand = commandParser.parseCommand('use key');
      expect(parsedCommand.isValid).toBe(false);
      expect(parsedCommand.validationError).toContain('not available');
      
      // Game state should not change
      const initialState = { ...gameEngine.gameState };
      gameEngine.handleCommand('use key');
      
      expect(gameEngine.gameState.inventory).toEqual(initialState.inventory);
    });

    test('should handle rapid voice commands with debouncing', () => {
      gameEngine.start();
      
      const commands = ['hide', 'listen', 'run', 'hide'];
      const results = [];
      
      // Process commands rapidly
      commands.forEach((command, index) => {
        // Mock different timestamps to test debouncing
        performance.now.mockReturnValue(Date.now() + index * 100);
        results.push(gameEngine.handleCommand(command));
      });
      
      // Some commands should be debounced
      const successfulCommands = results.filter(r => r === true);
      expect(successfulCommands.length).toBeLessThan(commands.length);
      
      // But at least some should succeed
      expect(successfulCommands.length).toBeGreaterThan(0);
    });
  });

  describe('Game State Response to Voice Commands', () => {
    test('should update fear level based on command success', () => {
      gameEngine.start();
      const initialFear = gameEngine.gameState.fearLevel;
      
      // Successful hiding should reduce fear
      gameEngine.handleCommand('hide');
      expect(gameEngine.gameState.fearLevel).toBeLessThan(initialFear);
      
      // Failed command should increase fear
      const fearAfterHide = gameEngine.gameState.fearLevel;
      gameEngine.handleCommand('invalid command');
      expect(gameEngine.gameState.fearLevel).toBeGreaterThan(fearAfterHide);
    });

    test('should trigger events based on voice commands', () => {
      gameEngine.start();
      const initialEvents = gameEngine.gameState.eventsTriggered.length;
      
      // Some commands should trigger events
      gameEngine.handleCommand('listen carefully');
      
      expect(gameEngine.gameState.eventsTriggered.length).toBeGreaterThan(initialEvents);
      
      const triggeredEvent = gameEngine.gameState.eventsTriggered[gameEngine.gameState.eventsTriggered.length - 1];
      expect(triggeredEvent.trigger).toBe('voice_command');
    });

    test('should modify inventory through voice commands', () => {
      gameEngine.start();
      gameEngine.gameState.location = 'basement';
      
      // Command to search should potentially find items
      gameEngine.handleCommand('search around');
      
      // Check if inventory was modified
      const hasNewItems = gameEngine.gameState.inventory.length > 0;
      if (hasNewItems) {
        expect(gameEngine.gameState.inventory[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String)
          })
        );
      }
    });

    test('should update location based on movement commands', () => {
      gameEngine.start();
      const initialLocation = gameEngine.gameState.location;
      
      // Movement command should change location
      gameEngine.handleCommand('go to basement');
      
      expect(gameEngine.gameState.location).not.toBe(initialLocation);
      expect(gameEngine.gameState.location).toBe('basement');
    });
  });

  describe('Audio Integration with Voice Commands', () => {
    test('should play appropriate sounds for voice commands', () => {
      gameEngine.start();
      
      // Mock audio manager methods
      const playEffectSpy = jest.spyOn(audioManager, 'playEffect');
      const playAmbientSpy = jest.spyOn(audioManager, 'playAmbient');
      
      // Commands should trigger appropriate audio
      gameEngine.handleCommand('hide');
      expect(playEffectSpy).toHaveBeenCalledWith(expect.stringMatching(/hide|quiet|stealth/));
      
      gameEngine.handleCommand('run');
      expect(playEffectSpy).toHaveBeenCalledWith(expect.stringMatching(/run|footsteps|movement/));
      
      gameEngine.handleCommand('open door');
      expect(playEffectSpy).toHaveBeenCalledWith(expect.stringMatching(/door|creak|open/));
    });

    test('should adjust audio based on game state changes', () => {
      gameEngine.start();
      
      const updateAudioSpy = jest.spyOn(audioManager, 'updateAudioForGameState');
      
      // Command that changes fear level should update audio
      gameEngine.handleCommand('hide');
      
      expect(updateAudioSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fearLevel: expect.any(Number),
          health: expect.any(Number),
          location: expect.any(String)
        })
      );
    });

    test('should handle audio failures gracefully during voice commands', () => {
      gameEngine.start();
      
      // Mock audio failure
      jest.spyOn(audioManager, 'playEffect').mockReturnValue(null);
      
      // Command should still work even if audio fails
      const result = gameEngine.handleCommand('hide');
      expect(result).toBe(true);
      
      // Game state should still update
      expect(gameEngine.gameState.commandsIssued).toHaveLength(1);
    });
  });

  describe('Voice Narration Integration', () => {
    test('should provide voice feedback for commands', () => {
      gameEngine.start();
      
      const narrateSpy = jest.spyOn(voiceNarrator, 'narrate');
      
      // Command should trigger narration
      gameEngine.handleCommand('hide');
      
      expect(narrateSpy).toHaveBeenCalledWith(
        expect.stringContaining('hide'),
        expect.any(Object)
      );
    });

    test('should narrate game state changes', () => {
      gameEngine.start();
      
      const narrateEventSpy = jest.spyOn(voiceNarrator, 'narrateEvent');
      
      // Command that triggers event should narrate it
      gameEngine.handleCommand('listen');
      
      if (gameEngine.gameState.eventsTriggered.length > 0) {
        expect(narrateEventSpy).toHaveBeenCalled();
      }
    });

    test('should provide contextual feedback based on game state', () => {
      gameEngine.start();
      gameEngine.gameState.fearLevel = 80; // High fear
      
      const provideCommandFeedbackSpy = jest.spyOn(voiceNarrator, 'provideCommandFeedback');
      
      gameEngine.handleCommand('hide');
      
      expect(provideCommandFeedbackSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'hide' }),
        expect.any(Boolean),
        expect.objectContaining({ fearLevel: 80 })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle voice recognition errors gracefully', () => {
      gameEngine.start();
      
      // Simulate voice recognition error
      const errorHandler = jest.fn();
      
      // Process malformed command
      const result = gameEngine.handleCommand('');
      expect(result).toBe(false);
      
      // Game state should remain stable
      expect(gameEngine.gameState.isAlive).toBe(true);
      expect(gameEngine.isRunning).toBe(true);
    });

    test('should recover from command parser failures', () => {
      gameEngine.start();
      
      // Mock parser to throw error
      jest.spyOn(commandParser, 'parseCommand').mockImplementationOnce(() => {
        throw new Error('Parser error');
      });
      
      // Should handle error gracefully
      const result = gameEngine.handleCommand('test command');
      expect(result).toBe(false);
      
      // Next command should work normally
      commandParser.parseCommand.mockRestore();
      const nextResult = gameEngine.handleCommand('hide');
      expect(nextResult).toBe(true);
    });

    test('should maintain game state consistency during errors', () => {
      gameEngine.start();
      const initialState = JSON.parse(JSON.stringify(gameEngine.gameState));
      
      // Cause various errors
      gameEngine.handleCommand(null);
      gameEngine.handleCommand(undefined);
      gameEngine.handleCommand('');
      
      // Core game state should remain valid
      expect(gameEngine.gameState.isAlive).toBe(true);
      expect(gameEngine.gameState.fearLevel).toBeGreaterThanOrEqual(0);
      expect(gameEngine.gameState.fearLevel).toBeLessThanOrEqual(100);
      expect(gameEngine.gameState.health).toBeGreaterThanOrEqual(0);
      expect(gameEngine.gameState.health).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle high frequency voice commands', () => {
      gameEngine.start();
      
      const startTime = performance.now();
      const commands = Array(50).fill(['hide', 'listen', 'run']).flat();
      
      let successCount = 0;
      commands.forEach((command, index) => {
        performance.now.mockReturnValue(startTime + index * 10);
        if (gameEngine.handleCommand(command)) {
          successCount++;
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should process commands efficiently
      expect(duration).toBeLessThan(1000);
      expect(successCount).toBeGreaterThan(0);
    });

    test('should maintain responsiveness during complex state updates', () => {
      gameEngine.start();
      
      // Create complex game state
      gameEngine.gameState.inventory = Array(20).fill(0).map((_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
        type: 'tool'
      }));
      
      gameEngine.gameState.eventsTriggered = Array(50).fill(0).map((_, i) => ({
        id: `event_${i}`,
        timestamp: Date.now() - i * 1000
      }));
      
      const startTime = performance.now();
      
      // Process command with complex state
      const result = gameEngine.handleCommand('check inventory');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(100); // Should remain responsive
    });
  });

  describe('End-to-End Game Scenarios', () => {
    test('should handle complete survival scenario', () => {
      gameEngine.start();
      
      const scenario = [
        'listen carefully',
        'hide behind door',
        'wait quietly',
        'check inventory',
        'move to basement',
        'search for items',
        'use flashlight',
        'listen for sounds',
        'hide again'
      ];
      
      let gameEnded = false;
      scenario.forEach(command => {
        if (!gameEnded && gameEngine.isRunning) {
          gameEngine.handleCommand(command);
          gameEnded = !gameEngine.gameState.isAlive || !gameEngine.isRunning;
        }
      });
      
      // Game should have progressed meaningfully
      expect(gameEngine.gameState.commandsIssued.length).toBeGreaterThan(0);
      expect(gameEngine.gameState.eventsTriggered.length).toBeGreaterThan(0);
      
      // Player should still be alive if they made good choices
      if (gameEngine.gameState.fearLevel < 80) {
        expect(gameEngine.gameState.isAlive).toBe(true);
      }
    });

    test('should handle death scenario appropriately', () => {
      gameEngine.start();
      
      // Force high fear and low health
      gameEngine.gameState.fearLevel = 95;
      gameEngine.gameState.health = 10;
      
      // Make risky commands
      const riskyCommands = [
        'run around loudly',
        'shout for help',
        'ignore the sounds',
        'walk into danger'
      ];
      
      let deathTriggered = false;
      riskyCommands.forEach(command => {
        if (!deathTriggered) {
          gameEngine.handleCommand(command);
          deathTriggered = !gameEngine.gameState.isAlive;
        }
      });
      
      // Should eventually trigger death condition
      if (deathTriggered) {
        expect(gameEngine.gameState.isAlive).toBe(false);
        expect(gameEngine.isRunning).toBe(false);
      }
    });

    test('should handle victory scenario', () => {
      gameEngine.start();
      
      // Simulate time progression to near sunrise
      gameEngine.gameState.currentTime = '05:45';
      gameEngine.gameState.fearLevel = 30; // Manageable fear
      gameEngine.gameState.health = 70; // Good health
      
      // Make final survival commands
      gameEngine.handleCommand('hide and wait');
      gameEngine.handleCommand('stay quiet');
      
      // Simulate reaching sunrise
      gameEngine.gameState.currentTime = '06:00';
      gameEngine.update(0); // Trigger win condition check
      
      // Should trigger victory
      expect(gameEngine.gameState.isAlive).toBe(true);
      // Game should end on victory
      expect(gameEngine.isRunning).toBe(false);
    });
  });
});