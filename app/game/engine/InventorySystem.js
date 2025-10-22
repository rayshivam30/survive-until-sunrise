/**
 * InventorySystem - Comprehensive inventory and item management system
 * Handles item storage, usage, durability tracking, and voice command integration
 */

export class InventorySystem {
  constructor(gameState, audioManager, voiceNarrator) {
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.voiceNarrator = voiceNarrator;
    
    // Item definitions with properties and behaviors
    this.itemDefinitions = new Map([
      ['flashlight', {
        id: 'flashlight',
        name: 'Flashlight',
        type: 'tool',
        icon: '🔦',
        maxDurability: 100,
        usageRate: 15, // Durability lost per use
        description: 'A battery-powered flashlight that illuminates dark areas',
        voiceCommands: ['flashlight', 'light', 'torch', 'turn on light', 'use flashlight', 'shine light'],
        usageSound: 'flashlight_click',
        activeSound: 'flashlight_hum',
        canBeActive: true,
        effects: {
          fearReduction: 10,
          visionBonus: true
        }
      }],
      ['key_basement', {
        id: 'key_basement',
        name: 'Basement Key',
        type: 'key',
        icon: '🗝️',
        maxDurability: 100,
        usageRate: 0, // Keys don't degrade
        description: 'An old brass key that opens the basement door',
        voiceCommands: ['key', 'basement key', 'use key', 'unlock'],
        usageSound: 'key_turn',
        canBeActive: false,
        effects: {
          unlocks: ['basement_door']
        }
      }],
      ['matches', {
        id: 'matches',
        name: 'Matches',
        type: 'consumable',
        icon: '🔥',
        maxDurability: 100,
        usageRate: 20, // Each use consumes 20% (5 uses total)
        description: 'A box of matches for lighting candles or fires',
        voiceCommands: ['matches', 'light match', 'use matches', 'strike match'],
        usageSound: 'match_strike',
        canBeActive: false,
        quantity: 5,
        effects: {
          fearReduction: 5,
          lightSource: true,
          duration: 30000 // 30 seconds
        }
      }],
      ['phone', {
        id: 'phone',
        name: 'Cell Phone',
        type: 'tool',
        icon: '📱',
        maxDurability: 100,
        usageRate: 10, // Battery drains with use
        description: 'Your cell phone with a dim screen light',
        voiceCommands: ['phone', 'cell phone', 'use phone', 'call', 'light from phone'],
        usageSound: 'phone_beep',
        canBeActive: true,
        effects: {
          fearReduction: 3,
          visionBonus: true,
          communication: true
        }
      }],
      ['knife', {
        id: 'knife',
        name: 'Kitchen Knife',
        type: 'weapon',
        icon: '🔪',
        maxDurability: 100,
        usageRate: 5, // Minimal degradation
        description: 'A sharp kitchen knife that provides some protection',
        voiceCommands: ['knife', 'weapon', 'use knife', 'defend'],
        usageSound: 'knife_draw',
        canBeActive: true,
        effects: {
          fearReduction: 15,
          defenseBonus: 20,
          attackPower: 25
        }
      }],
      ['candle', {
        id: 'candle',
        name: 'Candle',
        type: 'consumable',
        icon: '🕯️',
        maxDurability: 100,
        usageRate: 2, // Burns slowly over time
        description: 'A wax candle that provides steady light',
        voiceCommands: ['candle', 'light candle', 'use candle'],
        usageSound: 'candle_light',
        activeSound: 'candle_flicker',
        canBeActive: true,
        effects: {
          fearReduction: 8,
          visionBonus: true,
          ambientLight: true,
          duration: 300000 // 5 minutes
        }
      }],
      ['bandage', {
        id: 'bandage',
        name: 'First Aid Kit',
        type: 'consumable',
        icon: '🩹',
        maxDurability: 100,
        usageRate: 50, // Single use item
        description: 'Medical supplies for treating injuries',
        voiceCommands: ['bandage', 'first aid', 'heal', 'use bandage', 'medical kit'],
        usageSound: 'bandage_apply',
        canBeActive: false,
        effects: {
          healthRestore: 30,
          fearReduction: 5
        }
      }],
      ['diary', {
        id: 'diary',
        name: 'Old Diary',
        type: 'document',
        icon: '📔',
        maxDurability: 100,
        usageRate: 0, // Documents don't degrade
        description: 'A mysterious diary with cryptic entries',
        voiceCommands: ['diary', 'book', 'read diary', 'examine diary'],
        usageSound: 'page_turn',
        canBeActive: false,
        effects: {
          storyReveal: true,
          fearIncrease: 5, // Knowledge can be frightening
          clueProvided: true
        }
      }]
    ]);

    // Active items tracking
    this.activeItems = new Set();
    
    // Item usage cooldowns
    this.usageCooldowns = new Map();
    
    // Discovery events for items
    this.discoveryEvents = new Map([
      ['flashlight', {
        locations: ['starting_room', 'kitchen'],
        probability: 0.8,
        narration: "You found a flashlight! It might help you see in the dark.",
        sound: 'item_pickup'
      }],
      ['key_basement', {
        locations: ['kitchen', 'living_room'],
        probability: 0.6,
        narration: "You discovered an old brass key. It looks like it might open something important.",
        sound: 'key_pickup'
      }],
      ['matches', {
        locations: ['kitchen', 'dining_room'],
        probability: 0.7,
        narration: "You found a box of matches. They could provide light in an emergency.",
        sound: 'item_pickup'
      }],
      ['phone', {
        locations: ['starting_room'],
        probability: 1.0, // Always start with phone
        narration: "You have your cell phone. The battery is low, but it still works.",
        sound: null // No sound for starting item
      }],
      ['knife', {
        locations: ['kitchen'],
        probability: 0.5,
        narration: "You grabbed a kitchen knife. It's not much, but it makes you feel safer.",
        sound: 'knife_pickup'
      }],
      ['candle', {
        locations: ['dining_room', 'bedroom'],
        probability: 0.6,
        narration: "You found a candle. If you have matches, you could light it for steady illumination.",
        sound: 'item_pickup'
      }],
      ['bandage', {
        locations: ['bathroom', 'bedroom'],
        probability: 0.4,
        narration: "You discovered a first aid kit. It could help if you get injured.",
        sound: 'item_pickup'
      }],
      ['diary', {
        locations: ['bedroom', 'study'],
        probability: 0.3,
        narration: "You found an old diary. The entries look disturbing, but they might contain important information.",
        sound: 'book_pickup'
      }]
    ]);

    // Item combination recipes
    this.combinations = new Map([
      ['candle+matches', {
        result: 'lit_candle',
        consumes: ['matches'],
        transforms: ['candle'],
        narration: "You lit the candle with a match. The warm light pushes back the darkness."
      }]
    ]);

    console.log('InventorySystem initialized');
  }

