# Design Document

## Overview

"Survive Until Sunrise" is architected as a client-side React/Next.js application with real-time voice interaction, dynamic audio management, and optional AI-powered backend integration. The game uses a component-based architecture with centralized state management for game logic, audio systems, and voice processing.

The core design philosophy emphasizes immersion through seamless voice interaction, atmospheric audio layering, and responsive game state management that adapts to player behavior and fear levels.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[Next.js Frontend] --> B[Voice Controller]
    A --> C[Audio Manager]
    A --> D[Game State Manager]
    A --> E[Event System]
    A --> F[UI Components]
    
    B --> G[Web Speech API]
    B --> H[SpeechSynthesis API]
    
    C --> I[Howler.js Audio Engine]
    
    D --> J[Timer System]
    D --> K[Fear/Health System]
    D --> L[Inventory System]
    
    E --> M[Random Event Generator]
    E --> N[FastAPI Backend (Optional)]
    
    F --> O[HUD Components]
    F --> P[Game Canvas/Scene]
```

### System Architecture Layers

1. **Presentation Layer**: React components for UI, HUD, and visual feedback
2. **Game Logic Layer**: State management, event processing, and game rules
3. **Audio Layer**: Howler.js integration for ambient, effects, and voice synthesis
4. **Voice Layer**: Web Speech API integration for input/output
5. **Backend Layer**: Optional FastAPI for AI-driven events and analytics

## Components and Interfaces

### Core Game Components

#### GameEngine
```javascript
class GameEngine {
  constructor() {
    this.gameState = new GameState();
    this.audioManager = new AudioManager();
    this.voiceController = new VoiceController();
    this.eventSystem = new EventSystem();
    this.timer = new GameTimer();
  }
  
  // Core game loop and state management
  update(deltaTime) { /* ... */ }
  handleCommand(command) { /* ... */ }
  triggerEvent(eventData) { /* ... */ }
}
```

#### GameState
```javascript
class GameState {
  constructor() {
    this.currentTime = "23:00"; // 11:00 PM start
    this.fearLevel = 0;
    this.health = 100;
    this.inventory = [];
    this.location = "starting_room";
    this.isAlive = true;
    this.gameStarted = false;
  }
  
  // State mutation methods
  updateFear(delta) { /* ... */ }
  updateHealth(delta) { /* ... */ }
  addToInventory(item) { /* ... */ }
}
```

#### VoiceController
```javascript
class VoiceController {
  constructor(onCommand, onError) {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.commandQueue = [];
  }
  
  // Voice input/output methods
  startListening() { /* ... */ }
  stopListening() { /* ... */ }
  speak(text, options = {}) { /* ... */ }
  processCommand(transcript) { /* ... */ }
}
```

#### AudioManager
```javascript
class AudioManager {
  constructor() {
    this.ambientSounds = new Map();
    this.effectSounds = new Map();
    this.currentAmbient = null;
    this.masterVolume = 1.0;
  }
  
  // Audio management methods
  loadSounds() { /* ... */ }
  playAmbient(soundKey, options = {}) { /* ... */ }
  playEffect(soundKey, options = {}) { /* ... */ }
  adjustVolume(category, volume) { /* ... */ }
}
```

#### EventSystem
```javascript
class EventSystem {
  constructor(gameState, audioManager, voiceController) {
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.voiceController = voiceController;
    this.eventQueue = [];
    this.eventHistory = [];
  }
  
  // Event management methods
  generateRandomEvent() { /* ... */ }
  processEvent(event) { /* ... */ }
  evaluatePlayerResponse(command, event) { /* ... */ }
}
```

### UI Components

#### HUD Component Structure
```javascript
// HUD.jsx - Main heads-up display
const HUD = ({ gameState, onCommand }) => {
  return (
    <div className="hud-container">
      <Timer currentTime={gameState.currentTime} />
      <FearMeter level={gameState.fearLevel} />
      <HealthBar health={gameState.health} />
      <Inventory items={gameState.inventory} />
      <VoiceIndicator isListening={gameState.isListening} />
    </div>
  );
};

// Timer.jsx - Game time display
const Timer = ({ currentTime }) => {
  return (
    <div className="timer-display">
      <span className="time-text">{currentTime}</span>
      <span className="sunrise-countdown">Until Sunrise</span>
    </div>
  );
};

