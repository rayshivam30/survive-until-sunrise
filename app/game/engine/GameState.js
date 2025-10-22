/**
 * GameState - Manages all game state including fear, health, inventory, and time tracking
 * Handles state mutations and provides read-only access to game data
 */

export class GameState {
  constructor() {
    // Time and progression
    this.currentTime = "23:00"; // 11:00 PM start time
    this.gameStartTime = null;
    this.realTimeElapsed = 0; // milliseconds
    this.gameStarted = false;
    
    // Player status
    this.fearLevel = 0; // 0-100
    this.health = 100; // 0-100
    this.isAlive = true;
    this.location = "starting_room";
    
    // Inventory and items
    this.inventory = [];
    
    // Game progression tracking
    this.eventsTriggered = []; // event IDs
    this.commandsIssued = []; // command history
    this.survivalScore = 0;
    
    // Audio state
    this.currentAmbient = null;
    this.audioVolume = {
      master: 1.0,
      ambient: 0.3,
      effects: 0.7,
      voice: 0.9
    };

    // Game constants
    this.GAME_DURATION_MINUTES = 7; // 7 real minutes = 7 game hours (11 PM to 6 AM)
    this.SUNRISE_TIME = "06:00";
    this.MAX_FEAR = 100;
    this.MAX_HEALTH = 100;
  }

  /**
   * Start the game - initialize timing and set game as started
   */
  startGame() {
    this.gameStartTime = Date.now();
    this.gameStarted = true;
    this.realTimeElapsed = 0;
    console.log('Game started at', this.currentTime);
  }

  /**
   * End the game
   */
  endGame() {
    this.gameStarted = false;
    console.log('Game ended');
  }

  /**
   * Update game state based on elapsed time
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    if (!this.gameStarted || !this.isAlive) return;

    // Note: Time updates are now handled by GameTimer
    // This method focuses on other state updates

    // Gradually reduce fear over time if no events
    if (this.fearLevel > 0) {
      this.updateFear(-0.1 * (deltaTime / 1000)); // Reduce fear slowly
    }

    // Regenerate health slowly over time (very slow)
    if (this.health < this.MAX_HEALTH && this.health > 0) {
      this.updateHealth(0.05 * (deltaTime / 1000)); // Very slow health regen
    }
  }

  /**
   * Update fear level with bounds checking
   * @param {number} delta - Amount to change fear level
   */
  updateFear(delta) {
    const oldFear = this.fearLevel;
    this.fearLevel = Math.max(0, Math.min(this.MAX_FEAR, this.fearLevel + delta));
    
    // Check for fear-induced death
    if (this.fearLevel >= this.MAX_FEAR && oldFear < this.MAX_FEAR) {
      this.triggerDeath('fear');
    }

    console.log(`Fear level: ${this.fearLevel.toFixed(1)}`);
  }

  /**
   * Update health level with bounds checking
   * @param {number} delta - Amount to change health level
   */
  updateHealth(delta) {
    this.health = Math.max(0, Math.min(this.MAX_HEALTH, this.health + delta));
    
    // Check for death
    if (this.health <= 0) {
      this.triggerDeath('health');
    }

    console.log(`Health level: ${this.health.toFixed(1)}`);
  }

  /**
   * Add an item to inventory
   * @param {Object} item - Item to add {id, name, type, durability?, isActive?}
   */
  addToInventory(item) {
    // Check if item already exists
    const existingItem = this.inventory.find(i => i.id === item.id);
    if (existingItem) {
      console.log(`Item ${item.name} already in inventory`);
      return false;
    }

    const newItem = {
      id: item.id,
      name: item.name,
      type: item.type || 'misc',
      durability: item.durability || 100,
      isActive: item.isActive || false
    };

    this.inventory.push(newItem);
    console.log(`Added ${item.name} to inventory`);
    return true;
  }

