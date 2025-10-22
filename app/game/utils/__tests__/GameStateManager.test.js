/**
 * @jest-environment jsdom
 */

import { GameStateManager } from '../GameStateManager.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

describe('GameStateManager', () => {
  let gameStateManager;
  let mockGameEngine;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    sessionStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.setItem.mockImplementation(() => {});
    sessionStorageMock.removeItem.mockImplementation(() => {});

    // Mock game engine
    mockGameEngine = {
      getGameState: jest.fn(),
      isGameActive: jest.fn(),
      notifyError: jest.fn()
    };

    gameStateManager = new GameStateManager(mockGameEngine, {
      autoSaveInterval: 0, // Disable auto-save for tests
      storageKey: 'test-game'
    });
  });

  afterEach(() => {
    if (gameStateManager) {
      gameStateManager.destroy();
    }
  });

  describe('Storage Availability', () => {
    test('should detect localStorage availability', () => {
      localStorageMock.setItem.mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('test');
      localStorageMock.removeItem.mockImplementation(() => {});

      const manager = new GameStateManager(null, { autoSaveInterval: 0 });
      expect(manager.storageAvailable).toBe(true);
    });

    test('should handle localStorage unavailability', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const manager = new GameStateManager(null, { autoSaveInterval: 0 });
      expect(manager.storageAvailable).toBe(false);
      
      // Restore mock
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('Checkpoint Saving', () => {
    test('should save checkpoint successfully', async () => {
      const gameState = {
        currentTime: '01:00',
        fearLevel: 25,
        health: 80,
        isAlive: true,
        inventory: ['flashlight']
      };

      // Ensure storage is available
      gameStateManager.storageAvailable = true;
      mockGameEngine.getGameState.mockReturnValue(gameState);
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await gameStateManager.saveCheckpoint(gameState, 'manual');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-game-checkpoint',
        expect.stringContaining('01:00')
      );
    });

    test('should handle save errors gracefully', async () => {
      const gameState = {
        currentTime: '01:00',
        fearLevel: 25,
        health: 80,
        isAlive: true
      };

      // Ensure storage is available initially
      gameStateManager.storageAvailable = true;
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = await gameStateManager.saveCheckpoint(gameState);
      
      expect(result).toBe(false);
      expect(mockGameEngine.notifyError).toHaveBeenCalledWith(
        'save_failed',
        expect.objectContaining({
          error: 'Storage full',
          canRetry: true
        })
      );
    });

    test('should not save if storage unavailable', async () => {
      // Create a new manager with storage unavailable
      const managerWithoutStorage = new GameStateManager(mockGameEngine, {
        autoSaveInterval: 0,
        storageKey: 'test-game-no-storage'
      });
      managerWithoutStorage.storageAvailable = false;
      
      const result = await managerWithoutStorage.saveCheckpoint({
        currentTime: '01:00',
        fearLevel: 25,
        health: 80,
        isAlive: true
      });
      
      expect(result).toBe(false);
    });

    test('should not save empty game state', async () => {
      const result = await gameStateManager.saveCheckpoint({});
      
      expect(result).toBe(false);
    });
  });

  describe('Checkpoint Loading', () => {
    test('should load checkpoint successfully', async () => {
      const gameStateData = {
        currentTime: '02:00',
        fearLevel: 50,
        health: 60,
        isAlive: true
      };
      
      const savedCheckpoint = {
        gameState: JSON.stringify(gameStateData),
        metadata: {
          timestamp: Date.now(),
          type: 'auto',
          compressed: false
        },
        checksum: 'valid-checksum'
      };

      // Ensure storage is available
      gameStateManager.storageAvailable = true;
      
      // Mock checksum calculation to return matching value
      gameStateManager.calculateChecksum = jest.fn().mockReturnValue('valid-checksum');
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCheckpoint));

      const result = await gameStateManager.loadCheckpoint();
      
      expect(result).toEqual(gameStateData);
    });

    test('should return null if no checkpoint exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await gameStateManager.loadCheckpoint();
      
      expect(result).toBeNull();
    });

    test('should handle corrupted checkpoint', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = await gameStateManager.loadCheckpoint();
      
      expect(result).toBeNull();
    });

    test('should verify checkpoint integrity', async () => {
      const corruptedCheckpoint = {
        gameState: JSON.stringify({ currentTime: '02:00' }),
        metadata: { timestamp: Date.now() },
        checksum: 'wrong-checksum'
      };

      gameStateManager.calculateChecksum = jest.fn().mockReturnValue('correct-checksum');
      localStorageMock.getItem.mockReturnValue(JSON.stringify(corruptedCheckpoint));

      const result = await gameStateManager.loadCheckpoint();
      
      expect(result).toBeNull();
    });
  });

  describe('Game State Serialization', () => {
    test('should serialize game state correctly', () => {
      const gameState = {
        currentTime: '03:00',
        fearLevel: 75,
        health: 40,
        isAlive: true,
        inventory: ['key', 'flashlight']
      };

      const serialized = gameStateManager.serializeGameState(gameState);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.currentTime).toBe('03:00');
      expect(parsed.fearLevel).toBe(75);
      expect(parsed.inventory).toEqual(['key', 'flashlight']);
    });

    test('should handle circular references', () => {
      const gameState = {
        currentTime: '03:00',
        fearLevel: 50,
        health: 70,
        isAlive: true
      };
      
      // Create circular reference
      gameState.self = gameState;

      expect(() => {
        gameStateManager.serializeGameState(gameState);
      }).not.toThrow();
    });

    test('should remove functions during serialization', () => {
      const gameState = {
        currentTime: '03:00',
        fearLevel: 50,
        health: 70,
        isAlive: true,
        someFunction: () => 'test'
      };

      const serialized = gameStateManager.serializeGameState(gameState);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.someFunction).toBeUndefined();
    });
  });

  describe('Game State Validation', () => {
    test('should validate required properties', () => {
      const validState = {
        currentTime: '04:00',
        fearLevel: 30,
        health: 90,
        isAlive: true
      };

      expect(() => {
        gameStateManager.validateGameState(validState);
      }).not.toThrow();
    });

    test('should throw error for missing required properties', () => {
      const invalidState = {
        currentTime: '04:00',
        fearLevel: 30
        // Missing health and isAlive
      };

      expect(() => {
        gameStateManager.validateGameState(invalidState);
      }).toThrow('Missing required property');
    });

    test('should validate property ranges', () => {
      const invalidState = {
        currentTime: '04:00',
        fearLevel: 150, // Invalid range
        health: 90,
        isAlive: true
      };

      expect(() => {
        gameStateManager.validateGameState(invalidState);
      }).toThrow('Invalid fear level');
    });

    test('should validate property types', () => {
      const invalidState = {
        currentTime: '04:00',
        fearLevel: 50,
        health: 90,
        isAlive: 'yes' // Should be boolean
      };

      expect(() => {
        gameStateManager.validateGameState(invalidState);
      }).toThrow('Invalid isAlive value');
    });
  });

  describe('Checksum Calculation', () => {
    test('should calculate consistent checksums', () => {
      const data = 'test data';
      
      const checksum1 = gameStateManager.calculateChecksum(data);
      const checksum2 = gameStateManager.calculateChecksum(data);
      
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
    });

    test('should generate different checksums for different data', () => {
      const data1 = 'test data 1';
      const data2 = 'test data 2';
      
      const checksum1 = gameStateManager.calculateChecksum(data1);
      const checksum2 = gameStateManager.calculateChecksum(data2);
      
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Auto-save Functionality', () => {
    test('should start auto-save when enabled', () => {
      // Mock storage as available for this test
      localStorageMock.setItem.mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('test');
      localStorageMock.removeItem.mockImplementation(() => {});
      
      const manager = new GameStateManager(mockGameEngine, {
        autoSaveInterval: 1000
      });

      expect(manager.autoSaveTimer).toBeTruthy();
      manager.destroy();
    });

    test('should not start auto-save when disabled', () => {
      const manager = new GameStateManager(mockGameEngine, {
        autoSaveInterval: 0
      });

      expect(manager.autoSaveTimer).toBeNull();
    });

    test('should stop auto-save on destroy', () => {
      const manager = new GameStateManager(mockGameEngine, {
        autoSaveInterval: 1000
      });

      const timerId = manager.autoSaveTimer;
      manager.destroy();

      expect(manager.autoSaveTimer).toBeNull();
    });
  });

  describe('Checkpoint Statistics', () => {
    test('should return empty stats when no checkpoints exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const stats = gameStateManager.getCheckpointStats();
      
      expect(stats.totalCheckpoints).toBe(0);
      expect(typeof stats.storageAvailable).toBe('boolean');
    });

    test('should return correct stats when checkpoints exist', () => {
      const history = {
        checkpoints: [
          { metadata: { timestamp: 1000 } },
          { metadata: { timestamp: 2000 } },
          { metadata: { timestamp: 3000 } }
        ]
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(history));

      const stats = gameStateManager.getCheckpointStats();
      
      expect(stats.totalCheckpoints).toBe(3);
      expect(stats.oldestCheckpoint).toBe(1000);
      expect(stats.newestCheckpoint).toBe(3000);
    });
  });

  describe('Cleanup Operations', () => {
    test('should clear all checkpoints', () => {
      const result = gameStateManager.clearAllCheckpoints();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-game-checkpoint');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-game-history');
    });

    test('should handle cleanup errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const result = gameStateManager.clearAllCheckpoints();
      
      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should generate session ID', () => {
      sessionStorageMock.getItem.mockReturnValue(null);
      sessionStorageMock.setItem.mockImplementation(() => {});

      const sessionId = gameStateManager.getSessionId();
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'test-game-session',
        sessionId
      );
    });

    test('should reuse existing session ID', () => {
      const existingId = 'existing-session-id';
      sessionStorageMock.getItem.mockReturnValue(existingId);

      const sessionId = gameStateManager.getSessionId();
      
      expect(sessionId).toBe(existingId);
      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});