// FearMeter.jsx - Visual fear level indicator
const FearMeter = ({ level }) => {
  return (
    <div className="fear-meter">
      <div className="fear-bar" style={{ width: `${level}%` }} />
      <div className="fear-pulse" style={{ opacity: level / 100 }} />
    </div>
  );
};
```

### Voice Command Processing

#### Command Parser
```javascript
class CommandParser {
  constructor() {
    this.commandMap = new Map([
      ['hide', { action: 'hide', aliases: ['duck', 'crouch', 'take cover'] }],
      ['run', { action: 'run', aliases: ['flee', 'escape', 'go'] }],
      ['open', { action: 'open', aliases: ['unlock', 'enter'] }],
      ['flashlight', { action: 'flashlight', aliases: ['light', 'torch'] }],
      ['listen', { action: 'listen', aliases: ['hear', 'check'] }]
    ]);
  }
  
  parseCommand(transcript) {
    const normalized = transcript.toLowerCase().trim();
    
    // Direct command matching
    for (const [command, config] of this.commandMap) {
      if (normalized.includes(command) || 
          config.aliases.some(alias => normalized.includes(alias))) {
        return {
          action: config.action,
          confidence: this.calculateConfidence(normalized, command, config.aliases),
          originalText: transcript
        };
      }
    }
    
    return { action: 'unknown', confidence: 0, originalText: transcript };
  }
}
```

## Data Models

### Game State Schema
```javascript
const GameStateSchema = {
  // Time and progression
  currentTime: String, // "HH:MM" format
  gameStartTime: Date,
  realTimeElapsed: Number, // milliseconds
  
  // Player status
  fearLevel: Number, // 0-100
  health: Number, // 0-100
  isAlive: Boolean,
  location: String,
  
  // Inventory and items
  inventory: [{
    id: String,
    name: String,
    type: String, // 'tool', 'key', 'consumable'
    durability: Number, // for items like flashlight
    isActive: Boolean
  }],
  
  // Game progression
  eventsTriggered: [String], // event IDs
  commandsIssued: [String], // command history
  survivalScore: Number,
  
  // Audio state
  currentAmbient: String,
  audioVolume: {
    master: Number,
    ambient: Number,
    effects: Number,
    voice: Number
  }
};
```

### Event Schema
```javascript
const EventSchema = {
  id: String,
  type: String, // 'ambient', 'threat', 'discovery', 'choice'
  trigger: {
    timeRange: [String, String], // ["23:30", "02:00"]
    fearThreshold: Number,
    locationRequired: String,
    probability: Number // 0-1
  },
  content: {
    narration: String,
    audioFile: String,
    visualEffect: String,
    duration: Number // milliseconds
  },
  responses: [{
    command: String,
    outcome: {
      fearDelta: Number,
      healthDelta: Number,
      narration: String,
      nextEvent: String // optional chaining
    }
  }],
  consequences: {
    success: Object,
    failure: Object,
    timeout: Object
  }
};
```

### Audio Asset Schema
```javascript
const AudioAssetSchema = {
  ambient: {
    forest_night: { src: '/sounds/forest-ambient.mp3', loop: true, volume: 0.3 },
    house_creaks: { src: '/sounds/house-creaks.mp3', loop: true, volume: 0.4 },
    basement_drip: { src: '/sounds/basement-drip.mp3', loop: true, volume: 0.2 }
  },
  effects: {
    footsteps: { src: '/sounds/footsteps.mp3', volume: 0.6 },
    door_creak: { src: '/sounds/door-creak.mp3', volume: 0.7 },
    jump_scare: { src: '/sounds/jump-scare.mp3', volume: 1.0 },
    whisper: { src: '/sounds/whisper.mp3', volume: 0.5 },
    heartbeat: { src: '/sounds/heartbeat.mp3', volume: 0.8 }
  },
  voice: {
    rate: 0.8, // slower for dramatic effect
    pitch: 0.9, // slightly lower pitch
    volume: 0.9
  }
};
```

## Error Handling

### Voice Recognition Error Handling
```javascript
class VoiceErrorHandler {
  handleRecognitionError(error) {
    switch (error.error) {
      case 'no-speech':
        this.voiceController.speak("I didn't hear anything. Try speaking again.");
        break;
      case 'audio-capture':
        this.showError("Microphone access required. Please enable microphone.");
        break;
      case 'not-allowed':
        this.showError("Microphone permission denied. Please allow microphone access.");
        break;
      case 'network':
        this.fallbackToTextInput();
        break;
      default:
        this.voiceController.speak("Sorry, I didn't understand. Please try again.");
    }
  }
  