  /**
   * Add an item to the inventory with full item data
   * @param {string} itemId - ID of the item to add
   * @param {Object} overrides - Property overrides for the item
   * @returns {boolean} Success status
   */
  addItem(itemId, overrides = {}) {
    const itemDef = this.itemDefinitions.get(itemId);
    if (!itemDef) {
      console.error(`Unknown item: ${itemId}`);
      return false;
    }

    // Create item instance with full properties
    const item = {
      id: itemDef.id,
      name: itemDef.name,
      type: itemDef.type,
      icon: itemDef.icon,
      description: itemDef.description,
      durability: itemDef.maxDurability,
      maxDurability: itemDef.maxDurability,
      usageRate: itemDef.usageRate,
      isActive: false,
      quantity: itemDef.quantity || 1,
      voiceCommands: [...itemDef.voiceCommands],
      effects: { ...itemDef.effects },
      canBeActive: itemDef.canBeActive,
      usageSound: itemDef.usageSound,
      activeSound: itemDef.activeSound,
      ...overrides
    };

    // Add to game state inventory
    const success = this.gameState.addToInventory(item);
    
    if (success) {
      console.log(`Added ${item.name} to inventory`);
      
      // Play pickup sound if specified
      const discoveryEvent = this.discoveryEvents.get(itemId);
      if (discoveryEvent && discoveryEvent.sound && this.audioManager) {
        try {
          this.audioManager.playEffect(discoveryEvent.sound);
        } catch (error) {
          console.warn('Audio error during item pickup:', error);
        }
      }
      
      // Provide voice narration
      if (discoveryEvent && discoveryEvent.narration && this.voiceNarrator) {
        try {
          this.voiceNarrator.speak(discoveryEvent.narration);
        } catch (error) {
          console.warn('Voice narration error during item pickup:', error);
        }
      }
    }

    return success;
  }