  /**
   * Remove an item from inventory
   * @param {string} itemId - ID of item to remove
   */
  removeFromInventory(itemId) {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const removedItem = this.inventory.splice(index, 1)[0];
      console.log(`Removed ${removedItem.name} from inventory`);
      return removedItem;
    }
    return null;
  }

  /**
   * Get an item from inventory
   * @param {string} itemId - ID of item to get
   */
  getInventoryItem(itemId) {
    return this.inventory.find(item => item.id === itemId);
  }

  /**
   * Use an item from inventory
   * @param {string} itemId - ID of item to use
   */
  useItem(itemId) {
    const item = this.getInventoryItem(itemId);
    if (!item) {
      console.log(`Item ${itemId} not found in inventory`);
      return false;
    }

    // Reduce durability for tools
    if (item.type === 'tool' && item.durability > 0) {
      item.durability -= 10;
      if (item.durability <= 0) {
        console.log(`${item.name} has broken!`);
        this.removeFromInventory(itemId);
      }
    }

    console.log(`Used ${item.name}`);
    return true;
  }

  /**
   * Add a command to the command history
   * @param {string} command - Command that was issued
   */
  addCommand(command) {
    this.commandsIssued.push({
      command: command,
      timestamp: this.currentTime,
      realTime: Date.now()
    });

    // Keep only last 50 commands to prevent memory issues
    if (this.commandsIssued.length > 50) {
      this.commandsIssued.shift();
    }
  }

  /**
   * Add an event to the triggered events history
   * @param {string} eventId - ID of the event that was triggered
   */
  addEvent(eventId) {
    this.eventsTriggered.push({
      eventId: eventId,
      timestamp: this.currentTime,
      realTime: Date.now()
    });
  }

  /**
   * Update the current location
   * @param {string} newLocation - New location identifier
   */
  setLocation(newLocation) {
    const oldLocation = this.location;
    this.location = newLocation;
    console.log(`Moved from ${oldLocation} to ${newLocation}`);
  }

  /**
   * Trigger player death
   * @param {string} cause - Cause of death ('fear', 'health', 'event')
   */
  triggerDeath(cause) {
    this.isAlive = false;
    this.gameStarted = false;
    console.log(`Player died from: ${cause}`);
  }

  /**
   * Trigger victory condition
   */
  triggerVictory() {
    this.gameStarted = false;
    this.survivalScore = this.calculateSurvivalScore();
    console.log(`Victory! Survived until sunrise. Score: ${this.survivalScore}`);
  }

  /**
   * Calculate survival score based on performance
   */
  calculateSurvivalScore() {
    let score = 1000; // Base survival score
    
    // Bonus for remaining health
    score += this.health * 2;
    
    // Penalty for high fear
    score -= this.fearLevel * 1.5;
    
    // Bonus for items collected
    score += this.inventory.length * 50;
    
    // Bonus for commands used (engagement)
    score += Math.min(this.commandsIssued.length * 10, 200);

    return Math.max(0, Math.floor(score));
  }

  /**
   * Get current game progress as percentage (0-100)
   */
  getGameProgress() {
    if (!this.gameStarted) return 0;
    
    const totalGameTime = this.GAME_DURATION_MINUTES * 60 * 1000; // in milliseconds
    return Math.min(100, (this.realTimeElapsed / totalGameTime) * 100);
  }

  /**
   * Check if player can perform actions (not too scared)
   */
  canPerformActions() {
    return this.isAlive && this.fearLevel < 90; // Can't act when extremely scared
  }

  /**
   * Get action success rate based on fear level
   */
  getActionSuccessRate() {
    if (!this.isAlive) return 0;
    
    // Higher fear = lower success rate
    const baseRate = 100;
    const fearPenalty = this.fearLevel * 0.5; // 50% penalty at max fear
    return Math.max(10, baseRate - fearPenalty); // Minimum 10% success rate
  }

  /**
   * Serialize game state for saving
   */
  serialize() {
    return {
      currentTime: this.currentTime,
      gameStartTime: this.gameStartTime,
      realTimeElapsed: this.realTimeElapsed,
      gameStarted: this.gameStarted,
      fearLevel: this.fearLevel,
      health: this.health,
      isAlive: this.isAlive,
      location: this.location,
      inventory: [...this.inventory],
      eventsTriggered: [...this.eventsTriggered],
      commandsIssued: [...this.commandsIssued],
      survivalScore: this.survivalScore,
      currentAmbient: this.currentAmbient,
      audioVolume: { ...this.audioVolume }
    };
  }

  /**
   * Deserialize game state from saved data
   * @param {Object} data - Serialized game state
   */
  deserialize(data) {
    Object.assign(this, data);
    console.log('Game state loaded from save data');
  }
}