/**
 * GameStateManager - Handles game state persistence, checkpoints, and error recovery
 * Provides robust state management with automatic saving and recovery capabilities
 */

export class GameStateManager {
  constructor(gameEngine = null, options = {}) {
    this.gameEngine = gameEngine;
    this.options = {
      autoSaveInterval: options.autoSaveInterval ?? 30000, // 30 seconds
      maxCheckpoints: options.maxCheckpoints ?? 10,
      storageKey: options.storageKey ?? 'survive-until-sunrise',
      enableCompression: options.enableCompression ?? true,
      enableEncryption: options.enableEncryption ?? false,
      ...options
    };
    
    this.autoSaveTimer = null;
    this.lastSaveTime = 0;
    this.saveInProgress = false;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    
    // Initialize storage availability check
    this.storageAvailable = this.checkStorageAvailability();
    
    // Start auto-save if enabled
    if (this.options.autoSaveInterval > 0 && this.storageAvailable) {
      this.startAutoSave();
    }
  }

  /**
   * Save current game state as a checkpoint
   * @param {Object} gameState - Current game state to save
   * @param {string} checkpointType - Type of checkpoint ('auto', 'manual', 'critical')
   * @returns {Promise<boolean>} Success status
   */
  async saveCheckpoint(gameState = null, checkpointType = 'auto') {
    if (this.saveInProgress) {
      console.warn('Save already in progress, skipping');
      return false;
    }

    if (!this.storageAvailable) {
      console.warn('Storage not available, cannot save checkpoint');
      return false;
    }

    try {
      this.saveInProgress = true;
      
      // Get game state from engine if not provided
      const stateToSave = gameState || (this.gameEngine?.getGameState?.() ?? {});
      
      if (!stateToSave || Object.keys(stateToSave).length === 0) {
        console.warn('No game state to save');
        return false;
      }

      const checkpoint = {
        gameState: this.serializeGameState(stateToSave),
        metadata: {
          timestamp: Date.now(),
          type: checkpointType,
          version: '1.0.0',
          gameTime: stateToSave.currentTime || '23:00',
          fearLevel: stateToSave.fearLevel || 0,
          health: stateToSave.health || 100,
          isAlive: stateToSave.isAlive ?? true,
          sessionId: this.getSessionId()
        },
        checksum: null // Will be calculated after serialization
      };

      // Calculate checksum for integrity verification
      checkpoint.checksum = this.calculateChecksum(checkpoint.gameState);

      // Compress if enabled
      if (this.options.enableCompression) {
        checkpoint.gameState = this.compressData(checkpoint.gameState);
        checkpoint.metadata.compressed = true;
      }

      // Save to localStorage
      const checkpointKey = `${this.options.storageKey}-checkpoint`;
      localStorage.setItem(checkpointKey, JSON.stringify(checkpoint));

      // Maintain checkpoint history
      await this.updateCheckpointHistory(checkpoint);

      this.lastSaveTime = Date.now();
      
      console.log(`Checkpoint saved (${checkpointType}):`, {
        timestamp: checkpoint.metadata.timestamp,
        gameTime: checkpoint.metadata.gameTime,
        size: JSON.stringify(checkpoint).length
      });

      return true;

    } catch (error) {
      console.error('Failed to save checkpoint:', error);
      this.handleSaveError(error, checkpointType);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Load the most recent checkpoint
   * @returns {Promise<Object|null>} Loaded game state or null if failed
   */
  async loadCheckpoint() {
    if (!this.storageAvailable) {
      console.warn('Storage not available, cannot load checkpoint');
      return null;
    }

    try {
      const checkpointKey = `${this.options.storageKey}-checkpoint`;
      const checkpointData = localStorage.getItem(checkpointKey);
      
      if (!checkpointData) {
        console.log('No checkpoint found');
        return null;
      }

      const checkpoint = JSON.parse(checkpointData);
      
      // Verify checkpoint integrity
      if (!this.verifyCheckpoint(checkpoint)) {
        console.error('Checkpoint verification failed, attempting recovery from history');
        return await this.recoverFromHistory();
      }

      // Decompress if needed
      let gameState = checkpoint.gameState;
      if (checkpoint.metadata.compressed) {
        gameState = this.decompressData(gameState);
      }

      // Deserialize game state
      const restoredState = this.deserializeGameState(gameState);
      
      console.log('Checkpoint loaded:', {
        timestamp: checkpoint.metadata.timestamp,
        type: checkpoint.metadata.type,
        gameTime: checkpoint.metadata.gameTime,
        age: Date.now() - checkpoint.metadata.timestamp
      });

      return restoredState;

    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      this.recoveryAttempts++;
      
      if (this.recoveryAttempts < this.maxRecoveryAttempts) {
        console.log(`Attempting recovery ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);
        return await this.recoverFromHistory();
      }
      
      return null;
    }
  }

  /**
   * Recover game state from checkpoint history
   * @returns {Promise<Object|null>} Recovered game state or null
   */
  async recoverFromHistory() {
    try {
      const historyKey = `${this.options.storageKey}-history`;
      const historyData = localStorage.getItem(historyKey);
      
      if (!historyData) {
        console.log('No checkpoint history available');
        return null;
      }

      const history = JSON.parse(historyData);
      
      // Try checkpoints from newest to oldest
      for (const checkpoint of history.checkpoints.reverse()) {
        try {
          if (this.verifyCheckpoint(checkpoint)) {
            let gameState = checkpoint.gameState;
            
            if (checkpoint.metadata.compressed) {
              gameState = this.decompressData(gameState);
            }
            
            const restoredState = this.deserializeGameState(gameState);
            
            console.log('Recovered from history checkpoint:', {
              timestamp: checkpoint.metadata.timestamp,
              type: checkpoint.metadata.type
            });
            
            return restoredState;
          }
        } catch (error) {
          console.warn('Failed to recover from checkpoint:', error);
          continue;
        }
      }
      
      console.error('All recovery attempts failed');
      return null;

    } catch (error) {
      console.error('Failed to recover from history:', error);
      return null;
    }
  }

  /**
   * Handle save errors with appropriate fallback strategies
   * @param {Error} error - The save error
   * @param {string} checkpointType - Type of checkpoint that failed
   */
  handleSaveError(error, checkpointType) {
    console.error(`Save error (${checkpointType}):`, error);
    
    // Try to clear old data if storage is full
    if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('Storage full')) {
      console.log('Storage quota exceeded, cleaning up old checkpoints');
      this.cleanupOldCheckpoints();
      
      // Retry save after cleanup
      setTimeout(() => {
        if (this.gameEngine?.getGameState) {
          this.saveCheckpoint(this.gameEngine.getGameState(), 'retry');
        }
      }, 1000);
    }
    
    // Notify game engine of save failure
    if (this.gameEngine?.notifyError) {
      this.gameEngine.notifyError('save_failed', {
        error: error.message,
        type: checkpointType,
        canRetry: true
      });
    }
  }

  /**
   * Serialize game state for storage
   * @param {Object} gameState - Game state to serialize
   * @returns {string} Serialized game state
   */
  serializeGameState(gameState) {
    try {
      // Create a clean copy without circular references
      const cleanState = this.removeCircularReferences(gameState);
      
      // Convert functions to string representations if needed
      const serializable = this.makeFunctionsSerializable(cleanState);
      
      return JSON.stringify(serializable);
    } catch (error) {
      console.error('Failed to serialize game state:', error);
      throw new Error('Game state serialization failed');
    }
  }

  /**
   * Deserialize game state from storage
   * @param {string} serializedState - Serialized game state
   * @returns {Object} Deserialized game state
   */
  deserializeGameState(serializedState) {
    try {
      const gameState = JSON.parse(serializedState);
      
      // Restore functions if needed
      const restored = this.restoreFunctions(gameState);
      
      // Validate required properties
      this.validateGameState(restored);
      
      return restored;
    } catch (error) {
      console.error('Failed to deserialize game state:', error);
      throw new Error('Game state deserialization failed');
    }
  }

  /**
   * Remove circular references from object
   * @param {Object} obj - Object to clean
   * @returns {Object} Clean object without circular references
   */
  removeCircularReferences(obj) {
    const seen = new WeakSet();
    
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }));
  }

  /**
   * Make functions serializable by converting to strings
   * @param {Object} obj - Object to process
   * @returns {Object} Object with serializable functions
   */
  makeFunctionsSerializable(obj) {
    // For this game, we typically don't need to serialize functions
    // Just remove them or convert to null
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'function') {
        return null;
      }
      return value;
    }));
  }

  /**
   * Restore functions from serialized state
   * @param {Object} obj - Object to restore
   * @returns {Object} Object with restored functions
   */
  restoreFunctions(obj) {
    // For this game, functions are typically recreated by the classes
    // This is a placeholder for more complex function restoration if needed
    return obj;
  }

  /**
   * Validate game state has required properties
   * @param {Object} gameState - Game state to validate
   * @throws {Error} If validation fails
   */
  validateGameState(gameState) {
    const requiredProperties = [
      'currentTime',
      'fearLevel',
      'health',
      'isAlive'
    ];
    
    for (const prop of requiredProperties) {
      if (!(prop in gameState)) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }
    
    // Validate property types and ranges
    if (typeof gameState.fearLevel !== 'number' || gameState.fearLevel < 0 || gameState.fearLevel > 100) {
      throw new Error('Invalid fear level');
    }
    
    if (typeof gameState.health !== 'number' || gameState.health < 0 || gameState.health > 100) {
      throw new Error('Invalid health value');
    }
    
    if (typeof gameState.isAlive !== 'boolean') {
      throw new Error('Invalid isAlive value');
    }
  }

  /**
   * Calculate checksum for data integrity
   * @param {string} data - Data to checksum
   * @returns {string} Checksum hash
   */
  calculateChecksum(data) {
    let hash = 0;
    if (data.length === 0) return hash.toString();
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Verify checkpoint integrity
   * @param {Object} checkpoint - Checkpoint to verify
   * @returns {boolean} True if checkpoint is valid
   */
  verifyCheckpoint(checkpoint) {
    try {
      // Check required properties
      if (!checkpoint.gameState || !checkpoint.metadata || !checkpoint.checksum) {
        console.warn('Checkpoint missing required properties');
        return false;
      }
      
      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(checkpoint.gameState);
      if (calculatedChecksum !== checkpoint.checksum) {
        console.warn('Checkpoint checksum mismatch');
        return false;
      }
      
      // Check age (reject checkpoints older than 24 hours)
      const age = Date.now() - checkpoint.metadata.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.warn('Checkpoint too old');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Checkpoint verification error:', error);
      return false;
    }
  }

  /**
   * Update checkpoint history
   * @param {Object} checkpoint - New checkpoint to add
   */
  async updateCheckpointHistory(checkpoint) {
    try {
      const historyKey = `${this.options.storageKey}-history`;
      let history = { checkpoints: [] };
      
      // Load existing history
      const existingHistory = localStorage.getItem(historyKey);
      if (existingHistory) {
        history = JSON.parse(existingHistory);
      }
      
      // Add new checkpoint
      history.checkpoints.push({
        ...checkpoint,
        metadata: { ...checkpoint.metadata }
      });
      
      // Keep only the most recent checkpoints
      if (history.checkpoints.length > this.options.maxCheckpoints) {
        history.checkpoints = history.checkpoints.slice(-this.options.maxCheckpoints);
      }
      
      // Save updated history
      localStorage.setItem(historyKey, JSON.stringify(history));
      
    } catch (error) {
      console.error('Failed to update checkpoint history:', error);
    }
  }

  /**
   * Clean up old checkpoints to free storage space
   */
  cleanupOldCheckpoints() {
    try {
      const historyKey = `${this.options.storageKey}-history`;
      const history = localStorage.getItem(historyKey);
      
      if (history) {
        const parsedHistory = JSON.parse(history);
        
        // Keep only the 3 most recent checkpoints
        parsedHistory.checkpoints = parsedHistory.checkpoints.slice(-3);
        
        localStorage.setItem(historyKey, JSON.stringify(parsedHistory));
        console.log('Cleaned up old checkpoints');
      }
      
      // Also clean up any other old game data
      this.cleanupOldGameData();
      
    } catch (error) {
      console.error('Failed to cleanup old checkpoints:', error);
    }
  }

  /**
   * Clean up other old game data
   */
  cleanupOldGameData() {
    try {
      const keysToCheck = [
        `${this.options.storageKey}-settings`,
        `${this.options.storageKey}-stats`,
        `${this.options.storageKey}-temp`
      ];
      
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`Removed old data: ${key}`);
        }
      });
      
    } catch (error) {
      console.error('Failed to cleanup old game data:', error);
    }
  }

  /**
   * Check if localStorage is available and functional
   * @returns {boolean} True if storage is available
   */
  checkStorageAvailability() {
    try {
      const testKey = `${this.options.storageKey}-test`;
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return false;
    }
  }

  /**
   * Get or create session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    const sessionKey = `${this.options.storageKey}-session`;
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem(sessionKey, sessionId);
    }
    
    return sessionId;
  }

  /**
   * Compress data using simple string compression
   * @param {string} data - Data to compress
   * @returns {string} Compressed data
   */
  compressData(data) {
    // Simple compression using repeated character replacement
    // In a real implementation, you might use a proper compression library
    return data
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .trim();
  }

  /**
   * Decompress data
   * @param {string} compressedData - Compressed data
   * @returns {string} Decompressed data
   */
  decompressData(compressedData) {
    // For simple compression, just return as-is
    // In a real implementation, this would reverse the compression
    return compressedData;
  }

  /**
   * Start automatic checkpoint saving
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      if (this.gameEngine?.getGameState && this.gameEngine.isGameActive?.()) {
        this.saveCheckpoint(this.gameEngine.getGameState(), 'auto');
      }
    }, this.options.autoSaveInterval);
    
    console.log(`Auto-save started (interval: ${this.options.autoSaveInterval}ms)`);
  }

  /**
   * Stop automatic checkpoint saving
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('Auto-save stopped');
    }
  }

  /**
   * Force save a critical checkpoint
   * @param {Object} gameState - Game state to save
   * @returns {Promise<boolean>} Success status
   */
  async saveCriticalCheckpoint(gameState = null) {
    return await this.saveCheckpoint(gameState, 'critical');
  }

  /**
   * Get checkpoint statistics
   * @returns {Object} Checkpoint statistics
   */
  getCheckpointStats() {
    try {
      const historyKey = `${this.options.storageKey}-history`;
      const history = localStorage.getItem(historyKey);
      
      if (!history) {
        return {
          totalCheckpoints: 0,
          lastSaveTime: this.lastSaveTime,
          storageAvailable: this.storageAvailable,
          autoSaveActive: !!this.autoSaveTimer
        };
      }
      
      const parsedHistory = JSON.parse(history);
      
      return {
        totalCheckpoints: parsedHistory.checkpoints.length,
        lastSaveTime: this.lastSaveTime,
        oldestCheckpoint: parsedHistory.checkpoints[0]?.metadata.timestamp || 0,
        newestCheckpoint: parsedHistory.checkpoints[parsedHistory.checkpoints.length - 1]?.metadata.timestamp || 0,
        storageAvailable: this.storageAvailable,
        autoSaveActive: !!this.autoSaveTimer,
        recoveryAttempts: this.recoveryAttempts
      };
      
    } catch (error) {
      console.error('Failed to get checkpoint stats:', error);
      return {
        totalCheckpoints: 0,
        lastSaveTime: this.lastSaveTime,
        storageAvailable: this.storageAvailable,
        autoSaveActive: !!this.autoSaveTimer,
        error: error.message
      };
    }
  }

  /**
   * Clear all checkpoints and history
   */
  clearAllCheckpoints() {
    try {
      const checkpointKey = `${this.options.storageKey}-checkpoint`;
      const historyKey = `${this.options.storageKey}-history`;
      
      localStorage.removeItem(checkpointKey);
      localStorage.removeItem(historyKey);
      
      this.lastSaveTime = 0;
      this.recoveryAttempts = 0;
      
      console.log('All checkpoints cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear checkpoints:', error);
      return false;
    }
  }

  /**
   * Cleanup and destroy the manager
   */
  destroy() {
    this.stopAutoSave();
    this.gameEngine = null;
    console.log('GameStateManager destroyed');
  }
}