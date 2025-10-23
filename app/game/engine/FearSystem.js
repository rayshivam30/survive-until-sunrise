/**
 * FearSystem - Manages dynamic fear level calculation and fear-based mechanics
 * Handles fear events, decay, and action success rate modifications
 */

export class FearSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.fearDecayRate = 0.1; // Fear points per second when no events
    this.fearEvents = new Map(); // Track active fear events
    this.fearModifiers = new Map(); // Temporary fear modifiers
    this.lastFearLevel = 0;
    this.fearChangeCallbacks = new Set();
    
    // Fear event types and their base values
    this.fearEventTypes = {
      ambient: { base: 5, duration: 3000, decay: 2 },
      jump_scare: { base: 25, duration: 1000, decay: 5 },
      whisper: { base: 15, duration: 5000, decay: 3 },
      footsteps: { base: 10, duration: 4000, decay: 2 },
      door_slam: { base: 20, duration: 2000, decay: 4 },
      supernatural: { base: 30, duration: 8000, decay: 6 },
      darkness: { base: 8, duration: 10000, decay: 1 },
      isolation: { base: 12, duration: 15000, decay: 2 }
    };

    // Fear thresholds for different states
    this.fearThresholds = {
      calm: 0,
      nervous: 20,
      scared: 40,
      terrified: 60,
      panicked: 80,
      overwhelmed: 95
    };

    this.currentFearState = 'calm';
  }

  /**
   * Update fear system - called each frame
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    
    // Process active fear events
    this.processFearEvents(deltaTime);
    
    // Apply natural fear decay
    this.applyFearDecay(deltaSeconds);
    
    // Update fear state and check for changes
    this.updateFearState();
    
    // Apply fear-based modifiers
    this.applyFearModifiers();
  }

  /**
   * Trigger a fear event
   * @param {string} eventType - Type of fear event
   * @param {Object} options - Additional options {intensity?, duration?, source?}
   */
  triggerFearEvent(eventType, options = {}) {
    const eventConfig = this.fearEventTypes[eventType];
    if (!eventConfig) {
      console.warn(`Unknown fear event type: ${eventType}`);
      return;
    }

    const intensity = options.intensity || 1.0;
    const duration = options.duration || eventConfig.duration;
    const source = options.source || 'unknown';

    const fearEvent = {
      id: `${eventType}_${Date.now()}`,
      type: eventType,
      intensity: intensity,
      baseFear: eventConfig.base * intensity,
      duration: duration,
      decay: eventConfig.decay,
      startTime: Date.now(),
      source: source,
      isActive: true
    };

    this.fearEvents.set(fearEvent.id, fearEvent);

    // Immediately apply base fear
    const fearIncrease = this.calculateFearIncrease(fearEvent);
    this.gameState.updateFear(fearIncrease);

    console.log(`Fear event triggered: ${eventType} (${fearIncrease.toFixed(1)} fear)`);

    // Notify callbacks
    this.notifyFearChange('event', fearEvent);
  }

  /**
   * Process all active fear events
   * @param {number} deltaTime - Time elapsed in milliseconds
   */
  processFearEvents(deltaTime) {
    const currentTime = Date.now();
    const eventsToRemove = [];

    for (const [eventId, fearEvent] of this.fearEvents) {
      const elapsed = currentTime - fearEvent.startTime;
      
      if (elapsed >= fearEvent.duration) {
        // Event has expired
        eventsToRemove.push(eventId);
        continue;
      }

      // Apply ongoing fear effects for long-duration events
      if (fearEvent.duration > 5000) { // Only for events longer than 5 seconds
        const ongoingFear = (fearEvent.baseFear * 0.1) * (deltaTime / 1000);
        this.gameState.updateFear(ongoingFear);
      }
    }

    // Remove expired events
    eventsToRemove.forEach(eventId => {
      this.fearEvents.delete(eventId);
    });
  }

  /**
   * Apply natural fear decay over time
   * @param {number} deltaSeconds - Time elapsed in seconds
   */
  applyFearDecay(deltaSeconds) {
    if (this.gameState.fearLevel > 0 && this.fearEvents.size === 0) {
      // Only decay when no active fear events
      const decayAmount = this.fearDecayRate * deltaSeconds;
      const adjustedDecay = this.calculateDecayRate(decayAmount);
      this.gameState.updateFear(-adjustedDecay);
    }
  }

  /**
   * Calculate fear increase based on current state and event
   * @param {Object} fearEvent - The fear event to process
   * @returns {number} - Amount of fear to add
   */
  calculateFearIncrease(fearEvent) {
    let fearIncrease = fearEvent.baseFear;

    // Apply location-based modifiers
    const locationModifier = this.getLocationFearModifier();
    fearIncrease *= locationModifier;

    // Apply time-based modifiers (more scary at night)
    const timeModifier = this.getTimeFearModifier();
    fearIncrease *= timeModifier;

    // Apply current fear state modifier (compound fear)
    const stateModifier = this.getFearStateModifier();
    fearIncrease *= stateModifier;

    // Apply health-based modifier (lower health = more susceptible to fear)
    const healthModifier = this.getHealthFearModifier();
    fearIncrease *= healthModifier;

    return fearIncrease;
  }

  /**
   * Calculate fear decay rate based on current conditions
   * @param {number} baseDecay - Base decay amount
   * @returns {number} - Adjusted decay amount
   */
  calculateDecayRate(baseDecay) {
    let adjustedDecay = baseDecay;

    // Slower decay when health is low
    if (this.gameState.health < 50) {
      adjustedDecay *= 0.5;
    }

    // Faster decay in safe locations
    if (this.gameState.location === 'safe_room') {
      adjustedDecay *= 2.0;
    }

    // Slower decay during witching hours
    const currentHour = parseInt(this.gameState.currentTime.split(':')[0]);
    if (currentHour >= 2 && currentHour <= 4) {
      adjustedDecay *= 0.3;
    }

    return adjustedDecay;
  }

  /**
   * Get location-based fear modifier
   * @returns {number} - Multiplier for fear events
   */
  getLocationFearModifier() {
    const locationModifiers = {
      'starting_room': 1.0,
      'basement': 1.5,
      'attic': 1.3,
      'bathroom': 1.2,
      'kitchen': 0.9,
      'safe_room': 0.5,
      'outside': 1.4,
      'dark_hallway': 1.6
    };

    return locationModifiers[this.gameState.location] || 1.0;
  }

  /**
   * Get time-based fear modifier
   * @returns {number} - Multiplier for fear events
   */
  getTimeFearModifier() {
    const currentHour = parseInt(this.gameState.currentTime.split(':')[0]);
    
    // Fear is highest during witching hours (2-4 AM)
    if (currentHour >= 2 && currentHour <= 4) {
      return 1.5;
    }
    
    // Moderate fear during deep night
    if (currentHour >= 0 && currentHour <= 1 || currentHour === 23) {
      return 1.2;
    }
    
    // Lower fear as dawn approaches
    if (currentHour >= 5) {
      return 0.7;
    }
    
    return 1.0;
  }

  /**
   * Get fear state modifier (compound fear effect)
   * @returns {number} - Multiplier for fear events
   */
  getFearStateModifier() {
    if (this.gameState.fearLevel >= 80) {
      return 1.3; // Panic state - more susceptible
    } else if (this.gameState.fearLevel >= 60) {
      return 1.2; // Terrified state
    } else if (this.gameState.fearLevel >= 40) {
      return 1.1; // Scared state
    } else if (this.gameState.fearLevel <= 10) {
      return 0.8; // Calm state - more resistant
    }
    
    return 1.0;
  }

  /**
   * Get health-based fear modifier
   * @returns {number} - Multiplier for fear events
   */
  getHealthFearModifier() {
    const healthRatio = this.gameState.health / 100;
    
    // Lower health makes you more susceptible to fear
    return 1.0 + (0.5 * (1 - healthRatio));
  }

  /**
   * Update current fear state based on fear level
   */
  updateFearState() {
    const previousState = this.currentFearState;
    const fearLevel = this.gameState.fearLevel;

    if (fearLevel >= this.fearThresholds.overwhelmed) {
      this.currentFearState = 'overwhelmed';
    } else if (fearLevel >= this.fearThresholds.panicked) {
      this.currentFearState = 'panicked';
    } else if (fearLevel >= this.fearThresholds.terrified) {
      this.currentFearState = 'terrified';
    } else if (fearLevel >= this.fearThresholds.scared) {
      this.currentFearState = 'scared';
    } else if (fearLevel >= this.fearThresholds.nervous) {
      this.currentFearState = 'nervous';
    } else {
      this.currentFearState = 'calm';
    }

    // Notify if state changed
    if (previousState !== this.currentFearState) {
      console.log(`Fear state changed: ${previousState} -> ${this.currentFearState}`);
      this.notifyFearChange('state', { 
        previous: previousState, 
        current: this.currentFearState,
        fearLevel: fearLevel
      });
    }
  }

  /**
   * Apply fear-based modifiers to game state
   */
  applyFearModifiers() {
    // This method can be extended to apply various fear-based effects
    // For now, it ensures the action success rate is updated
    const successRate = this.getActionSuccessRate();
    
    // Store the success rate for other systems to use
    this.gameState.currentActionSuccessRate = successRate;
  }

  /**
   * Get action success rate based on current fear level
   * @returns {number} - Success rate percentage (0-100)
   */
  getActionSuccessRate() {
    const fearLevel = this.gameState.fearLevel;
    
    // Base success rate starts at 95%
    let successRate = 95;
    
    // Apply fear penalty
    const fearPenalty = fearLevel * 0.7; // Up to 70% penalty at max fear
    successRate -= fearPenalty;
    
    // Apply fear state specific modifiers
    switch (this.currentFearState) {
      case 'overwhelmed':
        successRate *= 0.3; // Severe penalty
        break;
      case 'panicked':
        successRate *= 0.5;
        break;
      case 'terrified':
        successRate *= 0.7;
        break;
      case 'scared':
        successRate *= 0.85;
        break;
      case 'nervous':
        successRate *= 0.95;
        break;
      default:
        // No additional penalty for calm state
        break;
    }
    
    // Ensure minimum success rate
    return Math.max(5, Math.min(95, successRate));
  }

  /**
   * Register a callback for fear changes
   * @param {Function} callback - Function to call when fear changes
   */
  onFearChange(callback) {
    this.fearChangeCallbacks.add(callback);
    
    return () => {
      this.fearChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks of fear changes
   * @param {string} changeType - Type of change ('event', 'state', 'decay')
   * @param {Object} data - Additional data about the change
   */
  notifyFearChange(changeType, data) {
    this.fearChangeCallbacks.forEach(callback => {
      try {
        callback(changeType, data, this.gameState.fearLevel, this.currentFearState);
      } catch (error) {
        console.error('Error in fear change callback:', error);
      }
    });
  }

  /**
   * Get current fear state information
   * @returns {Object} - Fear state data
   */
  getFearState() {
    return {
      level: this.gameState.fearLevel,
      state: this.currentFearState,
      actionSuccessRate: this.getActionSuccessRate(),
      activeFearEvents: this.fearEvents.size,
      canAct: this.gameState.canPerformActions()
    };
  }

  /**
   * Add a temporary fear modifier
   * @param {string} id - Unique identifier for the modifier
   * @param {number} multiplier - Fear multiplier
   * @param {number} duration - Duration in milliseconds
   */
  addFearModifier(id, multiplier, duration) {
    const modifier = {
      id: id,
      multiplier: multiplier,
      startTime: Date.now(),
      duration: duration
    };

    this.fearModifiers.set(id, modifier);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.fearModifiers.delete(id);
      }, duration);
    }
  }

  /**
   * Remove a fear modifier
   * @param {string} id - Modifier ID to remove
   */
  removeFearModifier(id) {
    this.fearModifiers.delete(id);
  }

  /**
   * Set update frequency for performance optimization
   * @param {number} frequency - Update frequency multiplier (0.5 = half speed, 1.0 = normal)
   */
  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(0.1, Math.min(2.0, frequency));
    console.log(`FearSystem update frequency set to: ${this.updateFrequency}`);
  }

  /**
   * Check if fear system is active
   * @returns {boolean} True if system is active
   */
  isActive() {
    return this.gameState && this.gameState.isAlive;
  }

  /**
   * Get fear system statistics
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      currentFearLevel: this.gameState.fearLevel,
      currentFearState: this.currentFearState,
      activeFearEvents: this.fearEvents.size,
      activeFearModifiers: this.fearModifiers.size,
      updateFrequency: this.updateFrequency || 1.0
    };
  }

  /**
   * Reset fear system to initial state
   */
  reset() {
    this.fearEvents.clear();
    this.fearModifiers.clear();
    this.currentFearState = 'calm';
    this.lastFearLevel = 0;
    this.updateFrequency = 1.0;
    console.log('FearSystem reset');
  }
}