/**
 * GameInitializer - Handles game startup sequence, system initialization, and integration
 * Manages audio initialization, permission requests, and system coordination
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

import { GameEngine } from './GameEngine.js';
import AudioManager from '../utils/AudioManager.js';
import { VoiceNarrator } from '../utils/VoiceNarrator.js';
import { GameStateManager } from '../utils/GameStateManager.js';
import BrowserCompatibility from '../utils/BrowserCompatibility.js';
import { VoiceErrorHandler } from '../utils/VoiceErrorHandler.js';
import AudioErrorHandler from '../utils/AudioErrorHandler.js';

export class GameInitializer {
  constructor(options = {}) {
    this.options = {
      enableAudio: options.enableAudio ?? true,
      enableVoice: options.enableVoice ?? true,
      enableCheckpoints: options.enableCheckpoints ?? true,
      autoStart: options.autoStart ?? false,
      showCompatibilityWarnings: options.showCompatibilityWarnings ?? true,
      requestPermissions: options.requestPermissions ?? true,
      ...options
    };

    // System instances
    this.gameEngine = null;
    this.audioManager = null;
    this.voiceNarrator = null;
    this.gameStateManager = null;
    this.browserCompatibility = null;
    this.voiceErrorHandler = null;
    this.audioErrorHandler = null;

    // Initialization state
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationSteps = [];
    this.currentStep = 0;
    this.initializationErrors = [];
    this.permissionsGranted = {
      microphone: false,
      notifications: false
    };

    // Event callbacks
    this.onInitializationProgress = options.onInitializationProgress || null;
    this.onInitializationComplete = options.onInitializationComplete || null;
    this.onInitializationError = options.onInitializationError || null;
    this.onGameReady = options.onGameReady || null;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.startGame = this.startGame.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Initialize all game systems in proper sequence
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized || this.isInitializing) {
      console.warn('GameInitializer already initialized or initializing');
      return this.isInitialized;
    }

    this.isInitializing = true;
    this.initializationErrors = [];

    console.log('Starting game initialization...');

    try {
      // Define initialization steps
      this.initializationSteps = [
        { name: 'Browser Compatibility Check', fn: this.checkBrowserCompatibility.bind(this) },
        { name: 'Request Permissions', fn: this.requestPermissions.bind(this) },
        { name: 'Initialize Audio System', fn: this.initializeAudioSystem.bind(this) },
        { name: 'Initialize Voice System', fn: this.initializeVoiceSystem.bind(this) },
        { name: 'Initialize Game Engine', fn: this.initializeGameEngine.bind(this) },
        { name: 'Initialize State Management', fn: this.initializeStateManagement.bind(this) },
        { name: 'Setup Error Handlers', fn: this.setupErrorHandlers.bind(this) },
        { name: 'Integrate Systems', fn: this.integrateSystems.bind(this) },
        { name: 'Load Checkpoint', fn: this.loadCheckpoint.bind(this) },
        { name: 'Final Setup', fn: this.finalSetup.bind(this) }
      ];

      // Execute initialization steps
      for (let i = 0; i < this.initializationSteps.length; i++) {
        this.currentStep = i;
        const step = this.initializationSteps[i];

        console.log(`Initialization step ${i + 1}/${this.initializationSteps.length}: ${step.name}`);
        
        // Notify progress
        if (this.onInitializationProgress) {
          this.onInitializationProgress({
            step: i + 1,
            total: this.initializationSteps.length,
            name: step.name,
            progress: ((i + 1) / this.initializationSteps.length) * 100
          });
        }

        try {
          const result = await step.fn();
          if (result === false) {
            throw new Error(`Step failed: ${step.name}`);
          }
        } catch (error) {
          console.error(`Initialization step failed: ${step.name}`, error);
          this.initializationErrors.push({
            step: step.name,
            error: error.message,
            critical: this.isStepCritical(step.name)
          });

          // Stop initialization if critical step fails
          if (this.isStepCritical(step.name)) {
            throw error;
          }
        }
      }

      this.isInitialized = true;
      this.isInitializing = false;

      console.log('Game initialization completed successfully');
      
      // Notify completion
      if (this.onInitializationComplete) {
        this.onInitializationComplete({
          success: true,
          errors: this.initializationErrors,
          systems: this.getSystemStatus()
        });
      }

      // Auto-start if enabled
      if (this.options.autoStart) {
        await this.startGame();
      }

      return true;

    } catch (error) {
      console.error('Game initialization failed:', error);
      this.isInitializing = false;
      
      if (this.onInitializationError) {
        this.onInitializationError({
          error: error.message,
          step: this.initializationSteps[this.currentStep]?.name || 'Unknown',
          errors: this.initializationErrors
        });
      }

      return false;
    }
  }

  /**
   * Check browser compatibility and show warnings if needed
   * @returns {Promise<boolean>} Success status
   */
  async checkBrowserCompatibility() {
    this.browserCompatibility = new BrowserCompatibility({
      showWarnings: this.options.showCompatibilityWarnings
    });

    const compatibilityResults = this.browserCompatibility.checkCompatibility();
    
    console.log('Browser compatibility check:', compatibilityResults.overall);

    // Show warnings for critical issues
    if (this.options.showCompatibilityWarnings) {
      compatibilityResults.errors.forEach(error => {
        if (error.severity === 'high') {
          this.browserCompatibility.showCompatibilityWarning(error);
        }
      });
    }

    // Fail initialization if browser is completely incompatible
    if (compatibilityResults.overall === 'incompatible') {
      throw new Error('Browser is not compatible with the game requirements');
    }

    return true;
  }

  /**
   * Request necessary permissions from the user
   * @returns {Promise<boolean>} Success status
   */
  async requestPermissions() {
    if (!this.options.requestPermissions) {
      return true;
    }

    const permissions = [];

    // Request microphone permission for voice commands
    if (this.options.enableVoice) {
      permissions.push(this.requestMicrophonePermission());
    }

    // Request notification permission (optional)
    permissions.push(this.requestNotificationPermission());

    const results = await Promise.allSettled(permissions);
    
    // Log permission results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Permission ${index} granted:`, result.value);
      } else {
        console.warn(`Permission ${index} failed:`, result.reason);
      }
    });

    return true; // Don't fail initialization if permissions are denied
  }

  /**
   * Request microphone permission
   * @returns {Promise<boolean>} Permission granted status
   */
  async requestMicrophonePermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported');
        return false;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      this.permissionsGranted.microphone = true;
      console.log('Microphone permission granted');
      return true;

    } catch (error) {
      console.warn('Microphone permission denied:', error.message);
      this.permissionsGranted.microphone = false;
      return false;
    }
  }

  /**
   * Request notification permission (optional)
   * @returns {Promise<boolean>} Permission granted status
   */
  async requestNotificationPermission() {
    try {
      if (!window.Notification) {
        return false;
      }

      if (Notification.permission === 'granted') {
        this.permissionsGranted.notifications = true;
        return true;
      }

      if (Notification.permission === 'denied') {
        return false;
      }

      const permission = await Notification.requestPermission();
      this.permissionsGranted.notifications = permission === 'granted';
      
      return this.permissionsGranted.notifications;

    } catch (error) {
      console.warn('Notification permission request failed:', error);
      return false;
    }
  }

  /**
   * Initialize audio system
   * @returns {Promise<boolean>} Success status
   */
  async initializeAudioSystem() {
    if (!this.options.enableAudio) {
      console.log('Audio system disabled by options');
      return true;
    }

    try {
      this.audioManager = new AudioManager();
      
      // Set up audio error handler
      const audioErrorHandler = (errorType, error, context) => {
        this.handleError('audio', error, { errorType, context });
      };

      const success = await this.audioManager.initialize(audioErrorHandler);
      
      if (!success) {
        console.warn('Audio system initialization failed, continuing without audio');
        this.audioManager = null;
        return true; // Don't fail initialization
      }

      console.log('Audio system initialized successfully');
      return true;

    } catch (error) {
      console.error('Audio system initialization error:', error);
      this.audioManager = null;
      return true; // Don't fail initialization for audio issues
    }
  }

  /**
   * Initialize voice system
   * @returns {Promise<boolean>} Success status
   */
  async initializeVoiceSystem() {
    if (!this.options.enableVoice) {
      console.log('Voice system disabled by options');
      return true;
    }

    try {
      this.voiceNarrator = new VoiceNarrator({
        onNarrationStart: (item) => {
          console.log('Narration started:', item.text);
        },
        onNarrationEnd: (item) => {
          console.log('Narration ended');
        },
        onNarrationError: (error, item) => {
          this.handleError('voice', error, { item });
        }
      });

      // Test voice synthesis
      if (this.voiceNarrator.isSupported) {
        console.log('Voice system initialized successfully');
      } else {
        console.warn('Voice synthesis not supported, continuing without voice narration');
      }

      return true;

    } catch (error) {
      console.error('Voice system initialization error:', error);
      this.voiceNarrator = null;
      return true; // Don't fail initialization for voice issues
    }
  }

  /**
   * Initialize game engine
   * @returns {Promise<boolean>} Success status
   */
  async initializeGameEngine() {
    try {
      this.gameEngine = new GameEngine(
        this.audioManager,
        null, // VoiceController will be set up later
        this.voiceNarrator
      );

      console.log('Game engine initialized successfully');
      return true;

    } catch (error) {
      console.error('Game engine initialization failed:', error);
      throw error; // This is critical
    }
  }

  /**
   * Initialize state management system
   * @returns {Promise<boolean>} Success status
   */
  async initializeStateManagement() {
    if (!this.options.enableCheckpoints) {
      console.log('Checkpoint system disabled by options');
      return true;
    }

    try {
      this.gameStateManager = new GameStateManager(this.gameEngine, {
        autoSaveInterval: 30000, // 30 seconds
        maxCheckpoints: 10,
        storageKey: 'survive-until-sunrise'
      });

      console.log('State management system initialized successfully');
      return true;

    } catch (error) {
      console.error('State management initialization error:', error);
      this.gameStateManager = null;
      return true; // Don't fail initialization
    }
  }

  /**
   * Setup error handlers
   * @returns {Promise<boolean>} Success status
   */
  async setupErrorHandlers() {
    try {
      // Voice error handler
      if (this.voiceNarrator) {
        this.voiceErrorHandler = new VoiceErrorHandler(this.voiceNarrator);
      }

      // Audio error handler
      if (this.audioManager) {
        this.audioErrorHandler = new AudioErrorHandler(this.audioManager);
      }

      console.log('Error handlers setup successfully');
      return true;

    } catch (error) {
      console.error('Error handler setup failed:', error);
      return true; // Don't fail initialization
    }
  }

  /**
   * Integrate all systems together
   * @returns {Promise<boolean>} Success status
   */
  async integrateSystems() {
    try {
      // Set up game engine callbacks for audio updates
      if (this.gameEngine && this.audioManager) {
        this.gameEngine.onUpdate((deltaTime, gameState) => {
          this.audioManager.updateAudioForGameState(gameState);
        });
      }

      // Set up game engine callbacks for voice narration
      if (this.gameEngine && this.voiceNarrator) {
        // Register command handlers for voice feedback
        this.gameEngine.registerCommandHandler('hide', (command, gameState) => {
          this.voiceNarrator.provideCommandFeedback(
            { action: 'hide' }, 
            true, 
            gameState
          );
          return false; // Let other handlers process too
        });

        this.gameEngine.registerCommandHandler('run', (command, gameState) => {
          this.voiceNarrator.provideCommandFeedback(
            { action: 'run' }, 
            true, 
            gameState
          );
          return false;
        });

        this.gameEngine.registerCommandHandler('open', (command, gameState) => {
          this.voiceNarrator.provideCommandFeedback(
            { action: 'open' }, 
            true, 
            gameState
          );
          return false;
        });

        this.gameEngine.registerCommandHandler('flashlight', (command, gameState) => {
          this.voiceNarrator.provideCommandFeedback(
            { action: 'flashlight' }, 
            true, 
            gameState
          );
          return false;
        });
      }

      // Set up automatic checkpointing
      if (this.gameEngine && this.gameStateManager) {
        this.gameEngine.onUpdate((deltaTime, gameState) => {
          // Save checkpoint on significant events
          if (gameState.eventsTriggered && gameState.eventsTriggered.length > 0) {
            const lastEvent = gameState.eventsTriggered[gameState.eventsTriggered.length - 1];
            if (lastEvent && !this.gameStateManager.lastSaveTime || 
                Date.now() - this.gameStateManager.lastSaveTime > 60000) { // 1 minute
              this.gameStateManager.saveCheckpoint(gameState, 'auto');
            }
          }
        });
      }

      console.log('Systems integrated successfully');
      return true;

    } catch (error) {
      console.error('System integration failed:', error);
      return true; // Don't fail initialization
    }
  }

  /**
   * Load checkpoint if available
   * @returns {Promise<boolean>} Success status
   */
  async loadCheckpoint() {
    if (!this.gameStateManager || !this.gameEngine) {
      return true;
    }

    try {
      const checkpoint = await this.gameStateManager.loadCheckpoint();
      
      if (checkpoint) {
        // Restore game state from checkpoint
        const gameState = this.gameEngine.getGameState();
        Object.assign(gameState, checkpoint);
        
        console.log('Checkpoint loaded successfully:', {
          gameTime: checkpoint.currentTime,
          fearLevel: checkpoint.fearLevel,
          health: checkpoint.health
        });

        // Narrate checkpoint recovery
        if (this.voiceNarrator) {
          this.voiceNarrator.narrate(
            "Game progress restored. Continuing from where you left off.",
            { priority: 'normal', context: 'checkpoint-recovery' }
          );
        }
      } else {
        console.log('No checkpoint found, starting fresh game');
      }

      return true;

    } catch (error) {
      console.error('Checkpoint loading failed:', error);
      return true; // Don't fail initialization
    }
  }

  /**
   * Final setup and validation
   * @returns {Promise<boolean>} Success status
   */
  async finalSetup() {
    try {
      // Validate all systems are ready
      const systemStatus = this.getSystemStatus();
      console.log('System status:', systemStatus);

      // Set up global error handling
      window.addEventListener('error', (event) => {
        this.handleError('global', event.error, { 
          filename: event.filename, 
          lineno: event.lineno 
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handleError('promise', event.reason, { 
          type: 'unhandled-rejection' 
        });
      });

      console.log('Final setup completed successfully');
      return true;

    } catch (error) {
      console.error('Final setup failed:', error);
      return true; // Don't fail initialization
    }
  }

  /**
   * Start the game after initialization
   * @returns {Promise<boolean>} Success status
   */
  async startGame() {
    if (!this.isInitialized) {
      console.error('Cannot start game - initialization not complete');
      return false;
    }

    if (!this.gameEngine) {
      console.error('Cannot start game - game engine not available');
      return false;
    }

    try {
      // Start audio system
      if (this.audioManager) {
        this.audioManager.playAmbient('forest_night', { fadeIn: 3000 });
      }

      // Start game engine
      this.gameEngine.start();

      // Provide game start narration
      if (this.voiceNarrator) {
        this.voiceNarrator.narrateGameStart();
      }

      // Save initial checkpoint
      if (this.gameStateManager) {
        await this.gameStateManager.saveCheckpoint(
          this.gameEngine.getGameState(), 
          'game-start'
        );
      }

      console.log('Game started successfully');

      // Notify game ready
      if (this.onGameReady) {
        this.onGameReady({
          gameEngine: this.gameEngine,
          audioManager: this.audioManager,
          voiceNarrator: this.voiceNarrator,
          gameStateManager: this.gameStateManager,
          systemStatus: this.getSystemStatus()
        });
      }

      return true;

    } catch (error) {
      console.error('Game start failed:', error);
      this.handleError('game-start', error);
      return false;
    }
  }

  /**
   * Handle errors with appropriate fallback strategies
   * @param {string} system - System that generated the error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  handleError(system, error, context = {}) {
    console.error(`${system} error:`, error, context);

    // Use specific error handlers if available
    switch (system) {
      case 'voice':
        if (this.voiceErrorHandler) {
          this.voiceErrorHandler.handleError(error, context);
        }
        break;
      case 'audio':
        if (this.audioErrorHandler) {
          this.audioErrorHandler.handleError(error, context);
        }
        break;
      case 'game-engine':
        // Try to recover game state
        if (this.gameStateManager) {
          this.gameStateManager.recoverFromError();
        }
        break;
    }

    // Log error for debugging
    const errorLog = {
      system,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    };

    // Store error log in localStorage for debugging
    try {
      const errorLogs = JSON.parse(localStorage.getItem('game-error-logs') || '[]');
      errorLogs.push(errorLog);
      
      // Keep only last 10 errors
      if (errorLogs.length > 10) {
        errorLogs.splice(0, errorLogs.length - 10);
      }
      
      localStorage.setItem('game-error-logs', JSON.stringify(errorLogs));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  }

  /**
   * Check if an initialization step is critical
   * @param {string} stepName - Name of the step
   * @returns {boolean} True if step is critical
   */
  isStepCritical(stepName) {
    const criticalSteps = [
      'Browser Compatibility Check',
      'Initialize Game Engine'
    ];
    
    return criticalSteps.includes(stepName);
  }

  /**
   * Get status of all systems
   * @returns {Object} System status information
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      gameEngine: !!this.gameEngine,
      audioManager: !!this.audioManager && this.audioManager.isInitialized,
      voiceNarrator: !!this.voiceNarrator && this.voiceNarrator.isSupported,
      gameStateManager: !!this.gameStateManager && this.gameStateManager.storageAvailable,
      browserCompatibility: !!this.browserCompatibility,
      permissions: { ...this.permissionsGranted },
      errors: this.initializationErrors.length
    };
  }

  /**
   * Get initialization progress
   * @returns {Object} Progress information
   */
  getInitializationProgress() {
    return {
      isInitializing: this.isInitializing,
      isInitialized: this.isInitialized,
      currentStep: this.currentStep + 1,
      totalSteps: this.initializationSteps.length,
      stepName: this.initializationSteps[this.currentStep]?.name || 'Complete',
      progress: this.initializationSteps.length > 0 ? 
        ((this.currentStep + 1) / this.initializationSteps.length) * 100 : 0,
      errors: this.initializationErrors
    };
  }

  /**
   * Restart the game
   * @returns {Promise<boolean>} Success status
   */
  async restartGame() {
    try {
      if (this.gameEngine) {
        await this.gameEngine.restartGame();
      }

      // Clear checkpoint
      if (this.gameStateManager) {
        this.gameStateManager.clearAllCheckpoints();
      }

      // Restart audio
      if (this.audioManager) {
        this.audioManager.stopAmbient();
        this.audioManager.playAmbient('forest_night', { fadeIn: 2000 });
      }

      // Restart narration
      if (this.voiceNarrator) {
        this.voiceNarrator.clearQueue();
        this.voiceNarrator.narrateGameStart();
      }

      console.log('Game restarted successfully');
      return true;

    } catch (error) {
      console.error('Game restart failed:', error);
      this.handleError('game-restart', error);
      return false;
    }
  }

  /**
   * Cleanup and destroy all systems
   */
  destroy() {
    console.log('Destroying GameInitializer...');

    // Stop game engine
    if (this.gameEngine) {
      this.gameEngine.stop();
    }

    // Cleanup audio
    if (this.audioManager) {
      this.audioManager.destroy();
    }

    // Cleanup voice
    if (this.voiceNarrator) {
      this.voiceNarrator.clearQueue();
    }

    // Cleanup state manager
    if (this.gameStateManager) {
      this.gameStateManager.destroy();
    }

    // Reset state
    this.isInitialized = false;
    this.isInitializing = false;
    this.gameEngine = null;
    this.audioManager = null;
    this.voiceNarrator = null;
    this.gameStateManager = null;

    console.log('GameInitializer destroyed');
  }
}

export default GameInitializer;