  /**
   * Use an item from inventory with full effect processing
   * @param {string} itemId - ID of the item to use
   * @param {Object} context - Usage context (location, situation, etc.)
   * @returns {Object} Usage result with effects and feedback
   */
  useItem(itemId, context = {}) {
    const item = this.gameState.getInventoryItem(itemId);
    if (!item) {
      return {
        success: false,
        message: `You don't have a ${itemId}`,
        narration: `You don't have a ${itemId} in your inventory.`
      };
    }

    // Check usage cooldown
    const cooldownKey = `${itemId}_${Date.now()}`;
    if (this.usageCooldowns.has(itemId)) {
      const cooldownEnd = this.usageCooldowns.get(itemId);
      if (Date.now() < cooldownEnd) {
        return {
          success: false,
          message: `${item.name} is on cooldown`,
          narration: `You need to wait before using the ${item.name} again.`
        };
      }
    }

    // Check if item is broken
    if (item.durability <= 0) {
      return {
        success: false,
        message: `${item.name} is broken`,
        narration: `The ${item.name} is broken and can't be used.`
      };
    }

    // Process item usage
    const result = this.processItemUsage(item, context);
    
    // Apply durability loss
    if (item.usageRate > 0) {
      item.durability = Math.max(0, item.durability - item.usageRate);
      
      // Remove item if completely used up
      if (item.durability <= 0) {
        if (item.type === 'consumable') {
          this.gameState.removeFromInventory(itemId);
          result.consumed = true;
          result.narration += ` The ${item.name} is now used up.`;
        } else {
          result.narration += ` The ${item.name} is now broken.`;
        }
      }
    }

    // Handle active/inactive toggle for tools
    if (item.canBeActive && item.durability > 0) {
      this.toggleItemActive(itemId);
    }

    // Play usage sound
    if (item.usageSound && this.audioManager) {
      try {
        this.audioManager.playEffect(item.usageSound);
      } catch (error) {
        console.warn('Audio error during item usage:', error);
      }
    }

    // Set cooldown if applicable
    if (item.type === 'consumable' || item.type === 'weapon') {
      this.usageCooldowns.set(itemId, Date.now() + 3000); // 3 second cooldown
    }

    // Provide voice feedback
    if (result.narration && this.voiceNarrator) {
      try {
        this.voiceNarrator.speak(result.narration);
      } catch (error) {
        console.warn('Voice narration error during item usage:', error);
      }
    }

    console.log(`Used ${item.name}:`, result);
    return result;
  }

  /**
   * Process the actual effects of using an item
   * @param {Object} item - Item being used
   * @param {Object} context - Usage context
   * @returns {Object} Usage result with effects
   */
  processItemUsage(item, context) {
    const result = {
      success: true,
      message: `Used ${item.name}`,
      narration: `You used the ${item.name}.`,
      effects: []
    };

    // Process each effect
    for (const [effectType, effectValue] of Object.entries(item.effects || {})) {
      switch (effectType) {
        case 'fearReduction':
          this.gameState.updateFear(-effectValue);
          result.effects.push({ type: 'fear', value: -effectValue });
          result.narration = `Using the ${item.name} makes you feel a bit braver.`;
          break;

        case 'fearIncrease':
          this.gameState.updateFear(effectValue);
          result.effects.push({ type: 'fear', value: effectValue });
          result.narration = `The ${item.name} reveals something unsettling.`;
          break;

        case 'healthRestore':
          this.gameState.updateHealth(effectValue);
          result.effects.push({ type: 'health', value: effectValue });
          result.narration = `The ${item.name} helps heal your wounds.`;
          break;

        case 'visionBonus':
          result.effects.push({ type: 'vision', value: true });
          if (item.isActive) {
            result.narration = `The ${item.name} illuminates the area around you.`;
          }
          break;

        case 'defenseBonus':
          result.effects.push({ type: 'defense', value: effectValue });
          result.narration = `You feel more protected with the ${item.name} in hand.`;
          break;

        case 'storyReveal':
          result.effects.push({ type: 'story', value: true });
          result.narration = `The ${item.name} reveals important information about this place.`;
          break;

        case 'unlocks':
          result.effects.push({ type: 'unlock', value: effectValue });
          result.narration = `The ${item.name} might unlock something important.`;
          break;
      }
    }

    return result;
  }

