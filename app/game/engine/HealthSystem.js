/**
 * HealthSystem - Manages health tracking, damage mechanics, and health-related effects
 * Handles health events, regeneration, and health-based game state modifications
 */

export class HealthSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.healthRegenRate = 0.05; // Health points per second when regenerating
    this.damageEvents = new Map(); // Track active damage over time effects
    this.healthModifiers = new Map(); // Temporary health modifiers
    this.lastHealthLevel = 100;
    this.healthChangeCallbacks = new Set();
    
    // Damage types and their characteristics
    this.damageTypes = {
      fear_induced: { base: 5, duration: 2000, canKill: false },
      physical: { base: 15, duration: 0, canKill: true },
      supernatural: { base: 20, duration: 3000, canKill: true },
      exhaustion: { base: 3, duration: 5000, canKill: false },
      panic_attack: { base: 10, duration: 4000, canKill: false },
      environmental: { base: 8, duration: 1000, canKill: true },
      psychological: { base: 7, duration: 6000, canKill: false }
    };

    // Health states and their effects
    this.healthStates = {
      excellent: { threshold: 90, regenMultiplier: 1.2, fearResistance: 1.1 },
      good: { threshold: 70, regenMultiplier: 1.0, fearResistance: 1.0 },
      injured: { threshold: 50, regenMultiplier: 0.8, fearResistance: 0.9 },
      wounded: { threshold: 25, regenMultiplier: 0.5, fearResistance: 0.7 },
      critical: { threshold: 5, regenMultiplier: 0.2, fearResistance: 0.5 },
      dying: { threshold: 0, regenMultiplier: 0.0, fearResistance: 0.3 }
    };

    this.currentHealthState = 'excellent';
    this.isRegenerating = false;
    this.lastDamageTime = 0;
    this.regenDelay = 10000; // 10 seconds before health starts regenerating
  }

  /**
   * Update health system - called each frame
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    
    // Process active damage over time effects
    this.processDamageEvents(deltaTime);
    
    // Handle health regeneration
    this.processHealthRegeneration(deltaSeconds);
    
    // Update health state
    this.updateHealthState();
    
    // Apply health-based modifiers
    this.applyHealthModifiers();
  }

  /**
   * Apply damage to the player
   * @param {string} damageType - Type of damage
   * @param {Object} options - Additional options {amount?, source?, duration?}
   */
  applyDamage(damageType, options = {}) {
    const damageConfig = this.damageTypes[damageType];
    if (!damageConfig) {
      console.warn(`Unknown damage type: ${damageType}`);
      return;
    }

    const amount = options.amount || damageConfig.base;
    const source = options.source || 'unknown';
    const duration = options.duration || damageConfig.duration;

    // Calculate actual damage based on current state
    const actualDamage = this.calculateDamageAmount(amount, damageType);

    if (duration > 0) {
      // Damage over time effect
      this.applyDamageOverTime(damageType, actualDamage, duration, source);
    } else {
      // Instant damage
      this.applyInstantDamage(actualDamage, damageType, source);
    }

    // Record damage time for regeneration delay
    this.lastDamageTime = Date.now();
    this.isRegenerating = false;

    console.log(`Applied ${actualDamage.toFixed(1)} ${damageType} damage from ${source}`);
  }

  /**
   * Apply instant damage
   * @param {number} amount - Damage amount
   * @param {string} type - Damage type
   * @param {string} source - Damage source
   */
  applyInstantDamage(amount, type, source) {
    const oldHealth = this.gameState.health;
    this.gameState.updateHealth(-amount);

    // Notify callbacks
    this.notifyHealthChange('damage', {
      type: type,
      amount: amount,
      source: source,
      instant: true,
      oldHealth: oldHealth,
      newHealth: this.gameState.health
    });
  }

  /**
   * Apply damage over time effect
   * @param {string} damageType - Type of damage
   * @param {number} totalDamage - Total damage to apply over duration
   * @param {number} duration - Duration in milliseconds
   * @param {string} source - Damage source
   */
  applyDamageOverTime(damageType, totalDamage, duration, source) {
    // Apply some immediate damage (25% of total)
    const immediateDamage = totalDamage * 0.25;
    this.applyInstantDamage(immediateDamage, damageType, source);

    const damageEvent = {
      id: `${damageType}_${Date.now()}`,
      type: damageType,
      totalDamage: totalDamage - immediateDamage, // Remaining damage over time
      remainingDamage: totalDamage - immediateDamage,
      duration: duration,
      startTime: Date.now(),
      source: source,
      tickInterval: 500, // Apply damage every 500ms
      lastTick: Date.now()
    };

    this.damageEvents.set(damageEvent.id, damageEvent);

    console.log(`Started damage over time: ${damageType} (${totalDamage} over ${duration}ms)`);
  }

  /**
   * Process all active damage over time effects
   * @param {number} deltaTime - Time elapsed in milliseconds
   */
  processDamageEvents(deltaTime) {
    const currentTime = Date.now();
    const eventsToRemove = [];

    for (const [eventId, damageEvent] of this.damageEvents) {
      const elapsed = currentTime - damageEvent.startTime;
      
      if (elapsed >= damageEvent.duration || damageEvent.remainingDamage <= 0) {
        // Event has expired or damage depleted
        eventsToRemove.push(eventId);
        continue;
      }

      // Check if it's time for next damage tick
      if (currentTime - damageEvent.lastTick >= damageEvent.tickInterval) {
        const tickDamage = (damageEvent.totalDamage / damageEvent.duration) * damageEvent.tickInterval;
        const actualTickDamage = Math.min(tickDamage, damageEvent.remainingDamage);
        
        this.applyInstantDamage(actualTickDamage, damageEvent.type, damageEvent.source);
        
        damageEvent.remainingDamage -= actualTickDamage;
        damageEvent.lastTick = currentTime;
      }
    }

    // Remove expired events
    eventsToRemove.forEach(eventId => {
      this.damageEvents.delete(eventId);
    });
  }

  /**
   * Process health regeneration
   * @param {number} deltaSeconds - Time elapsed in seconds
   */
  processHealthRegeneration(deltaSeconds) {
    const currentTime = Date.now();
    
    // Check if enough time has passed since last damage
    if (currentTime - this.lastDamageTime >= this.regenDelay) {
      this.isRegenerating = true;
    }

    // Apply regeneration if conditions are met
    if (this.isRegenerating && 
        this.gameState.health > 0 && 
        this.gameState.health < 100 && 
        this.damageEvents.size === 0) {
      
      const healthState = this.getCurrentHealthState();
      const regenAmount = this.healthRegenRate * healthState.regenMultiplier * deltaSeconds;
      
      // Apply fear-based regeneration penalty
      const fearPenalty = this.getFearRegenPenalty();
      const adjustedRegen = regenAmount * fearPenalty;
      
      const oldHealth = this.gameState.health;
      this.gameState.updateHealth(adjustedRegen);

      // Notify callbacks if significant regeneration occurred
      if (this.gameState.health - oldHealth >= 0.1) {
        this.notifyHealthChange('regeneration', {
          amount: this.gameState.health - oldHealth,
          rate: adjustedRegen,
          oldHealth: oldHealth,
          newHealth: this.gameState.health
        });
      }
    }
  }

  /**
   * Calculate actual damage amount based on resistances and modifiers
   * @param {number} baseDamage - Base damage amount
   * @param {string} damageType - Type of damage
   * @returns {number} - Actual damage to apply
   */
  calculateDamageAmount(baseDamage, damageType) {
    let actualDamage = baseDamage;

    // Apply health state resistance
    const healthState = this.getCurrentHealthState();
    if (damageType === 'fear_induced' || damageType === 'psychological') {
      actualDamage *= (2.0 - healthState.fearResistance); // Lower resistance = more damage
    }

    // Apply temporary modifiers
    for (const modifier of this.healthModifiers.values()) {
      if (modifier.type === 'damage_resistance') {
        actualDamage *= modifier.multiplier;
      }
    }

    // Apply location-based modifiers
    const locationModifier = this.getLocationDamageModifier();
    actualDamage *= locationModifier;

    // Ensure minimum damage for certain types
    if (damageType === 'physical' || damageType === 'supernatural') {
      actualDamage = Math.max(1, actualDamage);
    }

    return actualDamage;
  }

  /**
   * Get location-based damage modifier
   * @returns {number} - Damage multiplier
   */
  getLocationDamageModifier() {
    const locationModifiers = {
      'safe_room': 0.5, // Reduced damage in safe room
      'basement': 1.3, // Increased damage in dangerous areas
      'attic': 1.2,
      'dark_hallway': 1.1,
      'outside': 1.4,
      'starting_room': 1.0
    };

    return locationModifiers[this.gameState.location] || 1.0;
  }

  /**
   * Get fear-based regeneration penalty
   * @returns {number} - Regeneration multiplier (0-1)
   */
  getFearRegenPenalty() {
    const fearLevel = this.gameState.fearLevel;
    
    // High fear reduces regeneration
    if (fearLevel >= 80) {
      return 0.1; // Severe penalty
    } else if (fearLevel >= 60) {
      return 0.3;
    } else if (fearLevel >= 40) {
      return 0.6;
    } else if (fearLevel >= 20) {
      return 0.8;
    }
    
    return 1.0; // No penalty when calm
  }

  /**
   * Update current health state based on health level
   */
  updateHealthState() {
    const previousState = this.currentHealthState;
    const healthLevel = this.gameState.health;

    // Special case for dying state
    if (healthLevel <= 0) {
      this.currentHealthState = 'dying';
    } else {
      // Determine current health state by checking thresholds in descending order
      const stateEntries = Object.entries(this.healthStates).sort((a, b) => b[1].threshold - a[1].threshold);
      
      for (const [stateName, stateData] of stateEntries) {
        if (healthLevel >= stateData.threshold) {
          this.currentHealthState = stateName;
          break;
        }
      }
    }

    // Notify if state changed
    if (previousState !== this.currentHealthState) {
      console.log(`Health state changed: ${previousState} -> ${this.currentHealthState}`);
      this.notifyHealthChange('state', {
        previous: previousState,
        current: this.currentHealthState,
        healthLevel: healthLevel
      });
    }
  }

  /**
   * Apply health-based modifiers to game state
   */
  applyHealthModifiers() {
    const healthState = this.getCurrentHealthState();
    
    // Apply fear resistance based on health state
    this.gameState.currentFearResistance = healthState.fearResistance;
    
    // Apply movement penalties for low health
    if (this.gameState.health < 30) {
      this.gameState.movementPenalty = 0.5; // 50% movement penalty
    } else if (this.gameState.health < 50) {
      this.gameState.movementPenalty = 0.8; // 20% movement penalty
    } else {
      this.gameState.movementPenalty = 1.0; // No penalty
    }
  }

  /**
   * Get current health state data
   * @returns {Object} - Health state configuration
   */
  getCurrentHealthState() {
    return this.healthStates[this.currentHealthState];
  }

  /**
   * Heal the player
   * @param {number} amount - Amount to heal
   * @param {string} source - Source of healing
   */
  heal(amount, source = 'unknown') {
    const oldHealth = this.gameState.health;
    this.gameState.updateHealth(amount);

    console.log(`Healed ${amount} health from ${source}`);

    // Notify callbacks
    this.notifyHealthChange('heal', {
      amount: amount,
      source: source,
      oldHealth: oldHealth,
      newHealth: this.gameState.health
    });
  }

  /**
   * Add a temporary health modifier
   * @param {string} id - Unique identifier for the modifier
   * @param {string} type - Type of modifier ('damage_resistance', 'regen_boost', etc.)
   * @param {number} multiplier - Effect multiplier
   * @param {number} duration - Duration in milliseconds
   */
  addHealthModifier(id, type, multiplier, duration) {
    const modifier = {
      id: id,
      type: type,
      multiplier: multiplier,
      startTime: Date.now(),
      duration: duration
    };

    this.healthModifiers.set(id, modifier);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.healthModifiers.delete(id);
      }, duration);
    }

    console.log(`Added health modifier: ${id} (${type}, ${multiplier}x for ${duration}ms)`);
  }

  /**
   * Remove a health modifier
   * @param {string} id - Modifier ID to remove
   */
  removeHealthModifier(id) {
    this.healthModifiers.delete(id);
  }

  /**
   * Register a callback for health changes
   * @param {Function} callback - Function to call when health changes
   */
  onHealthChange(callback) {
    this.healthChangeCallbacks.add(callback);
    
    return () => {
      this.healthChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks of health changes
   * @param {string} changeType - Type of change ('damage', 'heal', 'regeneration', 'state')
   * @param {Object} data - Additional data about the change
   */
  notifyHealthChange(changeType, data) {
    this.healthChangeCallbacks.forEach(callback => {
      try {
        callback(changeType, data, this.gameState.health, this.currentHealthState);
      } catch (error) {
        console.error('Error in health change callback:', error);
      }
    });
  }

  /**
   * Get current health state information
   * @returns {Object} - Health state data
   */
  getHealthState() {
    return {
      level: this.gameState.health,
      state: this.currentHealthState,
      isRegenerating: this.isRegenerating,
      activeDamageEvents: this.damageEvents.size,
      regenRate: this.getCurrentHealthState().regenMultiplier,
      fearResistance: this.getCurrentHealthState().fearResistance
    };
  }

  /**
   * Check if player can survive a specific damage amount
   * @param {number} damageAmount - Potential damage amount
   * @returns {boolean} - Whether player would survive
   */
  canSurviveDamage(damageAmount) {
    return this.gameState.health > damageAmount;
  }

  /**
   * Get time until next regeneration tick
   * @returns {number} - Milliseconds until regeneration starts/continues
   */
  getTimeUntilRegen() {
    if (this.isRegenerating) {
      return 0;
    }
    
    const timeSinceLastDamage = Date.now() - this.lastDamageTime;
    return Math.max(0, this.regenDelay - timeSinceLastDamage);
  }

  /**
   * Reset health system to initial state
   */
  reset() {
    this.damageEvents.clear();
    this.healthModifiers.clear();
    this.currentHealthState = 'excellent';
    this.isRegenerating = false;
    this.lastDamageTime = 0;
    console.log('HealthSystem reset');
  }
}