  fallbackToTextInput() {
    // Provide text input as backup when voice fails
    this.gameEngine.enableTextInput();
  }
}
```

### Audio Error Handling
```javascript
class AudioErrorHandler {
  handleAudioError(error, audioType) {
    console.error(`Audio error (${audioType}):`, error);
    
    switch (audioType) {
      case 'ambient':
        // Continue game without ambient sound
        this.gameEngine.notifyAudioIssue('Ambient audio unavailable');
        break;
      case 'effects':
        // Use visual cues instead of audio effects
        this.gameEngine.enableVisualEffects();
        break;
      case 'voice':
        // Fall back to text display
        this.gameEngine.enableTextNarration();
        break;
    }
  }
}
```

### Game State Error Recovery
```javascript
class GameStateManager {
  saveCheckpoint() {
    const checkpoint = {
      gameState: this.gameState.serialize(),
      timestamp: Date.now()
    };
    localStorage.setItem('survive-checkpoint', JSON.stringify(checkpoint));
  }
  
  recoverFromError() {
    try {
      const checkpoint = localStorage.getItem('survive-checkpoint');
      if (checkpoint) {
        const data = JSON.parse(checkpoint);
        this.gameState.deserialize(data.gameState);
        return true;
      }
    } catch (error) {
      console.error('Failed to recover from checkpoint:', error);
    }
    return false;
  }
}
```

## Testing Strategy

### Unit Testing Approach
```javascript
// Voice Controller Tests
describe('VoiceController', () => {
  test('should parse basic commands correctly', () => {
    const parser = new CommandParser();
    expect(parser.parseCommand('hide')).toEqual({
      action: 'hide',
      confidence: expect.any(Number),
      originalText: 'hide'
    });
  });
  
  test('should handle command aliases', () => {
    const parser = new CommandParser();
    expect(parser.parseCommand('take cover')).toEqual({
      action: 'hide',
      confidence: expect.any(Number),
      originalText: 'take cover'
    });
  });
});

// Game State Tests
describe('GameState', () => {
  test('should update fear level within bounds', () => {
    const gameState = new GameState();
    gameState.updateFear(150); // Over maximum
    expect(gameState.fearLevel).toBe(100);
    
    gameState.updateFear(-150); // Under minimum
    expect(gameState.fearLevel).toBe(0);
  });
});

// Audio Manager Tests
describe('AudioManager', () => {
  test('should load and play ambient sounds', async () => {
    const audioManager = new AudioManager();
    await audioManager.loadSounds();
    
    const playResult = audioManager.playAmbient('forest_night');
    expect(playResult).toBe(true);
  });
});
```

### Integration Testing
```javascript
// End-to-End Game Flow Tests
describe('Game Integration', () => {
  test('should complete full game cycle', async () => {
    const gameEngine = new GameEngine();
    
    // Start game
    gameEngine.startGame();
    expect(gameEngine.gameState.gameStarted).toBe(true);
    
    // Process voice command
    await gameEngine.handleCommand('hide');
    expect(gameEngine.gameState.commandsIssued).toContain('hide');
    
    // Trigger event
    const event = gameEngine.eventSystem.generateRandomEvent();
    gameEngine.triggerEvent(event);
    expect(gameEngine.gameState.eventsTriggered).toContain(event.id);
    
    // Complete game
    gameEngine.gameState.currentTime = "06:00";
    gameEngine.checkWinCondition();
    expect(gameEngine.gameState.isAlive).toBe(true);
  });
});
```

### Performance Testing
```javascript
// Audio Performance Tests
describe('Audio Performance', () => {
  test('should maintain stable audio during gameplay', () => {
    const audioManager = new AudioManager();
    const startTime = performance.now();
    
    // Simulate intensive audio usage
    for (let i = 0; i < 100; i++) {
      audioManager.playEffect('footsteps');
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});

// Voice Recognition Performance
describe('Voice Performance', () => {
  test('should process commands within acceptable time', async () => {
    const voiceController = new VoiceController();
    const startTime = performance.now();
    
    const result = await voiceController.processCommand('hide behind the door');
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(500); // Should process in under 500ms
    expect(result.action).toBeDefined();
  });
});
```

### Browser Compatibility Testing
```javascript
// Feature Detection Tests
describe('Browser Compatibility', () => {
  test('should detect required APIs', () => {
    const features = {
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      speechSynthesis: !!window.speechSynthesis,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      mediaDevices: !!navigator.mediaDevices
    };
    
    // Log missing features for debugging
    Object.entries(features).forEach(([feature, supported]) => {
      if (!supported) {
        console.warn(`${feature} not supported in this browser`);
      }
    });
    
    // Game should still be playable with fallbacks
    expect(features.speechSynthesis || features.audioContext).toBe(true);
  });
});
```

This design provides a robust foundation for implementing the "Survive Until Sunrise" horror game with proper separation of concerns, error handling, and comprehensive testing strategies.