  /**
   * Toggle an item's active state
   * @param {string} itemId - ID of the item to toggle
   * @returns {boolean} New active state
   */
  toggleItemActive(itemId) {
    const item = this.gameState.getInventoryItem(itemId);
    if (!item || !item.canBeActive) {
      return false;
    }

    // Deactivate other items of the same type if necessary
    if (!item.isActive && (item.type === 'tool' || item.type === 'weapon')) {
      this.deactivateItemsByType(item.type);
    }

    item.isActive = !item.isActive;

    if (item.isActive) {
      this.activeItems.add(itemId);
      
      // Start active sound loop if applicable
      if (item.activeSound && this.audioManager) {
        try {
          this.audioManager.playAmbient(item.activeSound, { loop: true, volume: 0.3 });
        } catch (error) {
          console.warn('Audio error during item activation:', error);
        }
      }
      
      console.log(`Activated ${item.name}`);
    } else {
      this.activeItems.delete(itemId);
      
      // Stop active sound
      if (item.activeSound && this.audioManager) {
        try {
          this.audioManager.stopAmbient(item.activeSound);
        } catch (error) {
          console.warn('Audio error during item deactivation:', error);
        }
      }
      
      console.log(`Deactivated ${item.name}`);
    }

    return item.isActive;
  }

  /**
   * Deactivate all items of a specific type
   * @param {string} itemType - Type of items to deactivate
   */
  deactivateItemsByType(itemType) {
    const inventory = this.gameState.inventory || [];
    
    inventory.forEach(item => {
      if (item.type === itemType && item.isActive) {
        item.isActive = false;
        this.activeItems.delete(item.id);
        
        if (item.activeSound && this.audioManager) {
          try {
            this.audioManager.stopAmbient(item.activeSound);
          } catch (error) {
            console.warn('Audio error during item deactivation:', error);
          }
        }
      }
    });
  }

  /**
   * Process voice command for item usage
   * @param {string} command - Voice command text
   * @param {Object} context - Current game context
   * @returns {Object} Command processing result
   */
  processVoiceCommand(command, context = {}) {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Check for combination commands FIRST (before individual item commands)
    if (normalizedCommand.includes('combine') || 
        (normalizedCommand.includes('use') && normalizedCommand.includes('with')) ||
        (normalizedCommand.includes('light') && normalizedCommand.includes('with'))) {
      return this.processCombinationCommand(normalizedCommand, context);
    }

    // Check for item discovery commands
    if (normalizedCommand.includes('search') || normalizedCommand.includes('look for')) {
      return this.processDiscoveryCommand(context);
    }
    
    // Find matching item by voice commands
    const inventory = this.gameState.inventory || [];
    
    for (const item of inventory) {
      if (item.voiceCommands) {
        for (const voiceCommand of item.voiceCommands) {
          if (normalizedCommand.includes(voiceCommand.toLowerCase())) {
            // Check contextual usage validation
            const validation = this.validateItemUsage(item, context);
            if (!validation.valid) {
              return {
                success: false,
                message: validation.reason,
                narration: validation.narration
              };
            }

            // Use the item
            return this.useItem(item.id, context);
          }
        }
      }
    }

    return {
      success: false,
      message: 'No matching item command found',
      narration: "I don't understand what item you want to use."
    };
  }

  /**
   * Validate if an item can be used in the current context
   * @param {Object} item - Item to validate
   * @param {Object} context - Current context
   * @returns {Object} Validation result
   */
  validateItemUsage(item, context) {
    // Check if item is broken
    if (item.durability <= 0) {
      return {
        valid: false,
        reason: `${item.name} is broken`,
        narration: `The ${item.name} is broken and can't be used.`
      };
    }

    // Check fear level for certain items
    if (context.fearLevel >= 90 && item.type === 'weapon') {
      return {
        valid: false,
        reason: 'Too scared to use weapon',
        narration: "You're too terrified to use any weapons effectively."
      };
    }

    // Check location-specific requirements
    if (item.id === 'key_basement' && context.location !== 'basement_door') {
      return {
        valid: false,
        reason: 'No door to unlock here',
        narration: "There's nothing here that the key can unlock."
      };
    }

    // Check if matches are needed for candle
    if (item.id === 'candle' && !item.isActive) {
      const hasMatches = this.gameState.inventory.some(i => i.id === 'matches' && i.durability > 0);
      if (!hasMatches) {
        return {
          valid: false,
          reason: 'Need matches to light candle',
          narration: "You need matches to light the candle."
        };
      }
    }

    return { valid: true };
  }

  /**
   * Process item discovery based on current location
   * @param {Object} context - Current game context
   * @returns {Object} Discovery result
   */
  processDiscoveryCommand(context) {
    const currentLocation = context.location || this.gameState.location;
    const discoveredItems = [];

    // Check each item's discovery conditions
    for (const [itemId, discoveryEvent] of this.discoveryEvents) {
      if (discoveryEvent.locations.includes(currentLocation)) {
        // Check if item is already in inventory
        const hasItem = this.gameState.inventory.some(item => item.id === itemId);
        if (!hasItem && Math.random() < discoveryEvent.probability) {
          this.addItem(itemId);
          discoveredItems.push(itemId);
        }
      }
    }

    if (discoveredItems.length > 0) {
      return {
        success: true,
        message: `Found ${discoveredItems.length} item(s)`,
        narration: "You searched the area and found something useful!",
        itemsFound: discoveredItems
      };
    } else {
      return {
        success: false,
        message: 'Nothing found',
        narration: "You searched carefully but didn't find anything useful."
      };
    }
  }

  /**
   * Process item combination commands
   * @param {string} command - Combination command
   * @param {Object} context - Current context
   * @returns {Object} Combination result
   */
  processCombinationCommand(command, context) {
    // Simple combination logic for candle + matches
    const hasCandle = this.gameState.inventory.some(item => item.id === 'candle' && !item.isActive);
    const hasMatches = this.gameState.inventory.some(item => item.id === 'matches' && item.durability > 0);

    if (hasCandle && hasMatches && (command.includes('candle') || command.includes('light'))) {
      // Use a match to light the candle
      const matchResult = this.useItem('matches', context);
      if (matchResult.success) {
        const candleResult = this.useItem('candle', context);
        return {
          success: true,
          message: 'Lit candle with matches',
          narration: "You struck a match and lit the candle. The warm light pushes back the darkness.",
          effects: [...(matchResult.effects || []), ...(candleResult.effects || [])]
        };
      }
    }

    return {
      success: false,
      message: 'Cannot combine those items',
      narration: "You can't combine those items in any useful way."
    };
  }

  /**
   * Update active items (called from game loop)
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    const inventory = this.gameState.inventory || [];
    
    // Update active items
    for (const item of inventory) {
      if (item.isActive && item.effects && item.effects.duration) {
        // Handle timed effects (like burning candles)
        if (item.type === 'consumable') {
          item.durability = Math.max(0, item.durability - (item.usageRate * deltaTime / 1000));
          
          if (item.durability <= 0) {
            item.isActive = false;
            this.activeItems.delete(item.id);
            
            if (item.activeSound && this.audioManager) {
              try {
                this.audioManager.stopAmbient(item.activeSound);
              } catch (error) {
                console.warn('Audio error during item burnout:', error);
              }
            }
            
            if (this.voiceNarrator) {
              try {
                this.voiceNarrator.speak(`The ${item.name} has burned out.`);
              } catch (error) {
                console.warn('Voice narration error during item burnout:', error);
              }
            }
          }
        }
      }
    }

    // Clean up expired cooldowns
    const now = Date.now();
    for (const [itemId, cooldownEnd] of this.usageCooldowns) {
      if (now >= cooldownEnd) {
        this.usageCooldowns.delete(itemId);
      }
    }
  }

  /**
   * Get all available item voice commands for the current inventory
   * @returns {Array} Array of voice command strings
   */
  getAvailableItemCommands() {
    const inventory = this.gameState.inventory || [];
    const commands = [];

    for (const item of inventory) {
      if (item.voiceCommands && item.durability > 0) {
        commands.push(...item.voiceCommands);
      }
    }

    // Add general inventory commands
    commands.push('search', 'look for items', 'examine inventory', 'what do I have');

    return commands;
  }

  /**
   * Get inventory statistics for debugging
   * @returns {Object} Inventory statistics
   */
  getInventoryStats() {
    const inventory = this.gameState.inventory || [];
    
    return {
      totalItems: inventory.length,
      activeItems: this.activeItems.size,
      itemsByType: inventory.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {}),
      averageDurability: inventory.reduce((sum, item) => sum + (item.durability || 0), 0) / inventory.length || 0,
      usableCooldowns: this.usageCooldowns.size
    };
  }

  /**
   * Initialize starting inventory based on game settings
   */
  initializeStartingInventory() {
    // Always start with phone
    this.addItem('phone');
    
    // 50% chance to start with flashlight
    if (Math.random() < 0.5) {
      this.addItem('flashlight', { durability: 80 }); // Slightly used
    }

    console.log('Starting inventory initialized');
  }
}